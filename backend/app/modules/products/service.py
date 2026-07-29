import re
import asyncpg

from app.modules.products.repository import ProductsRepository
from app.modules.products.schemas import (
    ProductCreateRequest, ProductUpdateRequest, ProductFilterParams,
    VariantCreateRequest, VariantUpdateRequest, ProductImageRequest,
)
from app.core.exceptions import NotFoundException, ConflictException

MAX_IMAGES = 10


def _generate_slug(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug)
    return re.sub(r"-+", "-", slug).strip("-")


class ProductsService:

    def __init__(self, db: asyncpg.Connection):
        self.repo = ProductsRepository(db)

    # ── Product CRUD ──────────────────────────────────────

    async def list_products(self, params: ProductFilterParams) -> tuple[list[dict], int]:
        filters = params.model_dump()
        return await self.repo.list_products(filters)

    async def get_product(self, slug: str) -> dict:
        product = await self.repo.get_by_slug(slug)
        if not product:
            raise NotFoundException("Product")
        product["variants"] = await self.repo.get_variants(product["id"])
        product["images"] = await self.repo.get_images(product["id"])
        return product

    async def create_product(self, data: ProductCreateRequest) -> dict:
        slug = data.slug or _generate_slug(data.name)

        if await self.repo.slug_exists(slug):
            # Append a numeric suffix to make slug unique
            base_slug = slug
            suffix = 1
            while await self.repo.slug_exists(f"{base_slug}-{suffix}"):
                suffix += 1
            slug = f"{base_slug}-{suffix}"

        if data.sku and await self.repo.sku_exists(data.sku):
            raise ConflictException(f"SKU '{data.sku}' is already in use.")

        payload = data.model_dump()
        payload["slug"] = slug
        # Convert Decimal to float for asyncpg compatibility
        for key in ("price", "compare_at_price", "cost_per_item", "weight"):
            if payload.get(key) is not None:
                payload[key] = float(payload[key])

        product = await self.repo.create(payload)
        product["variants"] = []
        product["images"] = []
        return product

    async def update_product(self, product_id: int, data: ProductUpdateRequest) -> dict:
        existing = await self.repo.get_by_id(product_id)
        if not existing:
            raise NotFoundException("Product")

        fields = {k: v for k, v in data.model_dump().items() if v is not None}

        # Convert Decimal fields
        for key in ("price", "compare_at_price", "cost_per_item"):
            if key in fields:
                fields[key] = float(fields[key])

        updated = await self.repo.update(product_id, fields)
        if not updated:
            raise NotFoundException("Product")

        updated["variants"] = await self.repo.get_variants(product_id)
        updated["images"] = await self.repo.get_images(product_id)
        return updated

    async def delete_product(self, product_id: int) -> None:
        existing = await self.repo.get_by_id(product_id)
        if not existing:
            raise NotFoundException("Product")
        await self.repo.soft_delete(product_id)

    # ── Variants ──────────────────────────────────────────

    async def add_variant(self, product_id: int, data: VariantCreateRequest) -> dict:
        product = await self.repo.get_by_id(product_id)
        if not product:
            raise NotFoundException("Product")

        if await self.repo.variant_sku_exists(data.sku):
            raise ConflictException(f"Variant SKU '{data.sku}' already exists.")

        payload = data.model_dump()
        payload["price"] = float(payload["price"])
        if payload.get("compare_at_price"):
            payload["compare_at_price"] = float(payload["compare_at_price"])

        return await self.repo.create_variant(product_id, payload)

    async def update_variant(
        self, product_id: int, variant_id: int, data: VariantUpdateRequest
    ) -> dict:
        variant = await self.repo.get_variant_by_id(variant_id, product_id)
        if not variant:
            raise NotFoundException("Variant")

        fields = {k: v for k, v in data.model_dump().items() if v is not None}
        for key in ("price", "compare_at_price"):
            if key in fields:
                fields[key] = float(fields[key])

        updated = await self.repo.update_variant(variant_id, product_id, fields)
        if not updated:
            raise NotFoundException("Variant")
        return updated

    async def delete_variant(self, product_id: int, variant_id: int) -> None:
        variant = await self.repo.get_variant_by_id(variant_id, product_id)
        if not variant:
            raise NotFoundException("Variant")
        await self.repo.delete_variant(variant_id, product_id)

    # ── Images ────────────────────────────────────────────

    async def add_image(self, product_id: int, data: ProductImageRequest) -> dict:
        product = await self.repo.get_by_id(product_id)
        if not product:
            raise NotFoundException("Product")

        count = await self.repo.image_count(product_id)
        if count >= MAX_IMAGES:
            raise ConflictException(f"Maximum {MAX_IMAGES} images allowed per product.")

        if data.is_primary:
            await self.repo.unset_primary_image(product_id)

        # First image is always primary
        if count == 0:
            payload = data.model_dump()
            payload["is_primary"] = True
        else:
            payload = data.model_dump()

        return await self.repo.create_image(product_id, payload)

    async def delete_image(self, product_id: int, image_id: int) -> None:
        product = await self.repo.get_by_id(product_id)
        if not product:
            raise NotFoundException("Product")
        deleted = await self.repo.delete_image(image_id, product_id)
        if not deleted:
            raise NotFoundException("Image")