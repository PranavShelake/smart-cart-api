from pydantic import BaseModel, field_validator
from datetime import date
import re


def validate_phone(v):
    if v is None:
        return v
    v = re.sub(r"[\s\-()]", "", v)
    if not re.match(r"^(\+91)?[6-9]\d{9}$", v):
        raise ValueError("Enter a valid Indian mobile number.")
    return v


class UpdateProfileRequest(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    date_of_birth: date | None = None

    @field_validator("first_name", "last_name")
    @classmethod
    def name_validator(cls, v):
        if v is None:
            return v
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters.")
        if not re.match(r"^[a-zA-Z\s\-']+$", v):
            raise ValueError("Name can only contain letters, spaces, hyphens, apostrophes.")
        return v

    @field_validator("phone")
    @classmethod
    def phone_validator(cls, v):
        return validate_phone(v)

    model_config = {"str_strip_whitespace": True}


class AddressRequest(BaseModel):
    address_type: str
    full_name: str
    phone: str
    address_line1: str
    address_line2: str | None = None
    city: str
    state: str
    postal_code: str
    country: str = "India"
    is_default: bool = False

    @field_validator("address_type")
    @classmethod
    def type_validator(cls, v):
        if v not in ("billing", "shipping", "both"):
            raise ValueError("address_type must be 'billing', 'shipping', or 'both'.")
        return v

    @field_validator("phone")
    @classmethod
    def phone_validator(cls, v):
        return validate_phone(v)

    @field_validator("postal_code")
    @classmethod
    def pincode_validator(cls, v):
        if not re.match(r"^\d{6}$", v):
            raise ValueError("Postal code must be a 6-digit number.")
        return v

    model_config = {"str_strip_whitespace": True}


class UserProfileResponse(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    phone: str | None
    date_of_birth: date | None
    is_active: bool
    roles: list[str]


class AddressResponse(BaseModel):
    id: int
    address_type: str
    full_name: str
    phone: str
    address_line1: str
    address_line2: str | None
    city: str
    state: str
    postal_code: str
    country: str
    is_default: bool