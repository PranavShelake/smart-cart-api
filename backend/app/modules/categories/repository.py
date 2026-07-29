import asyncpg


class CategoriesRepository:

    def __init__(self, db: asyncpg.Connection):
        self.db = db

    async def slug_exists(self, slug: str, exclude_id: int | None = None) -> bool:
        if exclude_id:
            return await self.db.fetchval(
                "SELECT EXISTS(SELECT 1 FROM category WHERE slug = $1 AND id != $2)",
                slug, exclude_id,
            )
        return await self.db.fetchval(
            "SELECT EXISTS(SELECT 1 FROM category WHERE slug = $1)", slug,
        )

    async def name_exists(self, name: str, exclude_id: int | None = None) -> bool:
        if exclude_id:
            return await self.db.fetchval(
                "SELECT EXISTS(SELECT 1 FROM category WHERE LOWER(name) = LOWER($1) AND id != $2)",
                name, exclude_id,
            )
        return await self.db.fetchval(
            "SELECT EXISTS(SELECT 1 FROM category WHERE LOWER(name) = LOWER($1))", name,
        )

    async def get_by_id(self, category_id: int) -> dict | None:
        row = await self.db.fetchrow(
            """
            SELECT id, name, slug, description, parent_category_id,
                   image_url, display_order, is_active
            FROM category WHERE id = $1
            """,
            category_id,
        )
        return dict(row) if row else None

    async def get_by_slug(self, slug: str) -> dict | None:
        row = await self.db.fetchrow(
            """
            SELECT id, name, slug, description, parent_category_id,
                   image_url, display_order, is_active
            FROM category WHERE slug = $1 AND is_active = TRUE
            """,
            slug,
        )
        return dict(row) if row else None

    async def get_all_active(self) -> list[dict]:
        """
        Fetch all active categories in one query.
        Tree assembly is done in the service layer (Python) —
        avoids a recursive CTE which is harder to read and debug.
        For very large catalogs (1000+ categories), switch to recursive CTE.
        """
        rows = await self.db.fetch(
            """
            SELECT id, name, slug, description, parent_category_id,
                   image_url, display_order, is_active
            FROM category
            WHERE is_active = TRUE
            ORDER BY display_order ASC, name ASC
            """,
        )
        return [dict(r) for r in rows]

    async def get_top_level(self) -> list[dict]:
        rows = await self.db.fetch(
            """
            SELECT id, name, slug, description, image_url, display_order
            FROM category
            WHERE parent_category_id IS NULL AND is_active = TRUE
            ORDER BY display_order ASC, name ASC
            """,
        )
        return [dict(r) for r in rows]

    async def get_children(self, parent_id: int) -> list[dict]:
        rows = await self.db.fetch(
            """
            SELECT id, name, slug, description, image_url, display_order
            FROM category
            WHERE parent_category_id = $1 AND is_active = TRUE
            ORDER BY display_order ASC, name ASC
            """,
            parent_id,
        )
        return [dict(r) for r in rows]

    async def get_breadcrumb(self, category_id: int) -> list[dict]:
        """
        Recursive CTE to get full breadcrumb path for a category.
        e.g. Electronics → Smartphones
        WHY CTE? Self-referential traversal in a single query — no N+1 loops.
        """
        rows = await self.db.fetch(
            """
            WITH RECURSIVE breadcrumb AS (
                SELECT id, name, slug, parent_category_id, 1 AS depth
                FROM category
                WHERE id = $1

                UNION ALL

                SELECT c.id, c.name, c.slug, c.parent_category_id, b.depth + 1
                FROM category c
                INNER JOIN breadcrumb b ON c.id = b.parent_category_id
            )
            SELECT id, name, slug FROM breadcrumb
            ORDER BY depth DESC
            """,
            category_id,
        )
        return [dict(r) for r in rows]

    async def create(self, data: dict) -> dict:
        row = await self.db.fetchrow(
            """
            INSERT INTO category
                (name, slug, description, parent_category_id, image_url, display_order, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, name, slug, description, parent_category_id,
                      image_url, display_order, is_active
            """,
            data["name"], data["slug"], data.get("description"),
            data.get("parent_category_id"), data.get("image_url"),
            data.get("display_order", 0), data.get("is_active", True),
        )
        return dict(row)

    async def update(self, category_id: int, fields: dict) -> dict | None:
        if not fields:
            return await self.get_by_id(category_id)

        set_clauses = [f"{col} = ${i+2}" for i, col in enumerate(fields.keys())]
        row = await self.db.fetchrow(
            f"""
            UPDATE category
            SET {', '.join(set_clauses)}
            WHERE id = $1
            RETURNING id, name, slug, description, parent_category_id,
                      image_url, display_order, is_active
            """,
            category_id, *list(fields.values()),
        )
        return dict(row) if row else None

    async def has_products(self, category_id: int) -> bool:
        return await self.db.fetchval(
            "SELECT EXISTS(SELECT 1 FROM products WHERE category_id = $1 AND is_active = TRUE)",
            category_id,
        )

    async def has_children(self, category_id: int) -> bool:
        return await self.db.fetchval(
            "SELECT EXISTS(SELECT 1 FROM category WHERE parent_category_id = $1)",
            category_id,
        )

    async def soft_delete(self, category_id: int) -> bool:
        result = await self.db.execute(
            "UPDATE category SET is_active = FALSE WHERE id = $1", category_id,
        )
        return result == "UPDATE 1"