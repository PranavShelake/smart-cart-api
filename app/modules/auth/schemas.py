# ============================================================
# app/modules/auth/schemas.py
#
# Pydantic v2 schemas for the Auth module.
#
# WHY separate Request and Response schemas?
#   Request schemas: validate INCOMING data (user input)
#   Response schemas: shape OUTGOING data (what client sees)
#   Never return raw DB rows — always serialize through response schemas.
#   This prevents accidental leakage of sensitive fields (password_hash, etc.)
# ============================================================

import re
from datetime import date
from pydantic import BaseModel, EmailStr, field_validator, model_validator


# ── PASSWORD STRENGTH VALIDATOR ───────────────────────────
# Reusable validator — used by RegisterRequest and ChangePasswordRequest

def validate_password_strength(password: str) -> str:
    """
    Enforces password policy:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character

    WHY these rules?
        NIST guidelines suggest length over complexity, but for an e-commerce
        app handling payments, we enforce both for user safety.
    """
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain at least one lowercase letter.")
    if not re.search(r"\d", password):
        raise ValueError("Password must contain at least one digit.")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-]", password):
        raise ValueError("Password must contain at least one special character.")
    return password


# ============================================================
# REQUEST SCHEMAS (Incoming data from client)
# ============================================================

class RegisterRequest(BaseModel):
    email: EmailStr                 # EmailStr validates format AND normalizes to lowercase
    password: str
    first_name: str
    last_name: str
    phone: str | None = None
    date_of_birth: date | None = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return validate_password_strength(v)

    @field_validator("first_name", "last_name")
    @classmethod
    def name_validator(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters.")
        if len(v) > 100:
            raise ValueError("Name cannot exceed 100 characters.")
        if not re.match(r"^[a-zA-Z\s\-']+$", v):
            raise ValueError("Name can only contain letters, spaces, hyphens, and apostrophes.")
        return v

    @field_validator("phone")
    @classmethod
    def phone_validator(cls, v: str | None) -> str | None:
        if v is None:
            return v
        # Strip spaces and dashes for normalization
        v = re.sub(r"[\s\-()]", "", v)
        # Accept Indian format: +91XXXXXXXXXX or 10-digit mobile
        if not re.match(r"^(\+91)?[6-9]\d{9}$", v):
            raise ValueError("Enter a valid Indian mobile number (e.g., 9876543210 or +919876543210).")
        return v

    @field_validator("date_of_birth")
    @classmethod
    def dob_validator(cls, v: date | None) -> date | None:
        if v is None:
            return v
        from datetime import date as date_type
        today = date_type.today()
        age = (today - v).days // 365
        if age < 13:
            raise ValueError("You must be at least 13 years old to register.")
        if age > 120:
            raise ValueError("Invalid date of birth.")
        return v

    model_config = {"str_strip_whitespace": True}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    model_config = {"str_strip_whitespace": True}


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    model_config = {"str_strip_whitespace": True}


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return validate_password_strength(v)

    @model_validator(mode="after")
    def passwords_match(self) -> "ResetPasswordRequest":
        if self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self

    model_config = {"str_strip_whitespace": True}


class VerifyEmailRequest(BaseModel):
    token: str


# ============================================================
# RESPONSE SCHEMAS (Outgoing data to client)
# ============================================================

class UserInResponse(BaseModel):
    """
    Safe user representation — NEVER includes password_hash.
    Returned as part of login/register responses.
    """
    id: int
    email: str
    first_name: str
    last_name: str
    phone: str | None
    roles: list[str]
    is_active: bool


class TokenResponse(BaseModel):
    """
    Returned after successful login.
    Only the access token is in the body.
    Refresh token is set as HTTP-only cookie (not in this schema).

    WHY access_token in body and refresh_token in cookie?
        Access token: Client reads it to make API calls. In memory (React state).
        Refresh token: Client should NOT read it. HTTP-only cookie = JS-inaccessible.
    """
    access_token: str
    token_type: str = "bearer"
    expires_in: int               # Seconds until access token expires
    user: UserInResponse


class RegisterResponse(BaseModel):
    message: str
    user_id: int


class MessageResponse(BaseModel):
    """Generic response for operations that just return a success message."""
    message: str