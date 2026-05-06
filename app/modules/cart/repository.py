import asyncpg


class CartRepository:

    def __init__(self, db: asyncpg.Connection):
        self.db = db

    # ── Cart ──────────────────────────────────────────────────

    async def get_or_create_cart(self, user_id: int) -> int:
        """
        Returns the cart_id for a user.
        Creates one if it doesn't exist.
        WHY UPSERT? Cart is created lazily — only when user first adds an item.
        INSERT ... ON CONFLICT avoids a race condition between two simultaneous
        "add to cart" requests both trying to create a cart.
        """
        row = await self.db.fetchrow(
            """
            INSERT INTO cart (user_id)
            VALUES ($1)
            ON CONFLICT (user_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
            RETURNING id
            """,
            user_id,
        )
        return row["id"]

    async def get_cart_id(self, user_id: int) -> int | None:
        return await self.db.fetchval(
            "SELECT id FROM cart WHERE user_id = $1", user_id,
        )

    # ── Cart items ────────────────────────────────────────────

    async def get_cart_items(self, cart_id: int) -> list[dict]:
        """
        Fetch all cart items with product + variant details and LIVE price.
        price_snapshot = price locked when item was added.
        current_price  = live price from products/variants table.
        Frontend uses price_changed flag to warn the user.
        """
        rows = await self.db.fetch(
            """
            SELECT
                ci.id,
                ci.product_id,
                ci.product_variant_id,
                ci.quantity,
                ci.price_snapshot,
                p.name                      AS product_name,
                p.is_active                 AS product_active,

                -- Live price: variant price if variant selected, else product price
                COALESCE(pv.price, p.price) AS current_price,

                -- Variant label e.g. "Black / 128GB"
                CASE
                    WHEN pv.id IS NOT NULL THEN
                        TRIM(BOTH ' / ' FROM
                            COALESCE(pv.color, '') || ' / ' || COALESCE(pv.size, '')
                        )
                    ELSE NULL
                END                         AS variant_label,

                -- Primary image
                (
                    SELECT pi.image_url FROM product_images pi
                    WHERE pi.product_id = p.id AND pi.is_primary = TRUE
                    LIMIT 1
                )                           AS primary_image,

                -- Stock check
                COALESCE(pv.stock, p.stock) AS available_stock,
                COALESCE(pv.is_active, TRUE) AS variant_active

            FROM cart_items ci
            JOIN products p         ON p.id = ci.product_id
            LEFT JOIN product_variants pv ON pv.id = ci.product_variant_id
            WHERE ci.cart_id = $1
            ORDER BY ci.created_at ASC
            """,
            cart_id,
        )
        return [dict(r) for r in rows]

    async def get_cart_item(self, cart_id: int, item_id: int) -> dict | None:
        row = await self.db.fetchrow(
            """
            SELECT id, product_id, product_variant_id, quantity, price_snapshot
            FROM cart_items
            WHERE id = $1 AND cart_id = $2
            """,
            item_id, cart_id,
        )
        return dict(row) if row else None

    async def find_existing_item(
        self,
        cart_id: int,
        product_id: int,
        product_variant_id: int | None,
    ) -> dict | None:
        """
        Check if an identical product+variant combo already exists in cart.
        WHY? If user adds same item twice, we INCREMENT quantity instead of
        creating a duplicate row — better UX, correct business logic.
        """
        if product_variant_id:
            row = await self.db.fetchrow(
                """
                SELECT id, quantity FROM cart_items
                WHERE cart_id = $1
                  AND product_id = $2
                  AND product_variant_id = $3
                """,
                cart_id, product_id, product_variant_id,
            )
        else:
            row = await self.db.fetchrow(
                """
                SELECT id, quantity FROM cart_items
                WHERE cart_id = $1
                  AND product_id = $2
                  AND product_variant_id IS NULL
                """,
                cart_id, product_id,
            )
        return dict(row) if row else None

    async def add_item(
        self,
        cart_id: int,
        product_id: int,
        product_variant_id: int | None,
        quantity: int,
        price_snapshot: float,
    ) -> dict:
        row = await self.db.fetchrow(
            """
            INSERT INTO cart_items
                (cart_id, product_id, product_variant_id, quantity, price_snapshot)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, product_id, product_variant_id, quantity, price_snapshot
            """,
            cart_id, product_id, product_variant_id, quantity, price_snapshot,
        )
        return dict(row)

    async def increment_item_quantity(self, item_id: int, increment_by: int) -> None:
        await self.db.execute(
            "UPDATE cart_items SET quantity = quantity + $1 WHERE id = $2",
            increment_by, item_id,
        )

    async def update_item_quantity(self, item_id: int, quantity: int) -> dict | None:
        row = await self.db.fetchrow(
            """
            UPDATE cart_items SET quantity = $1
            WHERE id = $2
            RETURNING id, quantity
            """,
            quantity, item_id,
        )
        return dict(row) if row else None

    async def delete_item(self, item_id: int, cart_id: int) -> bool:
        result = await self.db.execute(
            "DELETE FROM cart_items WHERE id = $1 AND cart_id = $2",
            item_id, cart_id,
        )
        return result == "DELETE 1"

    async def clear_cart(self, cart_id: int) -> None:
        """Remove all items. Used after order is placed."""
        await self.db.execute(
            "DELETE FROM cart_items WHERE cart_id = $1", cart_id,
        )

    # ── Price + stock helpers ─────────────────────────────────

    async def get_current_price(
        self,
        product_id: int,
        product_variant_id: int | None,
    ) -> float | None:
        """
        Fetch the live price for a product/variant.
        Used when adding to cart to capture the price_snapshot.
        """
        if product_variant_id:
            return await self.db.fetchval(
                """
                SELECT pv.price FROM product_variants pv
                WHERE pv.id = $1 AND pv.product_id = $2
                  AND pv.is_active = TRUE
                """,
                product_variant_id, product_id,
            )
        return await self.db.fetchval(
            "SELECT price FROM products WHERE id = $1 AND is_active = TRUE",
            product_id,
        )

    async def get_available_stock(
        self,
        product_id: int,
        product_variant_id: int | None,
    ) -> int | None:
        if product_variant_id:
            return await self.db.fetchval(
                "SELECT stock FROM product_variants WHERE id = $1 AND product_id = $2",
                product_variant_id, product_id,
            )
        return await self.db.fetchval(
            "SELECT stock FROM products WHERE id = $1",
            product_id,
        )

    async def product_exists(self, product_id: int) -> bool:
        return await self.db.fetchval(
            "SELECT EXISTS(SELECT 1 FROM products WHERE id = $1 AND is_active = TRUE)",
            product_id,
        )

    async def variant_belongs_to_product(
        self, variant_id: int, product_id: int
    ) -> bool:
        return await self.db.fetchval(
            """
            SELECT EXISTS(
                SELECT 1 FROM product_variants
                WHERE id = $1 AND product_id = $2 AND is_active = TRUE
            )
            """,
            variant_id, product_id,
        )