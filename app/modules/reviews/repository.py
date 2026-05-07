import asyncpg


class ReviewsRepository:

    def __init__(self, db: asyncpg.Connection):
        self.db = db

    async def has_purchased_product(
        self, user_id: int, product_id: int, order_id: int
    ) -> bool:
        """
        Verified purchase check — user must have received this product
        via the specific order before they can review it.
        WHY check DELIVERED status?
            Prevents reviewing before receiving.
            Prevents review spam from cancelled orders.
        """
        return await self.db.fetchval(
            """
            SELECT EXISTS(
                SELECT 1
                FROM order_items oi
                JOIN orders o ON o.id = oi.order_id
                JOIN order_state os ON os.id = o.order_state_id
                WHERE o.user_id    = $1
                  AND oi.product_id = $2
                  AND o.id          = $3
                  AND os.name       = 'DELIVERED'
            )
            """,
            user_id, product_id, order_id,
        )

    async def review_exists(
        self, user_id: int, product_id: int, order_id: int
    ) -> bool:
        """One review per user per order_item — enforced at DB + service level."""
        return await self.db.fetchval(
            """
            SELECT EXISTS(
                SELECT 1 FROM product_reviews
                WHERE user_id = $1 AND product_id = $2 AND order_id = $3
            )
            """,
            user_id, product_id, order_id,
        )

    async def get_review_by_id(self, review_id: int) -> dict | None:
        row = await self.db.fetchrow(
            """
            SELECT
                r.id, r.product_id, r.user_id, r.order_id,
                r.rating, r.title, r.comment,
                r.is_verified_purchase, r.is_approved,
                r.helpful_count, r.created_at,
                CONCAT(u.first_name, ' ', u.last_name) AS reviewer_name
            FROM product_reviews r
            JOIN users u ON u.id = r.user_id
            WHERE r.id = $1
            """,
            review_id,
        )
        return dict(row) if row else None

    async def get_reviews_for_product(
        self,
        product_id: int,
        page: int,
        per_page: int,
        rating_filter: int | None,
        verified_only: bool,
    ) -> tuple[list[dict], int]:
        conditions = [
            "r.product_id = $1",
            "r.is_approved = TRUE",
        ]
        params: list = [product_id]
        i = 2

        if rating_filter:
            conditions.append(f"r.rating = ${i}")
            params.append(rating_filter)
            i += 1

        if verified_only:
            conditions.append("r.is_verified_purchase = TRUE")

        where = "WHERE " + " AND ".join(conditions)
        offset = (page - 1) * per_page

        count = await self.db.fetchval(
            f"SELECT COUNT(*) FROM product_reviews r {where}", *params,
        )

        rows = await self.db.fetch(
            f"""
            SELECT
                r.id, r.product_id, r.user_id, r.order_id,
                r.rating, r.title, r.comment,
                r.is_verified_purchase, r.is_approved,
                r.helpful_count,
                r.created_at::TEXT AS created_at,
                CONCAT(u.first_name, ' ', u.last_name) AS reviewer_name
            FROM product_reviews r
            JOIN users u ON u.id = r.user_id
            {where}
            ORDER BY r.helpful_count DESC, r.created_at DESC
            LIMIT ${i} OFFSET ${i+1}
            """,
            *params, per_page, offset,
        )
        return [dict(r) for r in rows], count

    async def get_rating_breakdown(self, product_id: int) -> dict:
        """
        Returns count per star (1-5) for rating histogram.
        Example: { 5: 42, 4: 18, 3: 5, 2: 2, 1: 1 }
        """
        rows = await self.db.fetch(
            """
            SELECT rating, COUNT(*) AS count
            FROM product_reviews
            WHERE product_id = $1 AND is_approved = TRUE
            GROUP BY rating
            ORDER BY rating DESC
            """,
            product_id,
        )
        breakdown = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
        for row in rows:
            breakdown[row["rating"]] = row["count"]
        return breakdown

    async def create_review(self, data: dict) -> dict:
        row = await self.db.fetchrow(
            """
            INSERT INTO product_reviews
                (product_id, user_id, order_id, rating, title,
                 comment, is_verified_purchase, is_approved)
            VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
            RETURNING id, product_id, user_id, order_id, rating,
                      title, comment, is_verified_purchase,
                      is_approved, helpful_count, created_at::TEXT AS created_at
            """,
            data["product_id"], data["user_id"], data["order_id"],
            data["rating"], data.get("title"), data.get("comment"),
            data["is_verified_purchase"],
        )
        return dict(row)

    async def update_review(self, review_id: int, fields: dict) -> dict | None:
        if not fields:
            return await self.get_review_by_id(review_id)
        set_clauses = [f"{col} = ${i+2}" for i, col in enumerate(fields.keys())]
        row = await self.db.fetchrow(
            f"""
            UPDATE product_reviews
            SET {', '.join(set_clauses)}, is_approved = FALSE
            WHERE id = $1
            RETURNING id, product_id, user_id, order_id, rating,
                      title, comment, is_verified_purchase,
                      is_approved, helpful_count, created_at::TEXT AS created_at
            """,
            review_id, *list(fields.values()),
        )
        return dict(row) if row else None

    async def approve_review(self, review_id: int) -> bool:
        result = await self.db.execute(
            "UPDATE product_reviews SET is_approved = TRUE WHERE id = $1",
            review_id,
        )
        return result == "UPDATE 1"

    async def delete_review(self, review_id: int) -> bool:
        result = await self.db.execute(
            "DELETE FROM product_reviews WHERE id = $1", review_id,
        )
        return result == "DELETE 1"

    async def mark_helpful(self, review_id: int) -> None:
        await self.db.execute(
            "UPDATE product_reviews SET helpful_count = helpful_count + 1 WHERE id = $1",
            review_id,
        )

    async def get_pending_reviews(self, page: int, per_page: int) -> tuple[list[dict], int]:
        """Admin: fetch all unapproved reviews."""
        offset = (page - 1) * per_page
        count = await self.db.fetchval(
            "SELECT COUNT(*) FROM product_reviews WHERE is_approved = FALSE",
        )
        rows = await self.db.fetch(
            """
            SELECT
                r.id, r.product_id, r.user_id, r.rating,
                r.title, r.comment, r.is_verified_purchase,
                r.created_at::TEXT AS created_at,
                p.name AS product_name,
                CONCAT(u.first_name, ' ', u.last_name) AS reviewer_name
            FROM product_reviews r
            JOIN products p ON p.id = r.product_id
            JOIN users u    ON u.id = r.user_id
            WHERE r.is_approved = FALSE
            ORDER BY r.created_at ASC
            LIMIT $1 OFFSET $2
            """,
            per_page, offset,
        )
        return [dict(r) for r in rows], count