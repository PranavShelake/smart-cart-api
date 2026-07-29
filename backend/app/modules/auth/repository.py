# ============================================================
# app/modules/auth/repository.py
#
# Repository Layer — The ONLY place that touches the database.
#
# Rules for this file:
#   ✅ Raw SQL queries only (no ORM, no business logic)
#   ✅ Returns dicts or None (never raises business exceptions)
#   ✅ Uses parameterized queries (ALWAYS — never f-string SQL)
#   ❌ Never validates business rules ("is email taken?" → service does that)
#   ❌ Never hashes passwords or generates tokens (security.py does that)
#
# PARAMETERIZED QUERIES: We use $1, $2, $3 placeholders (asyncpg style).
#   NEVER: f"SELECT * FROM users WHERE email = '{email}'"  ← SQL INJECTION
#   ALWAYS: "SELECT * FROM users WHERE email = $1", email   ← SAFE
# ============================================================

import asyncpg
from datetime import datetime


class AuthRepository:

    def __init__(self, db: asyncpg.Connection):
        self.db = db

    # ──────────────────────────────────────────────────────
    # USER QUERIES
    # ──────────────────────────────────────────────────────

    async def get_user_by_email(self, email: str) -> dict | None:
        """
        Fetch user with their roles in a SINGLE query using our
        get_user_with_roles() DB function (created in phase1_auth_migration.sql).

        WHY a DB function instead of JOIN here?
            The function returns roles as a TEXT ARRAY, which asyncpg
            handles natively. Avoids duplicate user rows from JOIN + GROUP BY
            at the Python level.
        """
        row = await self.db.fetchrow(
            "SELECT * FROM get_user_with_roles($1)",
            email.lower().strip(),
        )
        return dict(row) if row else None

    async def get_user_by_id(self, user_id: int) -> dict | None:
        """
        Fetch user by ID with their roles.
        Used by get_current_user dependency to validate token subjects.
        """
        row = await self.db.fetchrow(
            """
            SELECT
                u.id,
                u.email,
                u.first_name,
                u.last_name,
                u.phone,
                u.is_active,
                u.soft_delete,
                ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL) AS roles
            FROM users u
            LEFT JOIN user_role ur ON ur.user_id = u.id AND ur.is_active = TRUE
            LEFT JOIN roles r ON r.id = ur.role_id AND r.is_active = TRUE
            WHERE u.id = $1
            GROUP BY u.id
            """,
            user_id,
        )
        return dict(row) if row else None

    async def email_exists(self, email: str) -> bool:
        """
        Fast existence check — uses the index on users.email.
        Returns bool so service layer can decide what to do.
        """
        result = await self.db.fetchval(
            "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)",
            email.lower().strip(),
        )
        return result

    async def create_user(
        self,
        email: str,
        password_hash: str,
        first_name: str,
        last_name: str,
        phone: str | None,
        date_of_birth,
    ) -> dict:
        """
        Insert a new user and return the created row.
        RETURNING * gives us the new record in one round-trip (no extra SELECT needed).
        """
        row = await self.db.fetchrow(
            """
            INSERT INTO users (email, password_hash, first_name, last_name, phone, date_of_birth)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, email, first_name, last_name, phone, is_active, created_at
            """,
            email.lower().strip(),
            password_hash,
            first_name.strip(),
            last_name.strip(),
            phone,
            date_of_birth,
        )
        return dict(row)

    async def assign_role(self, user_id: int, role_name: str) -> None:
        """
        Assign a role to a user.
        ON CONFLICT DO NOTHING makes this idempotent (safe to call twice).
        """
        await self.db.execute(
            """
            INSERT INTO user_role (user_id, role_id)
            SELECT $1, r.id
            FROM roles r
            WHERE r.name = $2 AND r.is_active = TRUE
            ON CONFLICT (user_id, role_id) DO NOTHING
            """,
            user_id,
            role_name,
        )

    async def update_last_login(self, user_id: int) -> None:
        """
        Update last_login timestamp on successful authentication.
        Useful for: "Last seen 2 hours ago" in admin panel, security audits.
        """
        await self.db.execute(
            "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1",
            user_id,
        )

    # ──────────────────────────────────────────────────────
    # REFRESH TOKEN QUERIES
    # ──────────────────────────────────────────────────────

    async def store_refresh_token(
        self,
        user_id: int,
        token_hash: str,
        expires_at: datetime,
        device_info: str | None = None,
        ip_address: str | None = None,
    ) -> None:
        """
        Store a new refresh token hash in the DB.
        We store the HASH, never the raw token value.
        """
        await self.db.execute(
            """
            INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_info, ip_address)
            VALUES ($1, $2, $3, $4, $5)
            """,
            user_id,
            token_hash,
            expires_at,
            device_info,
            ip_address,
        )

    async def get_refresh_token(self, token_hash: str) -> dict | None:
        """
        Look up a refresh token by its hash.
        Returns None if not found, expired, or revoked.

        WHY check all conditions in SQL instead of Python?
            Single DB round-trip. No risk of checking one condition but not another.
        """
        row = await self.db.fetchrow(
            """
            SELECT id, user_id, is_revoked, expires_at
            FROM refresh_tokens
            WHERE token_hash = $1
              AND is_revoked = FALSE
              AND expires_at > CURRENT_TIMESTAMP
            """,
            token_hash,
        )
        return dict(row) if row else None

    async def revoke_refresh_token(self, token_hash: str) -> None:
        """
        Mark a single refresh token as revoked (logout from current device).
        """
        await self.db.execute(
            "UPDATE refresh_tokens SET is_revoked = TRUE WHERE token_hash = $1",
            token_hash,
        )

    async def revoke_all_user_tokens(self, user_id: int) -> None:
        """
        Revoke ALL refresh tokens for a user.
        Used for: password change, suspicious activity, admin-forced logout.
        This implements "logout from all devices".
        """
        await self.db.execute(
            "UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = $1 AND is_revoked = FALSE",
            user_id,
        )

    async def update_refresh_token_last_used(self, token_hash: str) -> None:
        """Track when a refresh token was last used — useful for session management."""
        await self.db.execute(
            "UPDATE refresh_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE token_hash = $1",
            token_hash,
        )

    # ──────────────────────────────────────────────────────
    # EMAIL VERIFICATION TOKEN QUERIES
    # ──────────────────────────────────────────────────────

    async def store_email_verification_token(
        self, user_id: int, token: str, expires_at: datetime
    ) -> None:
        await self.db.execute(
            """
            INSERT INTO email_verification_tokens (user_id, token, expires_at)
            VALUES ($1, $2, $3)
            """,
            user_id,
            token,
            expires_at,
        )

    async def get_email_verification_token(self, token: str) -> dict | None:
        row = await self.db.fetchrow(
            """
            SELECT id, user_id, is_used, expires_at
            FROM email_verification_tokens
            WHERE token = $1
              AND is_used = FALSE
              AND expires_at > CURRENT_TIMESTAMP
            """,
            token,
        )
        return dict(row) if row else None

    async def mark_email_verification_token_used(self, token_id: int) -> None:
        await self.db.execute(
            "UPDATE email_verification_tokens SET is_used = TRUE WHERE id = $1",
            token_id,
        )

    async def activate_user(self, user_id: int) -> None:
        await self.db.execute(
            "UPDATE users SET is_active = TRUE WHERE id = $1",
            user_id,
        )

    # ──────────────────────────────────────────────────────
    # PASSWORD RESET TOKEN QUERIES
    # ──────────────────────────────────────────────────────

    async def store_password_reset_token(
        self, user_id: int, token: str, expires_at: datetime
    ) -> None:
        # Invalidate any existing unused reset tokens for this user first
        await self.db.execute(
            "UPDATE password_reset_tokens SET is_used = TRUE WHERE user_id = $1 AND is_used = FALSE",
            user_id,
        )
        await self.db.execute(
            """
            INSERT INTO password_reset_tokens (user_id, token, expires_at)
            VALUES ($1, $2, $3)
            """,
            user_id,
            token,
            expires_at,
        )

    async def get_password_reset_token(self, token: str) -> dict | None:
        row = await self.db.fetchrow(
            """
            SELECT id, user_id, is_used, expires_at
            FROM password_reset_tokens
            WHERE token = $1
              AND is_used = FALSE
              AND expires_at > CURRENT_TIMESTAMP
            """,
            token,
        )
        return dict(row) if row else None

    async def mark_password_reset_token_used(self, token_id: int) -> None:
        await self.db.execute(
            "UPDATE password_reset_tokens SET is_used = TRUE WHERE id = $1",
            token_id,
        )

    async def update_password(self, user_id: int, new_password_hash: str) -> None:
        await self.db.execute(
            "UPDATE users SET password_hash = $1 WHERE id = $2",
            new_password_hash,
            user_id,
        )

    # ──────────────────────────────────────────────────────
    # AUDIT LOG QUERIES
    # ──────────────────────────────────────────────────────

    async def log_login_attempt(
        self,
        email_attempted: str,
        status: str,
        user_id: int | None = None,
        ip_address: str | None = None,
        device_info: str | None = None,
        failure_reason: str | None = None,
    ) -> None:
        """
        Log every login attempt. Never let this fail silently.
        Wrapped in try/except so audit log errors don't break the login flow.
        """
        try:
            await self.db.execute(
                """
                INSERT INTO user_login_audit
                    (user_id, email_attempted, ip_address, device_info, status, failure_reason)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                user_id,
                email_attempted.lower().strip(),
                ip_address,
                device_info,
                status,
                failure_reason,
            )
        except Exception:
            # Audit log failure must NOT break auth flow
            pass