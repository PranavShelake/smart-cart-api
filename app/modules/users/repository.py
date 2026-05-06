import asyncpg


class UsersRepository:

    def __init__(self, db: asyncpg.Connection):
        self.db = db

    # ── Profile ───────────────────────────────────────────

    async def get_profile(self, user_id: int) -> dict | None:
        row = await self.db.fetchrow(
            """
            SELECT
                u.id, u.email, u.first_name, u.last_name,
                u.phone, u.date_of_birth, u.is_active,
                COALESCE(ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
            FROM users u
            LEFT JOIN user_role ur ON ur.user_id = u.id AND ur.is_active = TRUE
            LEFT JOIN roles r      ON r.id = ur.role_id  AND r.is_active = TRUE
            WHERE u.id = $1 AND u.soft_delete = FALSE
            GROUP BY u.id
            """,
            user_id,
        )
        return dict(row) if row else None

    async def update_profile(self, user_id: int, fields: dict) -> dict | None:
        """
        Dynamic UPDATE — only updates provided fields.
        Builds SET clause from the fields dict to avoid overwriting untouched columns.
        """
        if not fields:
            return await self.get_profile(user_id)

        set_clauses = [f"{col} = ${i+2}" for i, col in enumerate(fields.keys())]
        values = list(fields.values())

        row = await self.db.fetchrow(
            f"""
            UPDATE users
            SET {', '.join(set_clauses)}
            WHERE id = $1 AND soft_delete = FALSE
            RETURNING id, email, first_name, last_name, phone, date_of_birth, is_active
            """,
            user_id,
            *values,
        )
        return dict(row) if row else None

    # ── Addresses ─────────────────────────────────────────

    async def get_address_count(self, user_id: int) -> int:
        return await self.db.fetchval(
            "SELECT COUNT(*) FROM user_addresses WHERE user_id = $1",
            user_id,
        )

    async def get_addresses(self, user_id: int) -> list[dict]:
        rows = await self.db.fetch(
            """
            SELECT id, address_type, full_name, phone, address_line1, address_line2,
                   city, state, postal_code, country, is_default
            FROM user_addresses
            WHERE user_id = $1
            ORDER BY is_default DESC, id ASC
            """,
            user_id,
        )
        return [dict(r) for r in rows]

    async def get_address_by_id(self, address_id: int, user_id: int) -> dict | None:
        row = await self.db.fetchrow(
            """
            SELECT id, address_type, full_name, phone, address_line1, address_line2,
                   city, state, postal_code, country, is_default
            FROM user_addresses
            WHERE id = $1 AND user_id = $2
            """,
            address_id, user_id,
        )
        return dict(row) if row else None

    async def unset_default_address(self, user_id: int) -> None:
        """Clear existing default before setting a new one — only 1 default allowed."""
        await self.db.execute(
            "UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1",
            user_id,
        )

    async def create_address(self, user_id: int, data: dict) -> dict:
        row = await self.db.fetchrow(
            """
            INSERT INTO user_addresses
                (user_id, address_type, full_name, phone, address_line1, address_line2,
                 city, state, postal_code, country, is_default)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            RETURNING id, address_type, full_name, phone, address_line1, address_line2,
                      city, state, postal_code, country, is_default
            """,
            user_id,
            data["address_type"], data["full_name"], data["phone"],
            data["address_line1"], data.get("address_line2"),
            data["city"], data["state"], data["postal_code"],
            data.get("country", "India"), data.get("is_default", False),
        )
        return dict(row)

    async def update_address(self, address_id: int, user_id: int, data: dict) -> dict | None:
        row = await self.db.fetchrow(
            """
            UPDATE user_addresses
            SET address_type=$3, full_name=$4, phone=$5, address_line1=$6,
                address_line2=$7, city=$8, state=$9, postal_code=$10,
                country=$11, is_default=$12
            WHERE id=$1 AND user_id=$2
            RETURNING id, address_type, full_name, phone, address_line1, address_line2,
                      city, state, postal_code, country, is_default
            """,
            address_id, user_id,
            data["address_type"], data["full_name"], data["phone"],
            data["address_line1"], data.get("address_line2"),
            data["city"], data["state"], data["postal_code"],
            data.get("country", "India"), data.get("is_default", False),
        )
        return dict(row) if row else None

    async def delete_address(self, address_id: int, user_id: int) -> bool:
        result = await self.db.execute(
            "DELETE FROM user_addresses WHERE id = $1 AND user_id = $2",
            address_id, user_id,
        )
        return result == "DELETE 1"

    async def set_default_address(self, address_id: int, user_id: int) -> bool:
        await self.unset_default_address(user_id)
        result = await self.db.execute(
            "UPDATE user_addresses SET is_default = TRUE WHERE id = $1 AND user_id = $2",
            address_id, user_id,
        )
        return result == "UPDATE 1"

    async def get_first_address(self, user_id: int) -> dict | None:
        """After deleting the default, auto-promote the oldest address."""
        row = await self.db.fetchrow(
            "SELECT id FROM user_addresses WHERE user_id = $1 ORDER BY id ASC LIMIT 1",
            user_id,
        )
        return dict(row) if row else None