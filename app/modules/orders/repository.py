import asyncpg


class OrdersRepository:

    def __init__(self, db: asyncpg.Connection):
        self.db = db

    # ── Cart validation queries ───────────────────────────────

    async def get_cart_items_for_checkout(self, user_id: int) -> list[dict]:
        """
        Fetch cart items with all data needed for order creation.
        Joined with live stock and product info — used to validate
        before committing the order.
        """
        rows = await self.db.fetch(
            """
            SELECT
                ci.id              AS cart_item_id,
                ci.product_id,
                ci.product_variant_id,
                ci.quantity,
                ci.price_snapshot,
                p.name             AS product_name,
                p.sku              AS product_sku,
                p.is_active        AS product_active,
                COALESCE(pv.stock, p.stock)  AS available_stock,
                COALESCE(pv.is_active, TRUE) AS variant_active,
                COALESCE(pv.price, p.price)  AS current_price,
                CASE
                    WHEN pv.id IS NOT NULL THEN
                        TRIM(BOTH ' / ' FROM
                            COALESCE(pv.color,'') || ' / ' || COALESCE(pv.size,'')
                        )
                    ELSE NULL
                END AS variant_details,
                pv.sku AS variant_sku
            FROM cart c
            JOIN cart_items ci ON ci.cart_id = c.id
            JOIN products p ON p.id = ci.product_id
            LEFT JOIN product_variants pv ON pv.id = ci.product_variant_id
            WHERE c.user_id = $1
            ORDER BY ci.created_at ASC
            """,
            user_id,
        )
        return [dict(r) for r in rows]

    # ── Address validation ────────────────────────────────────

    async def address_belongs_to_user(
        self, address_id: int, user_id: int
    ) -> bool:
        return await self.db.fetchval(
            "SELECT EXISTS(SELECT 1 FROM user_addresses WHERE id=$1 AND user_id=$2)",
            address_id, user_id,
        )

    # ── Coupon queries ────────────────────────────────────────

    async def get_coupon_by_code(self, code: str) -> dict | None:
        row = await self.db.fetchrow(
            """
            SELECT id, code, discount_type, discount_value,
                   min_purchase_amount, max_discount_amount,
                   valid_from, valid_to, usage_limit,
                   usage_per_user, times_used, is_active
            FROM coupon_code
            WHERE UPPER(code) = UPPER($1)
            """,
            code,
        )
        return dict(row) if row else None

    async def get_user_coupon_usage(self, coupon_id: int, user_id: int) -> int:
        return await self.db.fetchval(
            "SELECT get_user_coupon_usage($1, $2)",
            coupon_id, user_id,
        )

    async def record_coupon_usage(
        self, coupon_id: int, user_id: int, order_id: int
    ) -> None:
        await self.db.execute(
            """
            INSERT INTO coupon_usage (coupon_id, user_id, order_id)
            VALUES ($1, $2, $3)
            ON CONFLICT DO NOTHING
            """,
            coupon_id, user_id, order_id,
        )

    async def increment_coupon_times_used(self, coupon_id: int) -> None:
        await self.db.execute(
            "UPDATE coupon_code SET times_used = times_used + 1 WHERE id = $1",
            coupon_id,
        )

    # ── Order state / payment lookups ─────────────────────────

    async def get_order_state_id(self, name: str) -> int | None:
        return await self.db.fetchval(
            "SELECT id FROM order_state WHERE name = $1", name,
        )

    async def get_payment_status_id(self, name: str) -> int | None:
        return await self.db.fetchval(
            "SELECT id FROM payment_status WHERE name = $1", name,
        )

    async def payment_method_exists(self, payment_method_id: int) -> bool:
        return await self.db.fetchval(
            "SELECT EXISTS(SELECT 1 FROM payment_method WHERE id=$1 AND is_active=TRUE)",
            payment_method_id,
        )

    # ── Order creation (inside transaction) ───────────────────

    async def create_order(self, data: dict) -> dict:
        row = await self.db.fetchrow(
            """
            INSERT INTO orders (
                user_id, order_number,
                shipping_address_id, billing_address_id,
                subtotal, discount, tax, shipping_charge, total_price,
                order_notes, coupon_code_id,
                order_state_id, payment_method_id, payment_status_id
            ) VALUES (
                $1, generate_order_number(),
                $2, $3,
                $4, $5, $6, $7, $8,
                $9, $10,
                $11, $12, $13
            )
            RETURNING id, order_number, created_at
            """,
            data["user_id"],
            data["shipping_address_id"], data["billing_address_id"],
            data["subtotal"], data["discount"], data["tax"],
            data["shipping_charge"], data["total_price"],
            data.get("order_notes"), data.get("coupon_code_id"),
            data["order_state_id"], data["payment_method_id"],
            data["payment_status_id"],
        )
        return dict(row)

    async def create_order_item(self, data: dict) -> None:
        await self.db.execute(
            """
            INSERT INTO order_items (
                order_id, product_id, product_variant_id,
                product_name, product_sku, variant_details,
                quantity, price_per_unit, total_price
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            """,
            data["order_id"], data["product_id"], data.get("product_variant_id"),
            data["product_name"], data.get("product_sku"),
            data.get("variant_details"),
            data["quantity"], data["price_per_unit"], data["total_price"],
        )

    async def deduct_stock(
        self,
        product_id: int,
        variant_id: int | None,
        quantity: int,
    ) -> None:
        """
        Deduct stock atomically.
        WHY CHECK >= 0? Prevents stock going negative even if two
        requests slip through simultaneously (last line of defense).
        The CHECK constraint on the column is the DB-level guard.
        """
        if variant_id:
            await self.db.execute(
                """
                UPDATE product_variants
                SET stock = stock - $1
                WHERE id = $2 AND product_id = $3 AND stock >= $1
                """,
                quantity, variant_id, product_id,
            )
        else:
            await self.db.execute(
                """
                UPDATE products
                SET stock = stock - $1, total_sales = total_sales + $1
                WHERE id = $2 AND stock >= $1
                """,
                quantity, product_id,
            )

    async def clear_cart(self, user_id: int) -> None:
        await self.db.execute(
            """
            DELETE FROM cart_items
            WHERE cart_id = (SELECT id FROM cart WHERE user_id = $1)
            """,
            user_id,
        )

    # ── Order queries ─────────────────────────────────────────

    async def get_order_by_id(self, order_id: int, user_id: int | None = None) -> dict | None:
        """
        Full order with state name, payment info.
        user_id=None → admin can fetch any order.
        user_id=N    → customer can only fetch their own.
        """
        user_filter = "AND o.user_id = $2" if user_id else ""
        params = [order_id] + ([user_id] if user_id else [])

        row = await self.db.fetchrow(
            f"""
            SELECT
                o.id, o.order_number, o.user_id,
                os.name  AS status,
                o.order_state_id,
                ps.name  AS payment_status,
                pm.name  AS payment_method,
                o.subtotal, o.discount, o.tax,
                o.shipping_charge, o.total_price,
                o.tracking_number, o.order_notes,
                o.created_at, o.delivery_date
            FROM orders o
            JOIN order_state    os ON os.id = o.order_state_id
            JOIN payment_status ps ON ps.id = o.payment_status_id
            JOIN payment_method pm ON pm.id = o.payment_method_id
            WHERE o.id = $1 {user_filter}
            """,
            *params,
        )
        return dict(row) if row else None

    async def get_order_items(self, order_id: int) -> list[dict]:
        rows = await self.db.fetch(
            """
            SELECT id, product_id, product_variant_id,
                   product_name, product_sku, variant_details,
                   quantity, price_per_unit, total_price
            FROM order_items WHERE order_id = $1
            ORDER BY id ASC
            """,
            order_id,
        )
        return [dict(r) for r in rows]

    async def list_orders(
        self,
        user_id: int | None,
        page: int,
        per_page: int,
        status_filter: str | None = None,
    ) -> tuple[list[dict], int]:
        """
        List orders. user_id=None → admin sees all, otherwise customer sees own.
        """
        conditions = []
        params: list = []
        i = 1

        if user_id:
            conditions.append(f"o.user_id = ${i}")
            params.append(user_id)
            i += 1

        if status_filter:
            conditions.append(f"os.name = ${i}")
            params.append(status_filter.upper())
            i += 1

        where = "WHERE " + " AND ".join(conditions) if conditions else ""
        offset = (page - 1) * per_page

        count = await self.db.fetchval(
            f"""
            SELECT COUNT(*) FROM orders o
            JOIN order_state os ON os.id = o.order_state_id
            {where}
            """,
            *params,
        )

        rows = await self.db.fetch(
            f"""
            SELECT
                o.id, o.order_number,
                os.name AS status,
                ps.name AS payment_status,
                o.total_price,
                (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
                o.created_at
            FROM orders o
            JOIN order_state    os ON os.id = o.order_state_id
            JOIN payment_status ps ON ps.id = o.payment_status_id
            {where}
            ORDER BY o.created_at DESC
            LIMIT ${i} OFFSET ${i+1}
            """,
            *params, per_page, offset,
        )
        return [dict(r) for r in rows], count

    # ── Order state management ────────────────────────────────

    async def update_order_state(
        self,
        order_id: int,
        order_state_id: int,
        payment_status_id: int | None = None,
    ) -> None:
        if payment_status_id:
            await self.db.execute(
                """
                UPDATE orders
                SET order_state_id = $1, payment_status_id = $2
                WHERE id = $3
                """,
                order_state_id, payment_status_id, order_id,
            )
        else:
            await self.db.execute(
                "UPDATE orders SET order_state_id = $1 WHERE id = $2",
                order_state_id, order_id,
            )

    async def update_tracking_number(
        self, order_id: int, tracking_number: str
    ) -> None:
        await self.db.execute(
            "UPDATE orders SET tracking_number = $1 WHERE id = $2",
            tracking_number, order_id,
        )

    async def restore_stock(self, order_id: int) -> None:
        """
        Restore stock on cancellation.
        Loops over order_items and increments stock back.
        """
        items = await self.get_order_items(order_id)
        for item in items:
            if item["product_variant_id"]:
                await self.db.execute(
                    "UPDATE product_variants SET stock = stock + $1 WHERE id = $2",
                    item["quantity"], item["product_variant_id"],
                )
            else:
                await self.db.execute(
                    """
                    UPDATE products
                    SET stock = stock + $1,
                        total_sales = GREATEST(total_sales - $1, 0)
                    WHERE id = $2
                    """,
                    item["quantity"], item["product_id"],
                )