from pydantic import BaseModel, field_validator


class CreateReviewRequest(BaseModel):
    order_id: int
    rating: int
    title: str | None = None
    comment: str | None = None

    @field_validator("rating")
    @classmethod
    def rating_range(cls, v: int) -> int:
        if not 1 <= v <= 5:
            raise ValueError("Rating must be between 1 and 5.")
        return v

    @field_validator("title")
    @classmethod
    def title_length(cls, v: str | None) -> str | None:
        if v and len(v.strip()) > 200:
            raise ValueError("Title cannot exceed 200 characters.")
        return v.strip() if v else v

    @field_validator("comment")
    @classmethod
    def comment_length(cls, v: str | None) -> str | None:
        if v and len(v.strip()) > 2000:
            raise ValueError("Review cannot exceed 2000 characters.")
        return v.strip() if v else v

    model_config = {"str_strip_whitespace": True}


class UpdateReviewRequest(BaseModel):
    rating: int | None = None
    title: str | None = None
    comment: str | None = None

    @field_validator("rating")
    @classmethod
    def rating_range(cls, v: int | None) -> int | None:
        if v is not None and not 1 <= v <= 5:
            raise ValueError("Rating must be between 1 and 5.")
        return v

    model_config = {"str_strip_whitespace": True}


class ReviewResponse(BaseModel):
    id: int
    product_id: int
    user_id: int
    order_id: int | None
    reviewer_name: str
    rating: int
    title: str | None
    comment: str | None
    is_verified_purchase: bool
    is_approved: bool
    helpful_count: int
    created_at: str


class ReviewFilterParams(BaseModel):
    page: int = 1
    per_page: int = 10
    rating: int | None = None       # filter by star rating
    verified_only: bool = False

    @field_validator("per_page")
    @classmethod
    def cap(cls, v: int) -> int:
        return min(v, 50)