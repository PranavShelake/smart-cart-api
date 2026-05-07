import asyncpg


class ReturnsRepository:

    def __init__(self, db: asyncpg.Connection):
        self.db = db

    async def get_order_for_return(
        self, order_id: int, user_id: int
    ) -> dict | None:
        """Order must be DELIVERED and belong to user."""
        row = await self.db.fetchrow(
            """
            SELECT o.id, o.user_id, os.name AS status
            FROM orders o
            JOIN order_state os ON os.id = o.order_state_id
            WHERE o.id = $1 AND o.user_id = $2 AND os.name = 'DELIVERED'
            """,
            order_id, user_id,
        )
        return dict(row) if row else None

    async def return_already_exists(self, order_id: int) -> bool:
        return await self.db.fetchval(
            """
            SELECT EXISTS(
                SELECT 1 FROM returns
                WHERE order_id = $1
                  AND status IN ('requested', 'approved')
            )
            """,
            order_id,
        )

    async def validate_order_items(
        self, order_id: int, item_ids: list[int]
    ) -> list[dict]:
        """Verify all requested items belong to this order."""
        rows = await self.db.fetch(
            """
            SELECT oi.id, oi.product_id, oi.quantity,
                   oi.product_name, oi.product_variant_id
            FROM order_items oi
            WHERE oi.order_id = $1 AND oi.id = ANY($2::int[])
            """,
            order_id, item_ids,
        )
        return [dict(r) for r in rows]

    async def generate_return_number(self) -> str:
        from datetime import date
        date_str = date.today().strftime("%Y%m%d")
        seq = await self.db.fetchval(
            """
            SELECT COALESCE(COUNT(*), 0) + 1
            FROM returns
            WHERE return_number LIKE $1
            """,
            f"RET-{date_str}-%",
        )
        return f"RET-{date_str}-{seq:06d}"

    async def create_return(self, data: dict) -> dict:
        row = await self.db.fetchrow(
            """
            INSERT INTO returns (order_id, return_number, reason, status)
            VALUES ($1, $2, $3, 'requested')
            RETURNING id, order_id, return_number, reason, status,
                      refund_amount, admin_notes,
                      requested_at::TEXT AS requested_at,
                      approved_at::TEXT  AS approved_at,
                      completed_at::TEXT AS completed_at
            """,
            data["order_id"], data["return_number"], data["reason"],
        )
        return dict(row)

    async def create_return_item(self, data: dict) -> None:
        await self.db.execute(
            """
            INSERT INTO return_items (return_id, order_item_id, quantity, reason)
            VALUES ($1, $2, $3, $4)
            """,
            data["return_id"], data["order_item_id"],
            data["quantity"], data.get("reason"),
        )

    async def get_return_by_id(
        self, return_id: int, user_id: int | None = None
    ) -> dict | None:
        user_filter = "AND o.user_id = $2" if user_id else ""
        params = [return_id] + ([user_id] if user_id else [])
        row = await self.db.fetchrow(
            f"""
            SELECT
                r.id, r.order_id, r.return_number, r.reason,
                r.status, r.refund_amount, r.admin_notes,
                r.requested_at::TEXT AS requested_at,
                r.approved_at::TEXT  AS approved_at,
                r.completed_at::TEXT AS completed_at
            FROM returns r
            JOIN orders o ON o.id = r.order_id
            WHERE r.id = $1 {user_filter}
            """,
            *params,
        )
        return dict(row) if row else None

    async def get_return_items(self, return_id: int) -> list[dict]:
        rows = await self.db.fetch(
            """
            SELECT ri.id, ri.order_item_id, ri.quantity, ri.reason,
                   oi.product_name
            FROM return_items ri
            JOIN order_items oi ON oi.id = ri.order_item_id
            WHERE ri.return_id = $1
            """,
            return_id,
        )
        return [dict(r) for r in rows]

    async def list_returns(
        self,
        user_id: int | None,
        page: int,
        per_page: int,
        status_filter: str | None,
    ) -> tuple[list[dict], int]:
        conditions = []
        params: list = []
        i = 1

        if user_id:
            conditions.append(f"o.user_id = ${i}")
            params.append(user_id)
            i += 1

        if status_filter:
            conditions.append(f"r.status = ${i}")
            params.append(status_filter.lower())
            i += 1

        where = "WHERE " + " AND ".join(conditions) if conditions else ""
        offset = (page - 1) * per_page

        count = await self.db.fetchval(
            f"""
            SELECT COUNT(*) FROM returns r
            JOIN orders o ON o.id = r.order_id
            {where}
            """,
            *params,
        )
        rows = await self.db.fetch(
            f"""
            SELECT r.id, r.order_id, r.return_number, r.reason,
                   r.status, r.refund_amount, r.requested_at::TEXT AS requested_at
            FROM returns r
            JOIN orders o ON o.id = r.order_id
            {where}
            ORDER BY r.requested_at DESC
            LIMIT ${i} OFFSET ${i+1}
            """,
            *params, per_page, offset,
        )
        return [dict(r) for r in rows], count

    async def process_return(
        self,
        return_id: int,
        action: str,
        refund_amount: float | None,
        admin_notes: str | None,
    ) -> bool:
        if action == "approve":
            result = await self.db.execute(
                """
                UPDATE returns
                SET status = 'approved',
                    refund_amount = $2,
                    admin_notes = $3,
                    approved_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND status = 'requested'
                """,
                return_id, refund_amount, admin_notes,
            )
        else:
            result = await self.db.execute(
                """
                UPDATE returns
                SET status = 'rejected', admin_notes = $2
                WHERE id = $1 AND status = 'requested'
                """,
                return_id, admin_notes,
            )
        return result == "UPDATE 1"

    async def update_order_state_to_return(
        self, order_id: int, state_name: str
    ) -> None:
        await self.db.execute(
            """
            UPDATE orders
            SET order_state_id = (
                SELECT id FROM order_state WHERE name = $2
            )
            WHERE id = $1
            """,
            order_id, state_name,
        )