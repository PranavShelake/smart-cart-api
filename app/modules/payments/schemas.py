from pydantic import BaseModel
from decimal import Decimal


class InitiatePaymentRequest(BaseModel):
    order_id: int          # our internal order ID


class InitiatePaymentResponse(BaseModel):
    """
    Returned to frontend so it can open the Razorpay checkout widget.
    Frontend needs: razorpay_key_id + razorpay_order_id + amount
    """
    razorpay_order_id: str     # e.g. "order_XXXXXXXXXXXXXXXX"
    razorpay_key_id:   str     # public key — safe to send to frontend
    amount:            int     # in PAISE (INR × 100) — Razorpay requires paise
    currency:          str     # "INR"
    order_number:      str     # our order number e.g. "SC-20240506-000001"
    prefill: dict              # { name, email, contact } for pre-filling widget


class VerifyPaymentRequest(BaseModel):
    """
    Frontend sends this after Razorpay checkout succeeds.
    Used as a CLIENT-SIDE confirmation — NOT a replacement for webhook.
    WHY both? Webhook is the authoritative source. This gives instant UX feedback.
    """
    razorpay_order_id:   str
    razorpay_payment_id: str
    razorpay_signature:  str


class PaymentStatusResponse(BaseModel):
    payment_id:          int
    order_id:            int
    razorpay_order_id:   str
    razorpay_payment_id: str | None
    amount:              Decimal
    status:              str
    method:              str | None