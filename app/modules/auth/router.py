# ============================================================
# app/modules/auth/router.py
#
# Route Layer — HTTP concerns only.
#
# Rules for this file:
#   ✅ Parse request data
#   ✅ Call service methods
#   ✅ Set/clear cookies
#   ✅ Return formatted HTTP responses
#   ❌ Never write business logic
#   ❌ Never write SQL
#   ❌ Never hash passwords or generate tokens
#
# COOKIE STRATEGY:
#   Refresh token → HTTP-only cookie (JS cannot read it)
#   Access token  → JSON response body (React stores in memory)
# ============================================================

from fastapi import APIRouter, Depends, Request, Response
import asyncpg

from app.modules.auth.schemas import (
    RegisterRequest,
    LoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
    TokenResponse,
    RegisterResponse,
    MessageResponse,
)
from app.modules.auth.service import AuthService
from app.core.dependencies import get_current_user, TokenData
from app.core.exceptions import RefreshTokenMissingException
from app.database import get_db
from app.utils.response import success_response
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

# ── Cookie config ─────────────────────────────────────────
REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_MAX_AGE = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60  # seconds


def _set_refresh_cookie(response: Response, token: str) -> None:
    """
    Set the refresh token as an HTTP-only cookie.

    http_only=True   → JavaScript CANNOT access this cookie (XSS protection)
    secure=True      → Cookie only sent over HTTPS (set False for local dev)
    samesite="lax"   → Prevents CSRF on cross-origin requests
                        "strict" blocks OAuth redirects; "lax" is a safe middle ground
    """
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        max_age=REFRESH_COOKIE_MAX_AGE,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/api/v1/auth",    # Cookie ONLY sent to /api/v1/auth/* routes
                                # Not sent with product/cart requests — reduces attack surface
    )


def _clear_refresh_cookie(response: Response) -> None:
    """Clear the refresh token cookie on logout."""
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path="/api/v1/auth",
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )


def _get_client_info(request: Request) -> tuple[str | None, str | None]:
    """Extract IP address and User-Agent for audit logging."""
    ip = request.client.host if request.client else None
    # X-Forwarded-For: real IP when behind a reverse proxy (Nginx, AWS ALB)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        ip = forwarded_for.split(",")[0].strip()
    device_info = request.headers.get("User-Agent", "")[:255]
    return ip, device_info


# ============================================================
# ENDPOINTS
# ============================================================

@router.post(
    "/register",
    status_code=201,
    summary="Register a new account",
    description="Create a new customer account. Returns user ID and a verification token (DEV only).",
)
async def register(
    data: RegisterRequest,
    db: asyncpg.Connection = Depends(get_db),
):
    """
    POST /api/v1/auth/register

    Body: { email, password, first_name, last_name, phone?, date_of_birth? }
    Returns: { user_id, message }
    """
    service = AuthService(db)
    result = await service.register(data)

    return success_response(
        data={
            "user_id": result["user_id"],
            # Only expose verification token in DEBUG mode
            **({"verification_token": result["_dev_verification_token"]}
               if settings.DEBUG and result.get("_dev_verification_token")
               else {}),
        },
        message=result["message"],
        status_code=201,
    )

@router.post("/login")
async def login(
    data: LoginRequest,
    request: Request,
    response: Response,
    db: asyncpg.Connection = Depends(get_db),
):
    ip, device_info = _get_client_info(request)
    service = AuthService(db)
    result = await service.login(data, ip_address=ip, device_info=device_info)

    # ✅ Build the JSONResponse first, then set cookie ON it directly
    json_response = success_response(
        data={
            "access_token": result["access_token"],
            "token_type": "bearer",
            "expires_in": result["expires_in"],
            "user": result["user"],
        },
        message="Login successful.",
    )
    _set_refresh_cookie(json_response, result["refresh_token"])
    return json_response


@router.post("/refresh")
async def refresh_token(
    request: Request,
    response: Response,
    db: asyncpg.Connection = Depends(get_db),
):
    raw_refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not raw_refresh_token:
        raise RefreshTokenMissingException()

    service = AuthService(db)
    result = await service.refresh_access_token(raw_refresh_token)

    # ✅ Same fix
    json_response = success_response(
        data={
            "access_token": result["access_token"],
            "token_type": "bearer",
            "expires_in": result["expires_in"],
        },
        message="Token refreshed successfully.",
    )
    _set_refresh_cookie(json_response, result["refresh_token"])
    return json_response

@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: asyncpg.Connection = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    raw_refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if raw_refresh_token:
        service = AuthService(db)
        await service.logout(raw_refresh_token)

    # ✅ Same fix
    json_response = success_response(message="Logged out successfully.")
    _clear_refresh_cookie(json_response)
    return json_response


@router.post("/logout-all")
async def logout_all_devices(
    response: Response,
    db: asyncpg.Connection = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    service = AuthService(db)
    await service.logout_all_devices(current_user.user_id)

    # ✅ Same fix
    json_response = success_response(message="Logged out from all devices successfully.")
    _clear_refresh_cookie(json_response)
    return json_response

@router.post(
    "/verify-email",
    summary="Verify email address",
    description="Verify email using the token sent to the user's inbox.",
)
async def verify_email(
    data: VerifyEmailRequest,
    db: asyncpg.Connection = Depends(get_db),
):
    """
    POST /api/v1/auth/verify-email

    Body: { token }
    Returns: { message }
    """
    service = AuthService(db)
    await service.verify_email(data.token)

    return success_response(message="Email verified successfully. You can now log in.")


@router.post(
    "/forgot-password",
    summary="Request password reset",
    description="Send a password reset link to the given email address.",
)
async def forgot_password(
    data: ForgotPasswordRequest,
    db: asyncpg.Connection = Depends(get_db),
):
    """
    POST /api/v1/auth/forgot-password

    Body: { email }
    Returns: { message }  ← Always the same message (security: no email enumeration)
    """
    service = AuthService(db)
    result = await service.forgot_password(data.email)

    response_data = {}
    if settings.DEBUG and result.get("_dev_reset_token"):
        response_data["reset_token"] = result["_dev_reset_token"]

    return success_response(
        data=response_data if response_data else None,
        message="If an account with that email exists, a password reset link has been sent.",
    )


@router.post(
    "/reset-password",
    summary="Reset password using token",
    description="Set a new password using the reset token from the email link.",
)
async def reset_password(
    data: ResetPasswordRequest,
    db: asyncpg.Connection = Depends(get_db),
):
    """
    POST /api/v1/auth/reset-password

    Body: { token, new_password, confirm_password }
    Returns: { message }
    """
    service = AuthService(db)
    await service.reset_password(data.token, data.new_password)

    return success_response(
        message="Password reset successfully. Please log in with your new password.",
    )


@router.get(
    "/me",
    summary="Get current user info",
    description="Returns the authenticated user's basic info from their JWT claims.",
)
async def get_me(
    current_user: TokenData = Depends(get_current_user),
):
    """
    GET /api/v1/auth/me

    Requires: Authorization: Bearer <access_token>
    Returns: { user_id, email, roles }

    NOTE: This is a lightweight endpoint using JWT claims only (no DB call).
    For full profile info (name, phone, addresses), use GET /api/v1/users/me
    """
    return success_response(
        data={
            "user_id": current_user.user_id,
            "email": current_user.email,
            "roles": current_user.roles,
        },
        message="Authenticated.",
    )