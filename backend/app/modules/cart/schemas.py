from pydantic import BaseModel, field_validator
from decimal import Decimal


class AddToCartRequest(BaseModel):
    product_id: int
    product_variant_id: int | None = None
    quantity: int = 1

    @field_validator("quantity")
    @classmethod
    def qty_check(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Quantity must be at least 1.")
        if v > 50:
            raise ValueError("Cannot add more than 50 of one item.")
        return v


class UpdateCartItemRequest(BaseModel):
    quantity: int

    @field_validator("quantity")
    @classmethod
    def qty_check(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Quantity must be at least 1.")
        if v > 50:
            raise ValueError("Cannot exceed 50 units per item.")
        return v


class CartItemResponse(BaseModel):
    id: int
    product_id: int
    product_variant_id: int | None
    product_name: str
    variant_label: str | None        # e.g. "Black / 128GB"
    primary_image: str | None
    price_snapshot: Decimal          # price locked at time of adding
    current_price: Decimal           # live price — may differ from snapshot
    price_changed: bool              # flag frontend to warn user
    quantity: int
    subtotal: Decimal                # price_snapshot × quantity


class CartResponse(BaseModel):
    cart_id: int
    items: list[CartItemResponse]
    item_count: int                  # total number of distinct items
    total_quantity: int              # sum of all quantities
    subtotal: Decimal                # sum of all subtotals
    price_change_warning: bool       # true if ANY item's price changed