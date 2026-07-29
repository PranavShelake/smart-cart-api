from pydantic import BaseModel, field_validator
from decimal import Decimal


class CreateReturnRequest(BaseModel):
    order_id: int
    reason: str
    items: list["ReturnItemRequest"]

    @field_validator("reason")
    @classmethod
    def reason_length(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 10:
            raise ValueError("Please provide a detailed reason (min 10 characters).")
        if len(v) > 1000:
            raise ValueError("Reason cannot exceed 1000 characters.")
        return v

    model_config = {"str_strip_whitespace": True}


class ReturnItemRequest(BaseModel):
    order_item_id: int
    quantity: int
    reason: str | None = None

    @field_validator("quantity")
    @classmethod
    def qty_check(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Return quantity must be at least 1.")
        return v


class ProcessReturnRequest(BaseModel):
    """Admin: approve or reject a return."""
    action: str                        # 'approve' | 'reject'
    refund_amount: Decimal | None = None
    admin_notes: str | None = None

    @field_validator("action")
    @classmethod
    def action_check(cls, v: str) -> str:
        if v not in ("approve", "reject"):
            raise ValueError("Action must be 'approve' or 'reject'.")
        return v


class ReturnItemResponse(BaseModel):
    id: int
    order_item_id: int
    product_name: str
    quantity: int
    reason: str | None


class ReturnResponse(BaseModel):
    id: int
    order_id: int
    return_number: str
    reason: str
    status: str
    refund_amount: Decimal | None
    admin_notes: str | None
    items: list[ReturnItemResponse]
    requested_at: str
    approved_at: str | None
    completed_at: str | None


CreateReturnRequest.model_rebuild()