# ============================================================
# app/modules/auth/service.py
#
# Service Layer — All business logic lives here.
#
# Rules for this file:
#   ✅ Calls repository for DB operations
#   ✅ Calls security.py for hashing/tokens
#   ✅ Raises domain exceptions (from exceptions.py)
#   ✅ Orchestrates multi-step operations (register = validate + insert + assign role + send email)
#   ❌ Never writes raw SQL
#   ❌ Never directly accesses request/response objects
#
# WHY keep service and repository separate?
#   If tomorrow you switch from PostgreSQL to MongoDB,
#   you only rewrite the repository. Service logic is untouched.
# ============================================================

import secrets
from datetime import datetime, timedelta, timezone

import asyncpg
from fastapi import Request

from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import RegisterRequest, LoginRequest
from app.core import security
from app.core.exceptions import (
    EmailAlreadyExistsException,
    InvalidCredentialsException,
    AccountInactiveException,
    AccountDeletedException,
    RefreshTokenRevokedException,
    RefreshTokenMissingException,
    TokenInvalidException,
)
from app.config import settings


class AuthService:

    def __init__(self, db: asyncpg.Connection):
        # Service creates its own repository instance
        # WHY? The repository is just a thin DB wrapper.
        # Service is the one with logic — it stays in control.
        self.repo = AuthRepository(db)

    # ──────────────────────────────────────────────────────
    # REGISTER
    # ──────────────────────────────────────────────────────

    async def register(self, data: RegisterRequest) -> dict:
        """
        Register a new user account.

        Steps:
        1. Check email uniqueness
        2. Hash password (NEVER store plain text)
        3. Insert user into DB
        4. Assign default CUSTOMER role
        5. Create email verification token
        6. Return user info (token sent via email in production)

        NOTE: New users are created with is_active=TRUE in this implementation
        (no email verification gate for portfolio simplicity).
        In production: set is_active=FALSE and require email verification.
        """

        # Step 1: Email uniqueness check
        # WHY check here AND rely on DB UNIQUE constraint?
        #   - DB constraint is the final safety net (handles race conditions)
        #   - Checking here gives a clean, user-friendly error message
        #   - Without this check, a psycopg UniqueViolation would bubble up as a 500
        if await self.repo.email_exists(data.email):
            raise EmailAlreadyExistsException()

        # Step 2: Hash password
        password_hash = security.hash_password(data.password)

        # Step 3: Insert user
        user = await self.repo.create_user(
            email=data.email,
            password_hash=password_hash,
            first_name=data.first_name,
            last_name=data.last_name,
            phone=data.phone,
            date_of_birth=data.date_of_birth,
        )

        # Step 4: Assign CUSTOMER role (every new user is a CUSTOMER by default)
        await self.repo.assign_role(user["id"], "CUSTOMER")

        # Step 5: Email verification token (stored in DB)
        # In production: send this token via email link
        # For portfolio: just store it, expose /verify-email endpoint
        verification_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        await self.repo.store_email_verification_token(
            user_id=user["id"],
            token=verification_token,
            expires_at=expires_at,
        )

        return {
            "user_id": user["id"],
            "message": "Account created successfully. Please verify your email.",
            # In production: send verification_token via email, not in response
            # For dev: return it so you can test /verify-email without email setup
            "_dev_verification_token": verification_token if settings.DEBUG else None,
        }

    # ──────────────────────────────────────────────────────
    # LOGIN
    # ──────────────────────────────────────────────────────

    async def login(
        self,
        data: LoginRequest,
        ip_address: str | None = None,
        device_info: str | None = None,
    ) -> dict:
        """
        Authenticate a user and issue access + refresh tokens.

        Steps:
        1. Fetch user by email (with roles)
        2. Validate account state (not deleted, not inactive)
        3. Verify password
        4. Generate access token + refresh token
        5. Store refresh token hash in DB
        6. Update last_login timestamp
        7. Log audit record
        8. Return access token + user info (refresh token goes in cookie — set in router)
        """

        # Step 1: Fetch user
        user = await self.repo.get_user_by_email(data.email)

        # Step 2a: User not found — use generic error message
        # SECURITY: "User not found" would let attackers know which emails exist.
        # Always use the same error for both "wrong email" and "wrong password".
        if not user:
            await self.repo.log_login_attempt(
                email_attempted=data.email,
                status="FAILED",
                failure_reason="ACCOUNT_NOT_FOUND",
                ip_address=ip_address,
                device_info=device_info,
            )
            raise InvalidCredentialsException()

        # Step 2b: Soft deleted account
        if user["soft_delete"]:
            await self.repo.log_login_attempt(
                email_attempted=data.email,
                status="FAILED",
                user_id=user["id"],
                failure_reason="ACCOUNT_DELETED",
                ip_address=ip_address,
                device_info=device_info,
            )
            raise AccountDeletedException()

        # Step 2c: Inactive account
        if not user["is_active"]:
            await self.repo.log_login_attempt(
                email_attempted=data.email,
                status="FAILED",
                user_id=user["id"],
                failure_reason="ACCOUNT_INACTIVE",
                ip_address=ip_address,
                device_info=device_info,
            )
            raise AccountInactiveException()

        # Step 3: Password verification
        # WHY call verify_password even if user not found?
        #   Timing attacks: if we return immediately on "user not found",
        #   an attacker can measure response time to detect valid emails.
        #   (bcrypt takes ~250ms — noticeable difference vs 0ms for not found)
        #   In production: call a dummy verify to normalize timing.
        if not security.verify_password(data.password, user["password_hash"]):
            await self.repo.log_login_attempt(
                email_attempted=data.email,
                status="FAILED",
                user_id=user["id"],
                failure_reason="WRONG_PASSWORD",
                ip_address=ip_address,
                device_info=device_info,
            )
            raise InvalidCredentialsException()

        # Step 4: Generate tokens
        roles = user["roles"] or ["CUSTOMER"]   # Fallback if roles array is null

        access_token = security.create_access_token(
            user_id=user["id"],
            email=user["email"],
            roles=roles,
        )

        raw_refresh_token = security.generate_refresh_token()
        refresh_token_hash = security.hash_refresh_token(raw_refresh_token)
        refresh_expires_at = security.get_refresh_token_expiry()

        # Step 5: Store refresh token hash
        await self.repo.store_refresh_token(
            user_id=user["id"],
            token_hash=refresh_token_hash,
            expires_at=refresh_expires_at,
            device_info=device_info,
            ip_address=ip_address,
        )

        # Step 6: Update last_login
        await self.repo.update_last_login(user["id"])

        # Step 7: Audit log
        await self.repo.log_login_attempt(
            email_attempted=data.email,
            status="SUCCESS",
            user_id=user["id"],
            ip_address=ip_address,
            device_info=device_info,
        )

        # Step 8: Return data
        # raw_refresh_token goes to router → set as HTTP-only cookie
        return {
            "access_token": access_token,
            "refresh_token": raw_refresh_token,     # Router sets this as cookie
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": {
                "id": user["id"],
                "email": user["email"],
                "first_name": user["first_name"],
                "last_name": user["last_name"],
                "phone": user["phone"],
                "roles": roles,
                "is_active": user["is_active"],
            },
        }

    # ──────────────────────────────────────────────────────
    # REFRESH TOKEN
    # ──────────────────────────────────────────────────────

    async def refresh_access_token(self, raw_refresh_token: str) -> dict:
        """
        Issue a new access token using a valid refresh token.
        Implements REFRESH TOKEN ROTATION:
            - Old refresh token is revoked
            - New refresh token is issued
            - Both access token and refresh token are new

        WHY rotation?
            If a refresh token is stolen and used by an attacker,
            the legitimate user's next refresh will fail (token already rotated),
            alerting them to suspicious activity.
        """

        # Hash the incoming token to look it up in DB
        token_hash = security.hash_refresh_token(raw_refresh_token)

        # Look up token in DB — must be valid, not revoked, not expired
        token_record = await self.repo.get_refresh_token(token_hash)

        if not token_record:
            # Token not found OR expired OR already revoked
            # SECURITY: If the token was already used (revoked), this could be
            # a token reuse attack. In production: alert the user, revoke ALL tokens.
            raise RefreshTokenRevokedException()

        # Fetch user details to build new access token claims
        user = await self.repo.get_user_by_id(token_record["user_id"])

        if not user or user["soft_delete"] or not user["is_active"]:
            raise RefreshTokenRevokedException()

        roles = user["roles"] or ["CUSTOMER"]

        # Generate new tokens (ROTATION)
        new_access_token = security.create_access_token(
            user_id=user["id"],
            email=user["email"],
            roles=roles,
        )

        new_raw_refresh_token = security.generate_refresh_token()
        new_refresh_hash = security.hash_refresh_token(new_raw_refresh_token)
        new_refresh_expires_at = security.get_refresh_token_expiry()

        # Revoke old refresh token
        await self.repo.revoke_refresh_token(token_hash)

        # Store new refresh token
        await self.repo.store_refresh_token(
            user_id=user["id"],
            token_hash=new_refresh_hash,
            expires_at=new_refresh_expires_at,
        )

        return {
            "access_token": new_access_token,
            "refresh_token": new_raw_refresh_token,
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        }

    # ──────────────────────────────────────────────────────
    # LOGOUT
    # ──────────────────────────────────────────────────────

    async def logout(self, raw_refresh_token: str) -> None:
        """
        Revoke the user's current refresh token.
        After this, the refresh token in their cookie is useless.
        """
        token_hash = security.hash_refresh_token(raw_refresh_token)
        await self.repo.revoke_refresh_token(token_hash)

    async def logout_all_devices(self, user_id: int) -> None:
        """Revoke ALL refresh tokens for a user. Logs them out everywhere."""
        await self.repo.revoke_all_user_tokens(user_id)

    # ──────────────────────────────────────────────────────
    # EMAIL VERIFICATION
    # ──────────────────────────────────────────────────────

    async def verify_email(self, token: str) -> None:
        """
        Verify a user's email address using the token sent to their inbox.
        Marks the token as used and activates the account.
        """
        token_record = await self.repo.get_email_verification_token(token)

        if not token_record:
            raise TokenInvalidException()

        # Activate user + mark token as used (atomic in spirit — both happen in same service call)
        await self.repo.activate_user(token_record["user_id"])
        await self.repo.mark_email_verification_token_used(token_record["id"])

    # ──────────────────────────────────────────────────────
    # PASSWORD RESET
    # ──────────────────────────────────────────────────────

    async def forgot_password(self, email: str) -> dict:
        """
        Generate a password reset token for the given email.

        SECURITY: Always return success even if email not found.
        If we returned "email not found", attackers could enumerate registered emails.
        The user sees the same message regardless.
        """
        user = await self.repo.get_user_by_email(email)

        if user and not user["soft_delete"]:
            reset_token = secrets.token_urlsafe(32)
            expires_at = datetime.now(timezone.utc) + timedelta(hours=1)    # 1 hour window

            await self.repo.store_password_reset_token(
                user_id=user["id"],
                token=reset_token,
                expires_at=expires_at,
            )

            # In production: send reset_token via email
            # For dev: return it in response when DEBUG=True
            return {
                "_dev_reset_token": reset_token if settings.DEBUG else None
            }

        return {}

    async def reset_password(self, token: str, new_password: str) -> None:
        """
        Reset password using a valid reset token.
        Also revokes ALL refresh tokens (force re-login everywhere — security best practice).
        """
        token_record = await self.repo.get_password_reset_token(token)

        if not token_record:
            raise TokenInvalidException()

        new_hash = security.hash_password(new_password)

        await self.repo.update_password(token_record["user_id"], new_hash)
        await self.repo.mark_password_reset_token_used(token_record["id"])

        # Security: After password change, invalidate ALL sessions
        # If an attacker changed your password, this kicks them out too
        await self.repo.revoke_all_user_tokens(token_record["user_id"])