import hmac
import hashlib
import json
import logging

import razorpay
import asyncpg

from app.modules.payments.repository import PaymentsRepository
from app.modules.payments.schemas import (
    InitiatePaymentRequest, VerifyPaymentRequest,
)
from app.core.exceptions import NotFoundException, ConflictException, AppException
from app.config import settings
from fastapi import status

logger = logging.getLogger(__name__)


class PaymentException(AppException):
    def __init__(self, msg: str):
        super().__init__(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            error_code="PAYMENT_ERROR",
            message=msg,
        )


class PaymentsService:

    def __init__(self, db: asyncpg.Connection):
        self.repo = PaymentsRepository(db)
        # Razorpay client — initialized with key_id + key_secret from .env
        self.rp = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )

    async def initiate_payment(
        self, user_id: int, data: InitiatePaymentRequest
    ) -> dict:
        """
        Step 1 of payment flow.
        Creates a Razorpay order and returns credentials to frontend.

        FLOW:
        Frontend → POST /payments/initiate
        Backend  → creates Razorpay order via SDK
        Backend  → stores payment record in DB (status=created)
        Backend  → returns { razorpay_order_id, key_id, amount_paise }
        Frontend → opens Razorpay checkout widget
        User     → pays
        Razorpay → sends webhook to /payments/webhook (authoritative)
        Frontend → calls /payments/verify (instant UX feedback)
        """
        order = await self.repo.get_order_for_payment(data.order_id, user_id)
        if not order:
            raise NotFoundException("Order")

        # Only PENDING orders can be paid
        if order["status"] not in ("PENDING",):
            raise ConflictException(
                f"Order is in '{order['status']}' state and cannot be paid."
            )

        if order["payment_status"] == "PAID":
            raise ConflictException("This order has already been paid.")

        if await self.repo.payment_already_captured(data.order_id):
            raise ConflictException("Payment for this order is already captured.")

        # Razorpay requires amount in PAISE (1 INR = 100 paise)
        amount_paise = int(float(order["total_price"]) * 100)

        try:
            rp_order = self.rp.order.create({
                "amount":   amount_paise,
                "currency": "INR",
                "receipt":  order["order_number"],    # our order number as receipt
                "notes": {
                    "order_id":     str(order["id"]),
                    "order_number": order["order_number"],
                    "user_id":      str(user_id),
                },
            })
        except Exception as e:
            logger.error(f"Razorpay order creation failed: {e}")
            raise PaymentException(
                "Payment gateway is unavailable. Please try again in a moment."
            )

        # Persist payment record
        await self.repo.create_payment_record({
            "order_id":          data.order_id,
            "razorpay_order_id": rp_order["id"],
            "amount":            float(order["total_price"]),
            "currency":          "INR",
        })

        return {
            "razorpay_order_id": rp_order["id"],
            "razorpay_key_id":   settings.RAZORPAY_KEY_ID,
            "amount":            amount_paise,
            "currency":          "INR",
            "order_number":      order["order_number"],
            "prefill": {
                "name":    f"{order['first_name']} {order['last_name']}",
                "email":   order["email"],
                "contact": order["phone"] or "",
            },
        }

    async def verify_payment(self, data: VerifyPaymentRequest) -> dict:
        """
        Step 2 (client-side) — called by frontend AFTER Razorpay checkout succeeds.
        Verifies the HMAC signature to confirm payment is genuine.

        WHY verify here AND in webhook?
        - This gives the frontend instant feedback ("Payment successful!")
        - Webhook is the authoritative source (handles server-to-server)
        - Both must verify the signature — never trust unverified data

        SIGNATURE VERIFICATION:
        Razorpay signs: razorpay_order_id + "|" + razorpay_payment_id
        Using HMAC-SHA256 with your webhook secret.
        We compare this to the signature Razorpay sent — if they match, payment is genuine.
        """
        generated = hmac.new(
            settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
            f"{data.razorpay_order_id}|{data.razorpay_payment_id}".encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(generated, data.razorpay_signature):
            raise PaymentException("Payment verification failed. Invalid signature.")

        payment = await self.repo.get_by_razorpay_order_id(data.razorpay_order_id)
        if not payment:
            raise NotFoundException("Payment record")

        # Mark captured + confirm order
        await self.repo.mark_captured(
            razorpay_order_id=data.razorpay_order_id,
            razorpay_payment_id=data.razorpay_payment_id,
            razorpay_signature=data.razorpay_signature,
        )
        await self.repo.confirm_order_payment(payment["order_id"])

        return {
            "status":  "captured",
            "order_id": payment["order_id"],
            "message": "Payment captured successfully.",
        }

    async def handle_webhook(self, payload: bytes, signature: str) -> dict:
        """
        Razorpay → POST /payments/webhook (server-to-server)
        This is the AUTHORITATIVE payment confirmation.

        WEBHOOK SIGNATURE VERIFICATION:
        Razorpay signs the raw request body with your webhook_secret.
        We verify using HMAC-SHA256 before processing ANY event.
        Never process a webhook without verifying its signature.

        EVENTS HANDLED:
        - payment.captured  → confirm order, mark payment captured
        - payment.failed    → mark failed, restore stock
        - refund.created    → mark refunded, update order state
        """
        # Step 1: Verify signature FIRST — reject anything that doesn't match
        expected = hmac.new(
            settings.RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
            payload,
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected, signature):
            logger.warning("Webhook signature mismatch — possible spoofing attempt")
            raise PaymentException("Invalid webhook signature.")

        # Step 2: Parse event
        try:
            event = json.loads(payload.decode("utf-8"))
        except json.JSONDecodeError:
            raise PaymentException("Invalid webhook payload.")

        event_type = event.get("event")
        entity     = event.get("payload", {}).get("payment", {}).get("entity", {})
        rp_order_id = entity.get("order_id")

        logger.info(f"Razorpay webhook received: {event_type} for order {rp_order_id}")

        if not rp_order_id:
            # Some events (refunds) have different payload structure
            entity      = event.get("payload", {}).get("refund", {}).get("entity", {})
            rp_order_id = entity.get("notes", {}).get("order_id")

        # Step 3: Route to correct handler
        if event_type == "payment.captured":
            await self._handle_payment_captured(rp_order_id, entity)

        elif event_type == "payment.failed":
            await self._handle_payment_failed(rp_order_id, entity)

        elif event_type == "refund.created":
            await self._handle_refund_created(rp_order_id, entity)

        else:
            logger.info(f"Unhandled webhook event: {event_type}")

        # Always return 200 to Razorpay — even for unhandled events
        # If we return non-200, Razorpay retries the webhook up to 3 times
        return {"status": "ok"}

    # ── Private webhook handlers ──────────────────────────────

    async def _handle_payment_captured(
        self, rp_order_id: str, entity: dict
    ) -> None:
        payment = await self.repo.get_by_razorpay_order_id(rp_order_id)
        if not payment:
            logger.error(f"Payment record not found for Razorpay order: {rp_order_id}")
            return

        if payment["status"] == "captured":
            logger.info(f"Payment {rp_order_id} already captured — idempotent skip")
            return

        await self.repo.mark_captured(
            razorpay_order_id=rp_order_id,
            razorpay_payment_id=entity.get("id", ""),
            razorpay_signature="webhook",
            method=entity.get("method"),
        )
        await self.repo.confirm_order_payment(payment["order_id"])
        logger.info(f"Payment captured for order {payment['order_id']}")

    async def _handle_payment_failed(
        self, rp_order_id: str, entity: dict
    ) -> None:
        payment = await self.repo.get_by_razorpay_order_id(rp_order_id)
        if not payment:
            return

        reason = entity.get("error_description") or entity.get("error_code")
        await self.repo.mark_failed(rp_order_id, reason)
        await self.repo.set_payment_failed(payment["order_id"])
        await self.repo.restore_stock_on_failed_payment(payment["order_id"])
        logger.info(f"Payment failed for order {payment['order_id']}: {reason}")

    async def _handle_refund_created(
        self, rp_order_id: str | None, entity: dict
    ) -> None:
        if not rp_order_id:
            return
        payment = await self.repo.get_by_razorpay_order_id(rp_order_id)
        if not payment:
            return
        await self.repo.mark_refunded(rp_order_id)
        await self.repo.set_payment_refunded(payment["order_id"])
        logger.info(f"Refund processed for order {payment['order_id']}")

    async def get_payment_status(self, order_id: int, user_id: int) -> dict:
        order = await self.repo.get_order_for_payment(order_id, user_id)
        if not order:
            raise NotFoundException("Order")
        payment = await self.repo.get_by_order_id(order_id)
        if not payment:
            raise NotFoundException("Payment record")
        return payment