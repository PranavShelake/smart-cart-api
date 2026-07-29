# ============================================================
# app/core/security.py
#
# Responsibilities:
#   1. Password hashing and verification (bcrypt)
#   2. JWT access token creation and decoding
#   3. Refresh token generation and hashing
#
# WHY this is a separate module from auth/service.py?
#   Security primitives (hashing, JWT) are pure utility functions.
#   They have no business logic, no DB calls.
#   Keeping them here makes them reusable across modules
#   (e.g., password change in users module also needs hashing).
# ============================================================

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, ExpiredSignatureError, jwt
from passlib.context import CryptContext

from app.config import settings
from app.core.exceptions import TokenExpiredException, TokenInvalidException


# ── Password Hashing ──────────────────────────────────────
# WHY bcrypt?
#   - Adaptive: cost factor slows brute force as hardware improves
#   - Salted automatically: each hash is unique even for same password
#   - Industry standard for password storage
#   - Cost factor 12 = ~250ms on modern hardware (fast enough for UX,
#     slow enough to make bulk cracking impractical)

_pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12,          # Cost factor — increase to 13-14 in future as hardware improves
)


def hash_password(plain_password: str) -> str:
    """
    Hash a plain-text password using bcrypt.
    Returns a hash string that includes the salt.

    The salt is embedded in the hash — you don't store it separately.
    """
    return _pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain-text password against a stored bcrypt hash.
    Returns True if match, False otherwise.

    WHY not compare hashes directly?
        bcrypt includes salt in the hash. You must use the library's
        verify function which extracts salt from the stored hash,
        re-hashes the candidate, and compares. String comparison won't work.
    """
    return _pwd_context.verify(plain_password, hashed_password)


# ── JWT Access Token ──────────────────────────────────────
# STRUCTURE of our JWT payload (claims):
# {
#   "sub":   "42",                        ← subject = user_id (string per JWT spec)
#   "email": "user@example.com",
#   "roles": ["CUSTOMER"],
#   "iat":   1715000000,                  ← issued at (Unix timestamp)
#   "exp":   1715000900,                  ← expires at (iat + 15 min)
# }

def create_access_token(
    user_id: int,
    email: str,
    roles: list[str],
) -> str:
    """
    Create a signed JWT access token.

    WHY short expiry (15 min)?
        Access tokens are sent in every request.
        If stolen (via XSS, log leak, etc.), damage is limited to 15 min.
        After expiry, the client uses the refresh token to get a new one silently.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": str(user_id),            # JWT spec: subject must be a string
        "email": email,
        "roles": roles,
        "iat": now,
        "exp": expire,
        "type": "access",               # Extra safety: reject refresh tokens used as access tokens
    }

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> dict:
    """
    Decode and validate a JWT access token.
    Raises TokenExpiredException or TokenInvalidException — never raw JWTError.

    WHY wrap JWTError?
        Routes should never see library-specific errors.
        Our custom exceptions map cleanly to HTTP responses in the global handler.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )

        # Extra check: reject tokens that aren't access tokens
        if payload.get("type") != "access":
            raise TokenInvalidException()

        return payload

    except ExpiredSignatureError:
        raise TokenExpiredException()
    except JWTError:
        raise TokenInvalidException()


# ── Refresh Token ─────────────────────────────────────────
# Refresh tokens are NOT JWTs. They are:
#   - Cryptographically random 256-bit strings (URL-safe base64)
#   - Stored in the DB as SHA-256 hash (never the raw token)
#   - Sent to client as HTTP-only cookie (JS cannot read them)
#
# WHY not make refresh tokens JWTs too?
#   JWTs are stateless — you can't revoke them before expiry.
#   Refresh tokens MUST be revocable (logout, password change, suspicious activity).
#   Storing them in DB (as hash) allows revocation.

def generate_refresh_token() -> str:
    """
    Generate a cryptographically random refresh token.
    Returns the RAW token (sent to client in cookie).
    """
    return secrets.token_urlsafe(32)    # 32 bytes = 256 bits of entropy


def hash_refresh_token(raw_token: str) -> str:
    """
    SHA-256 hash the refresh token for DB storage.

    WHY SHA-256 (not bcrypt) for refresh tokens?
        bcrypt is slow by design — good for passwords (humans choose them).
        Refresh tokens are random 256-bit values — they can't be brute-forced.
        SHA-256 is fast and sufficient here. No need for bcrypt's slowness.
    """
    return hashlib.sha256(raw_token.encode()).hexdigest()


def get_refresh_token_expiry() -> datetime:
    """Returns the expiry datetime for a new refresh token."""
    return datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)