from pydantic import BaseModel, field_validator
from decimal import Decimal
import re


def _generate_slug(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug)
    return re.sub(r"-+", "-", slug).strip("-")


# ── Product Schemas ───────────────────────────────────────

class ProductCreateRequest(BaseModel):
    name: str
    slug: str | None = None
    category_id: int | None = None
    sku: str | None = None
    price: Decimal
    compare_at_price: Decimal | None = None
    cost_per_item: Decimal | None = None
    description: str | None = None
    short_description: str | None = None
    stock: int = 0
    low_stock_threshold: int = 10
    weight: Decimal | None = None
    is_active: bool = True
    is_featured: bool = False

    @field_validator("price", "compare_at_price", "cost_per_item")
    @classmethod
    def price_validator(cls, v):
        if v is not None and v < 0:
            raise ValueError("Price cannot be negative.")
        return v

    @field_validator("stock")
    @classmethod
    def stock_validator(cls, v):
        if v < 0:
            raise ValueError("Stock cannot be negative.")
        return v

    @field_validator("name")
    @classmethod
    def name_validator(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Product name must be at least 3 characters.")
        return v

    model_config = {"str_strip_whitespace": True}


class ProductUpdateRequest(BaseModel):
    name: str | None = None
    category_id: int | None = None
    price: Decimal | None = None
    compare_at_price: Decimal | None = None
    cost_per_item: Decimal | None = None
    description: str | None = None
    short_description: str | None = None
    stock: int | None = None
    low_stock_threshold: int | None = None
    weight: Decimal | None = None
    is_active: bool | None = None
    is_featured: bool | None = None

    model_config = {"str_strip_whitespace": True}


class ProductFilterParams(BaseModel):
    """Query params for product listing — search, filter, sort, paginate."""
    search: str | None = None
    category_id: int | None = None
    category_slug: str | None = None
    min_price: Decimal | None = None
    max_price: Decimal | None = None
    is_featured: bool | None = None
    in_stock: bool | None = None
    sort: str = "created_at_desc"   # created_at_desc | price_asc | price_desc | rating_desc
    page: int = 1
    per_page: int = 20

    @field_validator("per_page")
    @classmethod
    def per_page_limit(cls, v):
        # Cap at 100 — prevents clients from dumping the entire catalog
        return min(v, 100)

    @field_validator("page")
    @classmethod
    def page_min(cls, v):
        return max(v, 1)


# ── Variant Schemas ───────────────────────────────────────

class VariantCreateRequest(BaseModel):
    sku: str
    variant_name: str | None = None
    size: str | None = None
    color: str | None = None
    material: str | None = None
    price: Decimal
    compare_at_price: Decimal | None = None
    stock: int = 0
    weight: Decimal | None = None
    is_active: bool = True

    @field_validator("price")
    @classmethod
    def price_check(cls, v):
        if v < 0:
            raise ValueError("Price cannot be negative.")
        return v

    @field_validator("stock")
    @classmethod
    def stock_check(cls, v):
        if v < 0:
            raise ValueError("Stock cannot be negative.")
        return v

    model_config = {"str_strip_whitespace": True}


class VariantUpdateRequest(BaseModel):
    variant_name: str | None = None
    size: str | None = None
    color: str | None = None
    material: str | None = None
    price: Decimal | None = None
    compare_at_price: Decimal | None = None
    stock: int | None = None
    is_active: bool | None = None

    model_config = {"str_strip_whitespace": True}


# ── Image Schemas ─────────────────────────────────────────

class ProductImageRequest(BaseModel):
    image_url: str
    alt_text: str | None = None
    is_primary: bool = False
    display_order: int = 0

    @field_validator("image_url")
    @classmethod
    def url_validator(cls, v: str) -> str:
        if not v.startswith(("http://", "https://")):
            raise ValueError("image_url must be a valid HTTP/HTTPS URL.")
        return v


# ── Response Schemas ──────────────────────────────────────

class VariantResponse(BaseModel):
    id: int
    sku: str
    variant_name: str | None
    size: str | None
    color: str | None
    material: str | None
    price: Decimal
    compare_at_price: Decimal | None
    stock: int
    is_active: bool


class ProductImageResponse(BaseModel):
    id: int
    image_url: str
    alt_text: str | None
    is_primary: bool
    display_order: int


class ProductResponse(BaseModel):
    id: int
    name: str
    slug: str
    category_id: int | None
    sku: str | None
    price: Decimal
    compare_at_price: Decimal | None
    description: str | None
    short_description: str | None
    stock: int
    low_stock_threshold: int
    is_active: bool
    is_featured: bool
    average_rating: Decimal
    total_reviews: int
    total_sales: int
    variants: list[VariantResponse] = []
    images: list[ProductImageResponse] = []


class ProductListItem(BaseModel):
    """Lightweight version for listing pages — no variants/images detail."""
    id: int
    name: str
    slug: str
    price: Decimal
    compare_at_price: Decimal | None
    stock: int
    is_featured: bool
    average_rating: Decimal
    total_reviews: int
    primary_image: str | None