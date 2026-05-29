import logging
from fastapi import APIRouter, Depends, Request, Header
import asyncpg

from app.modules.payments.schemas import (
    InitiatePaymentRequest, VerifyPaymentRequest,
)
from app.modules.payments.service import PaymentsService
from app.core.dependencies import get_current_user, TokenData
from app.database import get_db
from app.utils.response import success_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/initiate")
async def initiate_payment(
    data: InitiatePaymentRequest,
    current_user: TokenData = Depends(get_current_user),
    db: asyncpg.Connection  = Depends(get_db),
):
    """
    POST /api/v1/payments/initiate
    Step 1: Creates a Razorpay order.
    Returns credentials for the frontend Razorpay checkout widget.

    Frontend usage:
        const rzp = new Razorpay({
            key: data.razorpay_key_id,
            order_id: data.razorpay_order_id,
            amount: data.amount,
            currency: data.currency,
            prefill: data.prefill,
            handler: function(response) {
                // Call POST /payments/verify with response
            }
        })
        rzp.open()
    """
    service = PaymentsService(db)
    result = await service.initiate_payment(current_user.user_id, data)
    return success_response(data=result, message="Payment order created.")


@router.post("/verify")
async def verify_payment(
    data: VerifyPaymentRequest,
    current_user: TokenData = Depends(get_current_user),
    db: asyncpg.Connection  = Depends(get_db),
):
    """
    POST /api/v1/payments/verify
    Step 2: Called by frontend AFTER Razorpay checkout completes.
    Verifies HMAC signature and marks payment as captured.

    This gives the user instant "Payment successful" feedback.
    The webhook (/payments/webhook) is the authoritative source
    and handles the same event server-to-server.
    """
    service = PaymentsService(db)
    result = await service.verify_payment(data)
    return success_response(data=result, message=result["message"])


@router.post("/webhook")
async def razorpay_webhook(
    request: Request,
    db: asyncpg.Connection = Depends(get_db),
    x_razorpay_signature: str = Header(..., alias="X-Razorpay-Signature"),
):
    """
    POST /api/v1/payments/webhook
    Razorpay server-to-server callback.

    CRITICAL REQUIREMENTS:
    1. Must read RAW body (not parsed JSON) for signature verification
    2. Must return HTTP 200 quickly — Razorpay retries on non-200
    3. Must verify signature BEFORE processing any event
    4. Must be idempotent — Razorpay may send same event multiple times

    Configure in Razorpay Dashboard:
        Webhooks → Add New Webhook
        URL: https://your-domain.com/api/v1/payments/webhook
        Secret: same as RAZORPAY_WEBHOOK_SECRET in .env
        Events: payment.captured, payment.failed, refund.created
    """
    # Read raw bytes — MUST use request.body() not request.json()
    # Parsing JSON changes the byte sequence and breaks signature verification
    raw_body = await request.body()

    service = PaymentsService(db)
    result = await service.handle_webhook(raw_body, x_razorpay_signature)
    return success_response(data=result, message="Webhook processed.")


@router.get("/status/{order_id}")
async def get_payment_status(
    order_id: int,
    current_user: TokenData = Depends(get_current_user),
    db: asyncpg.Connection  = Depends(get_db),
):
    """
    GET /api/v1/payments/status/{order_id}
    Check payment status for a given order.
    Used by frontend to poll/confirm after payment.
    """
    service = PaymentsService(db)
    payment = await service.get_payment_status(order_id, current_user.user_id)
    return success_response(data=payment, message="Payment status fetched.")