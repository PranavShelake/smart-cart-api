from pydantic import BaseModel, field_validator
from decimal import Decimal
from datetime import datetime


class PlaceOrderRequest(BaseModel):
    shipping_address_id: int
    billing_address_id:  int
    payment_method_id:   int
    coupon_code:         str | None = None
    order_notes:         str | None = None

    @field_validator("order_notes")
    @classmethod
    def notes_length(cls, v: str | None) -> str | None:
        if v and len(v) > 500:
            raise ValueError("Order notes cannot exceed 500 characters.")
        return v


class CancelOrderRequest(BaseModel):
    reason: str | None = None


class UpdateOrderStateRequest(BaseModel):
    """Admin only — move order through state machine."""
    order_state_id: int
    notes: str | None = None


class OrderItemResponse(BaseModel):
    id:                 int
    product_id:         int
    product_variant_id: int | None
    product_name:       str
    product_sku:        str | None
    variant_details:    str | None
    quantity:           int
    price_per_unit:     Decimal
    total_price:        Decimal


class OrderResponse(BaseModel):
    id:              int
    order_number:    str
    status:          str           # e.g. "PENDING"
    order_state_id:  int
    payment_status:  str
    payment_method:  str
    subtotal:        Decimal
    discount:        Decimal
    tax:             Decimal
    shipping_charge: Decimal
    total_price:     Decimal
    tracking_number: str | None
    order_notes:     str | None
    items:           list[OrderItemResponse]
    created_at:      datetime
    delivery_date:   datetime | None


class OrderListItem(BaseModel):
    id:             int
    order_number:   str
    status:         str
    payment_status: str
    total_price:    Decimal
    item_count:     int
    created_at:     datetime


class CouponValidationResponse(BaseModel):
    valid:           bool
    discount_type:   str | None    = None
    discount_value:  Decimal | None = None
    discount_amount: Decimal | None = None
    message:         str