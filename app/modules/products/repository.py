import asyncpg
from decimal import Decimal


class ProductsRepository:

    def __init__(self, db: asyncpg.Connection):
        self.db = db

    # ── Existence checks ──────────────────────────────────

    async def slug_exists(self, slug: str, exclude_id: int | None = None) -> bool:
        if exclude_id:
            return await self.db.fetchval(
                "SELECT EXISTS(SELECT 1 FROM products WHERE slug=$1 AND id!=$2)",
                slug, exclude_id,
            )
        return await self.db.fetchval(
            "SELECT EXISTS(SELECT 1 FROM products WHERE slug=$1)", slug,
        )

    async def sku_exists(self, sku: str, exclude_id: int | None = None) -> bool:
        if exclude_id:
            return await self.db.fetchval(
                "SELECT EXISTS(SELECT 1 FROM products WHERE sku=$1 AND id!=$2)",
                sku, exclude_id,
            )
        return await self.db.fetchval(
            "SELECT EXISTS(SELECT 1 FROM products WHERE sku=$1)", sku,
        )

    async def variant_sku_exists(self, sku: str, exclude_id: int | None = None) -> bool:
        if exclude_id:
            return await self.db.fetchval(
                "SELECT EXISTS(SELECT 1 FROM product_variants WHERE sku=$1 AND id!=$2)",
                sku, exclude_id,
            )
        return await self.db.fetchval(
            "SELECT EXISTS(SELECT 1 FROM product_variants WHERE sku=$1)", sku,
        )

    # ── Product CRUD ──────────────────────────────────────

    async def get_by_id(self, product_id: int) -> dict | None:
        row = await self.db.fetchrow(
            """
            SELECT id, name, slug, category_id, sku, price, compare_at_price,
                   cost_per_item, description, short_description, stock,
                   low_stock_threshold, weight, is_active, is_featured,
                   average_rating, total_reviews, total_sales
            FROM products WHERE id = $1 AND is_active = TRUE
            """,
            product_id,
        )
        return dict(row) if row else None

    async def get_by_slug(self, slug: str) -> dict | None:
        row = await self.db.fetchrow(
            """
            SELECT id, name, slug, category_id, sku, price, compare_at_price,
                   description, short_description, stock, low_stock_threshold,
                   is_active, is_featured, average_rating, total_reviews, total_sales
            FROM products WHERE slug = $1 AND is_active = TRUE
            """,
            slug,
        )
        return dict(row) if row else None

    async def list_products(self, filters: dict) -> tuple[list[dict], int]:
        """
        Dynamic product listing with search, filters, sort, and pagination.

        WHY offset pagination here (not cursor)?
            Products listing with filters makes cursor-based pagination
            complex — offset is acceptable for catalog browsing.
            Cursor pagination is used for high-volume feeds (orders, activity).
        """
        conditions = ["p.is_active = TRUE"]
        params: list = []
        i = 1

        # Full-text search using PostgreSQL ILIKE (simple, no tsvector setup needed yet)
        # In Phase 6, upgrade to tsvector for proper full-text search
        if filters.get("search"):
            conditions.append(f"(p.name ILIKE ${i} OR p.description ILIKE ${i})")
            params.append(f"%{filters['search']}%")
            i += 1

        if filters.get("category_id"):
            conditions.append(f"p.category_id = ${i}")
            params.append(filters["category_id"])
            i += 1

        if filters.get("min_price") is not None:
            conditions.append(f"p.price >= ${i}")
            params.append(filters["min_price"])
            i += 1

        if filters.get("max_price") is not None:
            conditions.append(f"p.price <= ${i}")
            params.append(filters["max_price"])
            i += 1

        if filters.get("is_featured") is not None:
            conditions.append(f"p.is_featured = ${i}")
            params.append(filters["is_featured"])
            i += 1

        if filters.get("in_stock"):
            conditions.append("p.stock > 0")

        where_clause = " AND ".join(conditions)

        # Sort mapping — whitelist prevents SQL injection via sort param
        sort_map = {
            "created_at_desc": "p.created_at DESC",
            "created_at_asc":  "p.created_at ASC",
            "price_asc":       "p.price ASC",
            "price_desc":      "p.price DESC",
            "rating_desc":     "p.average_rating DESC",
            "sales_desc":      "p.total_sales DESC",
        }
        order_by = sort_map.get(filters.get("sort", "created_at_desc"), "p.created_at DESC")

        per_page = filters.get("per_page", 20)
        page = filters.get("page", 1)
        offset = (page - 1) * per_page

        # Total count (for pagination meta)
        count = await self.db.fetchval(
            f"SELECT COUNT(*) FROM products p WHERE {where_clause}", *params,
        )

        # Main query with primary image
        rows = await self.db.fetch(
            f"""
            SELECT
                p.id, p.name, p.slug, p.price, p.compare_at_price,
                p.stock, p.is_featured, p.average_rating, p.total_reviews,
                (
                    SELECT pi.image_url FROM product_images pi
                    WHERE pi.product_id = p.id AND pi.is_primary = TRUE
                    LIMIT 1
                ) AS primary_image
            FROM products p
            WHERE {where_clause}
            ORDER BY {order_by}
            LIMIT ${i} OFFSET ${i+1}
            """,
            *params, per_page, offset,
        )
        return [dict(r) for r in rows], count

    async def create(self, data: dict) -> dict:
        row = await self.db.fetchrow(
            """
            INSERT INTO products
                (name, slug, category_id, sku, price, compare_at_price, cost_per_item,
                 description, short_description, stock, low_stock_threshold,
                 weight, is_active, is_featured)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
            RETURNING id, name, slug, category_id, sku, price, compare_at_price,
                      description, short_description, stock, low_stock_threshold,
                      is_active, is_featured, average_rating, total_reviews, total_sales
            """,
            data["name"], data["slug"], data.get("category_id"), data.get("sku"),
            data["price"], data.get("compare_at_price"), data.get("cost_per_item"),
            data.get("description"), data.get("short_description"),
            data.get("stock", 0), data.get("low_stock_threshold", 10),
            data.get("weight"), data.get("is_active", True), data.get("is_featured", False),
        )
        return dict(row)

    async def update(self, product_id: int, fields: dict) -> dict | None:
        if not fields:
            return await self.get_by_id(product_id)
        set_clauses = [f"{col} = ${i+2}" for i, col in enumerate(fields.keys())]
        row = await self.db.fetchrow(
            f"""
            UPDATE products SET {', '.join(set_clauses)}
            WHERE id = $1
            RETURNING id, name, slug, category_id, sku, price, compare_at_price,
                      description, short_description, stock, low_stock_threshold,
                      is_active, is_featured, average_rating, total_reviews, total_sales
            """,
            product_id, *list(fields.values()),
        )
        return dict(row) if row else None

    async def soft_delete(self, product_id: int) -> bool:
        result = await self.db.execute(
            "UPDATE products SET is_active = FALSE WHERE id = $1", product_id,
        )
        return result == "UPDATE 1"

    # ── Variants ──────────────────────────────────────────

    async def get_variants(self, product_id: int) -> list[dict]:
        rows = await self.db.fetch(
            """
            SELECT id, sku, variant_name, size, color, material,
                   price, compare_at_price, stock, weight, is_active
            FROM product_variants
            WHERE product_id = $1
            ORDER BY id ASC
            """,
            product_id,
        )
        return [dict(r) for r in rows]

    async def get_variant_by_id(self, variant_id: int, product_id: int) -> dict | None:
        row = await self.db.fetchrow(
            """
            SELECT id, sku, variant_name, size, color, material,
                   price, compare_at_price, stock, is_active
            FROM product_variants WHERE id = $1 AND product_id = $2
            """,
            variant_id, product_id,
        )
        return dict(row) if row else None

    async def create_variant(self, product_id: int, data: dict) -> dict:
        row = await self.db.fetchrow(
            """
            INSERT INTO product_variants
                (product_id, sku, variant_name, size, color, material,
                 price, compare_at_price, stock, weight, is_active)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            RETURNING id, sku, variant_name, size, color, material,
                      price, compare_at_price, stock, is_active
            """,
            product_id, data["sku"], data.get("variant_name"),
            data.get("size"), data.get("color"), data.get("material"),
            data["price"], data.get("compare_at_price"),
            data.get("stock", 0), data.get("weight"), data.get("is_active", True),
        )
        return dict(row)

    async def update_variant(self, variant_id: int, product_id: int, fields: dict) -> dict | None:
        if not fields:
            return await self.get_variant_by_id(variant_id, product_id)
        set_clauses = [f"{col} = ${i+3}" for i, col in enumerate(fields.keys())]
        row = await self.db.fetchrow(
            f"""
            UPDATE product_variants SET {', '.join(set_clauses)}
            WHERE id = $1 AND product_id = $2
            RETURNING id, sku, variant_name, size, color, material,
                      price, compare_at_price, stock, is_active
            """,
            variant_id, product_id, *list(fields.values()),
        )
        return dict(row) if row else None

    async def delete_variant(self, variant_id: int, product_id: int) -> bool:
        result = await self.db.execute(
            "DELETE FROM product_variants WHERE id = $1 AND product_id = $2",
            variant_id, product_id,
        )
        return result == "DELETE 1"

    # ── Images ────────────────────────────────────────────

    async def get_images(self, product_id: int) -> list[dict]:
        rows = await self.db.fetch(
            """
            SELECT id, image_url, alt_text, is_primary, display_order
            FROM product_images
            WHERE product_id = $1
            ORDER BY is_primary DESC, display_order ASC
            """,
            product_id,
        )
        return [dict(r) for r in rows]

    async def unset_primary_image(self, product_id: int) -> None:
        await self.db.execute(
            "UPDATE product_images SET is_primary = FALSE WHERE product_id = $1",
            product_id,
        )

    async def create_image(self, product_id: int, data: dict) -> dict:
        row = await self.db.fetchrow(
            """
            INSERT INTO product_images (product_id, image_url, alt_text, is_primary, display_order)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, image_url, alt_text, is_primary, display_order
            """,
            product_id, data["image_url"], data.get("alt_text"),
            data.get("is_primary", False), data.get("display_order", 0),
        )
        return dict(row)

    async def delete_image(self, image_id: int, product_id: int) -> bool:
        result = await self.db.execute(
            "DELETE FROM product_images WHERE id = $1 AND product_id = $2",
            image_id, product_id,
        )
        return result == "DELETE 1"

    async def image_count(self, product_id: int) -> int:
        return await self.db.fetchval(
            "SELECT COUNT(*) FROM product_images WHERE product_id = $1", product_id,
        )