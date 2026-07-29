# ============================================================
# app/core/dependencies.py
#
# FastAPI Dependency Injection — the "middleware" for routes.
#
# WHY Depends() instead of middleware?
#   - Middleware runs on EVERY request (even public routes)
#   - Depends() runs only on routes that declare it
#   - Depends() can be composed and tested independently
#   - You can inject different dependencies in tests (mock DB, mock user)
#
# USAGE in routes:
#   # Any authenticated user:
#   async def route(current_user = Depends(get_current_user)):
#
#   # Only admins:
#   async def route(current_user = Depends(require_admin)):
#
#   # Only sellers:
#   async def route(current_user = Depends(require_seller)):
# ============================================================

from fastapi import Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.security import decode_access_token
from app.core.exceptions import (
    TokenInvalidException,
    InsufficientPermissionsException,
)


# ── Bearer Token Extractor ────────────────────────────────
# HTTPBearer reads the Authorization: Bearer <token> header.
# auto_error=False means it returns None instead of raising 403
# when the header is missing — we handle that ourselves for better messages.

_bearer_scheme = HTTPBearer(auto_error=False)


# ── Token payload dataclass ───────────────────────────────
# WHY a dataclass instead of a raw dict?
#   - Type hints → IDE autocomplete for current_user.user_id, current_user.roles
#   - Validates structure at decode time, not at usage time

class TokenData:
    def __init__(self, user_id: int, email: str, roles: list[str]):
        self.user_id = user_id
        self.email = email
        self.roles = roles

    def has_role(self, role: str) -> bool:
        return role in self.roles

    def is_admin(self) -> bool:
        return "ADMIN" in self.roles

    def is_seller(self) -> bool:
        return "SELLER" in self.roles


# ── Core Dependency: get_current_user ─────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> TokenData:
    """
    Extracts and validates the JWT access token from the Authorization header.
    Returns TokenData with user_id, email, and roles.

    Raises TokenInvalidException if token is missing or invalid.
    Raises TokenExpiredException if token has expired.

    This dependency is the ONLY way routes know who the user is.
    No route should ever manually parse tokens.
    """
    if credentials is None:
        raise TokenInvalidException()

    payload = decode_access_token(credentials.credentials)

    # Extract claims — decode_access_token guarantees these exist
    try:
        user_id = int(payload["sub"])
        email: str = payload["email"]
        roles: list[str] = payload.get("roles", [])
    except (KeyError, ValueError):
        raise TokenInvalidException()

    return TokenData(user_id=user_id, email=email, roles=roles)


# ── Role-Gated Dependencies ───────────────────────────────

async def require_admin(
    current_user: TokenData = Depends(get_current_user),
) -> TokenData:
    """Dependency that requires ADMIN role."""
    if not current_user.is_admin():
        raise InsufficientPermissionsException(required_role="ADMIN")
    return current_user


async def require_seller(
    current_user: TokenData = Depends(get_current_user),
) -> TokenData:
    """Dependency that requires SELLER role."""
    if not current_user.is_seller() and not current_user.is_admin():
        raise InsufficientPermissionsException(required_role="SELLER")
    return current_user


# ── Optional Auth (for public routes that behave differently when logged in) ──
# Example: Product listing is public, but shows "in wishlist" indicator if logged in

async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> TokenData | None:
    """
    Returns TokenData if a valid token is present, or None if not authenticated.
    Does NOT raise an exception for missing token — used on public routes.
    """
    if credentials is None:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload["sub"])
        email: str = payload["email"]
        roles: list[str] = payload.get("roles", [])
        return TokenData(user_id=user_id, email=email, roles=roles)
    except Exception:
        return None