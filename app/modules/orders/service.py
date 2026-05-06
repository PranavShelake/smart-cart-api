from decimal import Decimal
from datetime import datetime, timezone
import asyncpg

from app.modules.orders.repository import OrdersRepository
from app.modules.orders.schemas import (
    PlaceOrderRequest, CancelOrderRequest, UpdateOrderStateRequest,
)
from app.core.exceptions import (
    NotFoundException, ConflictException, AppException,
)
from fastapi import status

# ── Domain exceptions ─────────────────────────────────────────

class EmptyCartException(AppException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="ORDER_EMPTY_CART",
            message="Your cart is empty. Add items before placing an order.",
        )

class InsufficientStockException(AppException):
    def __init__(self, product_name: str, available: int):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            error_code="ORDER_INSUFFICIENT_STOCK",
            message=f"'{product_name}' only has {available} unit(s) in stock.",
        )

class InvalidOrderStateException(AppException):
    def __init__(self, msg: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            error_code="ORDER_INVALID_STATE",
            message=msg,
        )

# ── State machine — defines valid transitions ─────────────────
# Key = current state, Value = set of allowed next states
VALID_TRANSITIONS: dict[str, set[str]] = {
    "PENDING":          {"CONFIRMED", "CANCELLED"},
    "CONFIRMED":        {"PROCESSING", "CANCELLED"},
    "PROCESSING":       {"SHIPPED", "CANCELLED"},
    "SHIPPED":          {"OUT_FOR_DELIVERY"},
    "OUT_FOR_DELIVERY": {"DELIVERED"},
    "DELIVERED":        {"RETURN_REQUESTED"},
    "RETURN_REQUESTED": {"RETURN_APPROVED", "RETURN_REJECTED"},
    "RETURN_APPROVED":  {"REFUNDED"},
    "CANCELLED":        set(),
    "REFUNDED":         set(),
    "RETURN_REJECTED":  set(),
}

# Free shipping threshold (INR)
FREE_SHIPPING_THRESHOLD = Decimal("499")
SHIPPING_CHARGE         = Decimal("49")
TAX_RATE                = Decimal("0.18")   # 18% GST flat for simplicity


class OrdersService:

    def __init__(self, db: asyncpg.Connection):
        self.repo = OrdersRepository(db)

    async def place_order(self, user_id: int, data: PlaceOrderRequest) -> dict:
        """
        Place an order from the user's current cart.

        This entire operation runs inside a DB TRANSACTION.
        If ANY step fails (stock insufficient, coupon invalid, DB error),
        the entire operation rolls back — no partial orders, no stock deducted.

        Steps:
        1. Validate cart is not empty
        2. Validate all addresses belong to this user
        3. Validate payment method exists
        4. Validate all cart items are in stock
        5. Validate and calculate coupon discount
        6. Calculate subtotal, discount, tax, shipping, total
        7. Create order record
        8. Create order_items records
        9. Deduct stock for each item
        10. Record coupon usage + increment coupon times_used
        11. Clear cart
        12. Return full order
        """
        async with self.db.transaction():

            # Step 1: Cart validation
            cart_items = await self.repo.get_cart_items_for_checkout(user_id)
            if not cart_items:
                raise EmptyCartException()

            # Check all products/variants still active
            for item in cart_items:
                if not item["product_active"] or not item["variant_active"]:
                    raise ConflictException(
                        f"'{item['product_name']}' is no longer available."
                    )

            # Step 2: Address validation
            for addr_id in {data.shipping_address_id, data.billing_address_id}:
                if not await self.repo.address_belongs_to_user(addr_id, user_id):
                    raise NotFoundException("Address")

            # Step 3: Payment method validation
            if not await self.repo.payment_method_exists(data.payment_method_id):
                raise NotFoundException("Payment method")

            # Step 4: Stock validation
            for item in cart_items:
                if item["available_stock"] < item["quantity"]:
                    raise InsufficientStockException(
                        product_name=item["product_name"],
                        available=item["available_stock"],
                    )

            # Step 5: Coupon validation + discount calculation
            coupon_id       = None
            discount_amount = Decimal("0")

            if data.coupon_code:
                coupon_result = await self._validate_coupon(
                    code=data.coupon_code,
                    user_id=user_id,
                    cart_items=cart_items,
                )
                if not coupon_result["valid"]:
                    raise ConflictException(coupon_result["message"])
                coupon_id       = coupon_result["coupon_id"]
                discount_amount = coupon_result["discount_amount"]

            # Step 6: Price calculations
            # WHY use price_snapshot (not current price)?
            # Price was locked when user added to cart. We honour that price.
            subtotal = sum(
                Decimal(str(item["price_snapshot"])) * item["quantity"]
                for item in cart_items
            )
            after_discount = subtotal - discount_amount
            tax            = (after_discount * TAX_RATE).quantize(Decimal("0.01"))
            shipping       = (
                Decimal("0") if subtotal >= FREE_SHIPPING_THRESHOLD
                else SHIPPING_CHARGE
            )
            total = after_discount + tax + shipping

            # Step 7: Create order
            pending_state_id = await self.repo.get_order_state_id("PENDING")
            pending_payment_id = await self.repo.get_payment_status_id("PENDING")

            order = await self.repo.create_order({
                "user_id":             user_id,
                "shipping_address_id": data.shipping_address_id,
                "billing_address_id":  data.billing_address_id,
                "subtotal":            float(subtotal),
                "discount":            float(discount_amount),
                "tax":                 float(tax),
                "shipping_charge":     float(shipping),
                "total_price":         float(total),
                "order_notes":         data.order_notes,
                "coupon_code_id":      coupon_id,
                "order_state_id":      pending_state_id,
                "payment_method_id":   data.payment_method_id,
                "payment_status_id":   pending_payment_id,
            })

            order_id = order["id"]

            # Step 8: Create order items
            for item in cart_items:
                unit_price  = Decimal(str(item["price_snapshot"]))
                item_total  = unit_price * item["quantity"]
                variant_details = item.get("variant_details")
                if variant_details:
                    variant_details = variant_details.strip(" /") or None

                await self.repo.create_order_item({
                    "order_id":          order_id,
                    "product_id":        item["product_id"],
                    "product_variant_id": item.get("product_variant_id"),
                    "product_name":      item["product_name"],
                    "product_sku":       item.get("variant_sku") or item.get("product_sku"),
                    "variant_details":   variant_details,
                    "quantity":          item["quantity"],
                    "price_per_unit":    float(unit_price),
                    "total_price":       float(item_total),
                })

            # Step 9: Deduct stock
            for item in cart_items:
                await self.repo.deduct_stock(
                    product_id=item["product_id"],
                    variant_id=item.get("product_variant_id"),
                    quantity=item["quantity"],
                )

            # Step 10: Coupon usage
            if coupon_id:
                await self.repo.record_coupon_usage(coupon_id, user_id, order_id)
                await self.repo.increment_coupon_times_used(coupon_id)

            # Step 11: Clear cart
            await self.repo.clear_cart(user_id)

        # Step 12: Return full order (outside transaction)
        return await self.get_order(order_id, user_id=user_id)

    async def get_order(self, order_id: int, user_id: int | None = None) -> dict:
        order = await self.repo.get_order_by_id(order_id, user_id)
        if not order:
            raise NotFoundException("Order")
        order["items"] = await self.repo.get_order_items(order_id)
        return order

    async def list_orders(
        self,
        user_id: int | None,
        page: int,
        per_page: int,
        status_filter: str | None,
    ) -> tuple[list[dict], int]:
        return await self.repo.list_orders(user_id, page, per_page, status_filter)

    async def cancel_order(
        self, order_id: int, user_id: int | None, data: CancelOrderRequest
    ) -> dict:
        """
        Cancel an order. Restores stock and marks as CANCELLED.
        user_id=None → admin cancel (any order).
        user_id=N    → customer cancel (own order only, before SHIPPED).
        """
        order = await self.repo.get_order_by_id(order_id, user_id)
        if not order:
            raise NotFoundException("Order")

        current_status = order["status"]

        # Customers can only cancel PENDING or CONFIRMED orders
        if user_id and current_status not in ("PENDING", "CONFIRMED"):
            raise InvalidOrderStateException(
                "Order can only be cancelled before it is shipped."
            )

        if current_status in ("CANCELLED", "DELIVERED", "REFUNDED"):
            raise InvalidOrderStateException(
                f"Cannot cancel an order in '{current_status}' state."
            )

        cancelled_id = await self.repo.get_order_state_id("CANCELLED")
        await self.repo.update_order_state(order_id, cancelled_id)
        await self.repo.restore_stock(order_id)

        return await self.get_order(order_id)

    async def update_order_state(
        self, order_id: int, data: UpdateOrderStateRequest
    ) -> dict:
        """Admin only — advance order through state machine."""
        order = await self.repo.get_order_by_id(order_id)
        if not order:
            raise NotFoundException("Order")

        current = order["status"]
        new_state_row = await self.db_get_state_name(data.order_state_id)
        if not new_state_row:
            raise NotFoundException("Order state")

        new_state = new_state_row
        allowed = VALID_TRANSITIONS.get(current, set())

        if new_state not in allowed:
            raise InvalidOrderStateException(
                f"Cannot move order from '{current}' to '{new_state}'. "
                f"Allowed transitions: {', '.join(allowed) or 'none'}."
            )

        # Auto-update payment status when order is DELIVERED
        payment_status_id = None
        if new_state == "DELIVERED":
            payment_status_id = await self.repo.get_payment_status_id("PAID")

        await self.repo.update_order_state(order_id, data.order_state_id, payment_status_id)
        return await self.get_order(order_id)

    async def db_get_state_name(self, state_id: int) -> str | None:
        return await self.repo.db.fetchval(
            "SELECT name FROM order_state WHERE id = $1", state_id
        )

    # ── Coupon validation (internal) ──────────────────────────

    async def validate_coupon_for_user(
        self, code: str, user_id: int, cart_subtotal: Decimal
    ) -> dict:
        """Public endpoint version — returns validation response."""
        # Build minimal cart_items list for calculation
        fake_items = [{"price_snapshot": float(cart_subtotal), "quantity": 1}]
        return await self._validate_coupon(code, user_id, fake_items)

    async def _validate_coupon(
        self, code: str, user_id: int, cart_items: list[dict]
    ) -> dict:
        coupon = await self.repo.get_coupon_by_code(code)

        if not coupon:
            return {"valid": False, "message": "Coupon code not found."}

        if not coupon["is_active"]:
            return {"valid": False, "message": "This coupon is no longer active."}

        now = datetime.now(timezone.utc)
        if now < coupon["valid_from"] or now > coupon["valid_to"]:
            return {"valid": False, "message": "This coupon has expired."}

        if coupon["usage_limit"] and coupon["times_used"] >= coupon["usage_limit"]:
            return {"valid": False, "message": "This coupon has reached its usage limit."}

        user_usage = await self.repo.get_user_coupon_usage(coupon["id"], user_id)
        if user_usage >= coupon["usage_per_user"]:
            return {
                "valid": False,
                "message": f"You have already used this coupon the maximum number of times.",
            }

        # Calculate subtotal
        subtotal = sum(
            Decimal(str(item["price_snapshot"])) * item["quantity"]
            for item in cart_items
        )

        min_amount = Decimal(str(coupon["min_purchase_amount"] or 0))
        if subtotal < min_amount:
            return {
                "valid": False,
                "message": f"Minimum order value of ₹{min_amount} required for this coupon.",
            }

        # Calculate discount
        disc_value = Decimal(str(coupon["discount_value"]))
        if coupon["discount_type"] == "percentage":
            discount = (subtotal * disc_value / 100).quantize(Decimal("0.01"))
            if coupon["max_discount_amount"]:
                discount = min(discount, Decimal(str(coupon["max_discount_amount"])))
        else:
            discount = disc_value

        discount = min(discount, subtotal)   # can't discount more than subtotal

        return {
            "valid":           True,
            "coupon_id":       coupon["id"],
            "discount_type":   coupon["discount_type"],
            "discount_value":  disc_value,
            "discount_amount": discount,
            "message":         f"Coupon applied! You save ₹{discount}.",
        }