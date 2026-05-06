from pydantic import BaseModel, field_validator
import re


class CategoryCreateRequest(BaseModel):
    name: str
    slug: str | None = None          # Auto-generated from name if not provided
    description: str | None = None
    parent_category_id: int | None = None
    image_url: str | None = None
    display_order: int = 0
    is_active: bool = True

    @field_validator("name")
    @classmethod
    def name_validator(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Category name must be at least 2 characters.")
        if len(v) > 100:
            raise ValueError("Category name cannot exceed 100 characters.")
        return v

    @field_validator("slug")
    @classmethod
    def slug_validator(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip().lower()
        if not re.match(r"^[a-z0-9]+(?:-[a-z0-9]+)*$", v):
            raise ValueError("Slug must be lowercase letters, numbers, and hyphens only.")
        return v

    model_config = {"str_strip_whitespace": True}


class CategoryUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    parent_category_id: int | None = None
    image_url: str | None = None
    display_order: int | None = None
    is_active: bool | None = None

    model_config = {"str_strip_whitespace": True}


class CategoryResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    parent_category_id: int | None
    image_url: str | None
    display_order: int
    is_active: bool


class CategoryTreeResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    image_url: str | None
    display_order: int
    children: list["CategoryTreeResponse"] = []

CategoryTreeResponse.model_rebuild()