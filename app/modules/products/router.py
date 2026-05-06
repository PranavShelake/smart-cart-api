from fastapi import APIRouter, Depends, Query
from decimal import Decimal
import asyncpg

from app.modules.products.schemas import (
    ProductCreateRequest, ProductUpdateRequest,
    VariantCreateRequest, VariantUpdateRequest,
    ProductImageRequest, ProductFilterParams,
)
from app.modules.products.service import ProductsService
from app.core.dependencies import get_current_user, require_admin, require_seller, TokenData
from app.database import get_db
from app.utils.response import success_response
from app.config import settings

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("")
async def list_products(
    search: str | None = Query(None),
    category_id: int | None = Query(None),
    category_slug: str | None = Query(None),
    min_price: Decimal | None = Query(None),
    max_price: Decimal | None = Query(None),
    is_featured: bool | None = Query(None),
    in_stock: bool | None = Query(None),
    sort: str = Query("created_at_desc"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: asyncpg.Connection = Depends(get_db),
):
    """
    GET /api/v1/products?search=phone&category_id=1&min_price=500&sort=price_asc
    Public endpoint. Supports search, filter, sort, pagination.
    """
    params = ProductFilterParams(
        search=search, category_id=category_id, category_slug=category_slug,
        min_price=min_price, max_price=max_price, is_featured=is_featured,
        in_stock=in_stock, sort=sort, page=page, per_page=per_page,
    )
    service = ProductsService(db)
    products, total = await service.list_products(params)

    total_pages = (total + per_page - 1) // per_page

    return success_response(
        data=products,
        message="Products fetched.",
        meta={
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": total_pages,
        },
    )


@router.get("/{slug}")
async def get_product(slug: str, db: asyncpg.Connection = Depends(get_db)):
    """Public. Returns product detail with all variants and images."""
    service = ProductsService(db)
    product = await service.get_product(slug)
    return success_response(data=product, message="Product fetched.")


@router.post("", status_code=201)
async def create_product(
    data: ProductCreateRequest,
    db: asyncpg.Connection = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    service = ProductsService(db)
    product = await service.create_product(data)
    return success_response(data=product, message="Product created.", status_code=201)


@router.patch("/{product_id}")
async def update_product(
    product_id: int,
    data: ProductUpdateRequest,
    db: asyncpg.Connection = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    service = ProductsService(db)
    product = await service.update_product(product_id, data)
    return success_response(data=product, message="Product updated.")


@router.delete("/{product_id}")
async def delete_product(
    product_id: int,
    db: asyncpg.Connection = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    service = ProductsService(db)
    await service.delete_product(product_id)
    return success_response(message="Product deactivated.")


# ── Variant routes ─────────────────────────────────────────

@router.post("/{product_id}/variants", status_code=201)
async def add_variant(
    product_id: int,
    data: VariantCreateRequest,
    db: asyncpg.Connection = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    service = ProductsService(db)
    variant = await service.add_variant(product_id, data)
    return success_response(data=variant, message="Variant added.", status_code=201)


@router.patch("/{product_id}/variants/{variant_id}")
async def update_variant(
    product_id: int,
    variant_id: int,
    data: VariantUpdateRequest,
    db: asyncpg.Connection = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    service = ProductsService(db)
    variant = await service.update_variant(product_id, variant_id, data)
    return success_response(data=variant, message="Variant updated.")


@router.delete("/{product_id}/variants/{variant_id}")
async def delete_variant(
    product_id: int,
    variant_id: int,
    db: asyncpg.Connection = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    service = ProductsService(db)
    await service.delete_variant(product_id, variant_id)
    return success_response(message="Variant deleted.")


# ── Image routes ───────────────────────────────────────────

@router.post("/{product_id}/images", status_code=201)
async def add_image(
    product_id: int,
    data: ProductImageRequest,
    db: asyncpg.Connection = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    service = ProductsService(db)
    image = await service.add_image(product_id, data)
    return success_response(data=image, message="Image added.", status_code=201)


@router.delete("/{product_id}/images/{image_id}")
async def delete_image(
    product_id: int,
    image_id: int,
    db: asyncpg.Connection = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    service = ProductsService(db)
    await service.delete_image(product_id, image_id)
    return success_response(message="Image deleted.")