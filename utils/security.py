
# ============================================================================
# FILE: utils/security.py
# ============================================================================
import os
import secrets
from datetime import datetime, timedelta
from typing import Optional

from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import HTTPException, status
from dotenv import load_dotenv

load_dotenv()

# ----------------------------------------------------------------------------
# Password hashing
# ----------------------------------------------------------------------------
# argon2 = primary (recommended)
# bcrypt = kept for verifying old hashes if they exist
pwd_context = CryptContext(
    schemes=["argon2", "bcrypt"],
    deprecated="auto"
)

def hash_password(password: str) -> str:
    """Hash a password securely (argon2)"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against stored hash"""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


# ----------------------------------------------------------------------------
# JWT configuration
# ----------------------------------------------------------------------------
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow()
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> Optional[dict]:
    """Verify and decode JWT token"""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


# ----------------------------------------------------------------------------
# Tokens
# ----------------------------------------------------------------------------
def generate_verification_token() -> str:
    """Generate secure random token"""
    return secrets.token_urlsafe(32)

