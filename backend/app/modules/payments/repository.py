import asyncpg


class PaymentsRepository:

    def __init__(self, db: asyncpg.Connection):
        self.db = db

    async def get_order_for_payment(
        self, order_id: int, user_id: int
    ) -> dict | None:
        """
        Fetch order with user details for payment initiation.
        Must be PENDING state — can't pay for CANCELLED or already PAID orders.
        """
        row = await self.db.fetchrow(
            """
            SELECT
                o.id, o.order_number, o.total_price, o.user_id,
                os.name  AS status,
                ps.name  AS payment_status,
                u.email, u.first_name, u.last_name, u.phone
            FROM orders o
            JOIN order_state    os ON os.id = o.order_state_id
            JOIN payment_status ps ON ps.id = o.payment_status_id
            JOIN users u           ON u.id  = o.user_id
            WHERE o.id = $1 AND o.user_id = $2
            """,
            order_id, user_id,
        )
        return dict(row) if row else None

    async def payment_already_captured(self, order_id: int) -> bool:
        return await self.db.fetchval(
            """
            SELECT EXISTS(
                SELECT 1 FROM payments
                WHERE order_id = $1 AND status = 'captured'
            )
            """,
            order_id,
        )

    async def create_payment_record(self, data: dict) -> dict:
        """Create a payment record when Razorpay order is created."""
        row = await self.db.fetchrow(
            """
            INSERT INTO payments
                (order_id, razorpay_order_id, amount, currency, status)
            VALUES ($1, $2, $3, $4, 'created')
            RETURNING id, order_id, razorpay_order_id, amount, currency, status
            """,
            data["order_id"], data["razorpay_order_id"],
            data["amount"], data.get("currency", "INR"),
        )
        return dict(row)

    async def get_by_razorpay_order_id(self, razorpay_order_id: str) -> dict | None:
        row = await self.db.fetchrow(
            """
            SELECT id, order_id, razorpay_order_id, razorpay_payment_id,
                   amount, status, method
            FROM payments WHERE razorpay_order_id = $1
            """,
            razorpay_order_id,
        )
        return dict(row) if row else None

    async def get_by_order_id(self, order_id: int) -> dict | None:
        row = await self.db.fetchrow(
            """
            SELECT id, order_id, razorpay_order_id, razorpay_payment_id,
                   amount, status, method
            FROM payments WHERE order_id = $1
            ORDER BY created_at DESC LIMIT 1
            """,
            order_id,
        )
        return dict(row) if row else None

    async def mark_captured(
        self,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
        method: str | None = None,
    ) -> None:
        await self.db.execute(
            """
            UPDATE payments
            SET status              = 'captured',
                razorpay_payment_id = $2,
                razorpay_signature  = $3,
                method              = $4
            WHERE razorpay_order_id = $1
            """,
            razorpay_order_id, razorpay_payment_id,
            razorpay_signature, method,
        )

    async def mark_failed(
        self, razorpay_order_id: str, reason: str | None = None
    ) -> None:
        await self.db.execute(
            """
            UPDATE payments
            SET status = 'failed', failure_reason = $2
            WHERE razorpay_order_id = $1
            """,
            razorpay_order_id, reason,
        )

    async def mark_refunded(self, razorpay_order_id: str) -> None:
        await self.db.execute(
            """
            UPDATE payments SET status = 'refunded'
            WHERE razorpay_order_id = $1
            """,
            razorpay_order_id,
        )

    # ── Order state updates triggered by payment events ───────

    async def confirm_order_payment(self, order_id: int) -> None:
        """
        Called when payment is captured.
        Moves order: PENDING → CONFIRMED, payment_status: PENDING → PAID.
        """
        await self.db.execute(
            """
            UPDATE orders
            SET order_state_id = (
                    SELECT id FROM order_state WHERE name = 'CONFIRMED'
                ),
                payment_status_id = (
                    SELECT id FROM payment_status WHERE name = 'PAID'
                )
            WHERE id = $1
            """,
            order_id,
        )

    async def set_payment_failed(self, order_id: int) -> None:
        await self.db.execute(
            """
            UPDATE orders
            SET payment_status_id = (
                SELECT id FROM payment_status WHERE name = 'FAILED'
            )
            WHERE id = $1
            """,
            order_id,
        )

    async def set_payment_refunded(self, order_id: int) -> None:
        await self.db.execute(
            """
            UPDATE orders
            SET payment_status_id = (
                    SELECT id FROM payment_status WHERE name = 'REFUNDED'
                ),
                order_state_id = (
                    SELECT id FROM order_state WHERE name = 'REFUNDED'
                )
            WHERE id = $1
            """,
            order_id,
        )

    async def restore_stock_on_failed_payment(self, order_id: int) -> None:
        """
        If payment fails, restore stock so items aren't locked indefinitely.
        """
        items = await self.db.fetch(
            "SELECT product_id, product_variant_id, quantity FROM order_items WHERE order_id = $1",
            order_id,
        )
        for item in items:
            if item["product_variant_id"]:
                await self.db.execute(
                    "UPDATE product_variants SET stock = stock + $1 WHERE id = $2",
                    item["quantity"], item["product_variant_id"],
                )
            else:
                await self.db.execute(
                    "UPDATE products SET stock = stock + $1 WHERE id = $2",
                    item["quantity"], item["product_id"],
                )