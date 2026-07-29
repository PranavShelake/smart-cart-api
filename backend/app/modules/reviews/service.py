import asyncpg
from app.modules.reviews.repository import ReviewsRepository
from app.modules.reviews.schemas import (
    CreateReviewRequest, UpdateReviewRequest, ReviewFilterParams,
)
from app.core.exceptions import (
    NotFoundException, ConflictException, AppException,
    InsufficientPermissionsException,
)
from fastapi import status


class ReviewNotEligibleException(AppException):
    def __init__(self, msg: str):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="REVIEW_NOT_ELIGIBLE",
            message=msg,
        )


class ReviewsService:

    def __init__(self, db: asyncpg.Connection):
        self.repo = ReviewsRepository(db)

    async def get_product_reviews(
        self, product_id: int, params: ReviewFilterParams
    ) -> tuple[list[dict], int, dict]:
        reviews, total = await self.repo.get_reviews_for_product(
            product_id=product_id,
            page=params.page,
            per_page=params.per_page,
            rating_filter=params.rating,
            verified_only=params.verified_only,
        )
        breakdown = await self.repo.get_rating_breakdown(product_id)
        return reviews, total, breakdown

    async def create_review(
        self, product_id: int, user_id: int, data: CreateReviewRequest
    ) -> dict:
        # Must have purchased AND received the product via this order
        if not await self.repo.has_purchased_product(user_id, product_id, data.order_id):
            raise ReviewNotEligibleException(
                "You can only review products from delivered orders."
            )

        if await self.repo.review_exists(user_id, product_id, data.order_id):
            raise ConflictException(
                "You have already reviewed this product for this order."
            )

        return await self.repo.create_review({
            "product_id":           product_id,
            "user_id":              user_id,
            "order_id":             data.order_id,
            "rating":               data.rating,
            "title":                data.title,
            "comment":              data.comment,
            "is_verified_purchase": True,
        })

    async def update_review(
        self, review_id: int, user_id: int, data: UpdateReviewRequest
    ) -> dict:
        review = await self.repo.get_review_by_id(review_id)
        if not review:
            raise NotFoundException("Review")
        if review["user_id"] != user_id:
            raise InsufficientPermissionsException()

        fields = {k: v for k, v in data.model_dump().items() if v is not None}
        updated = await self.repo.update_review(review_id, fields)
        return updated

    async def delete_review(self, review_id: int, user_id: int, is_admin: bool) -> None:
        review = await self.repo.get_review_by_id(review_id)
        if not review:
            raise NotFoundException("Review")
        if not is_admin and review["user_id"] != user_id:
            raise InsufficientPermissionsException()
        await self.repo.delete_review(review_id)

    async def mark_helpful(self, review_id: int) -> None:
        review = await self.repo.get_review_by_id(review_id)
        if not review:
            raise NotFoundException("Review")
        await self.repo.mark_helpful(review_id)

    async def approve_review(self, review_id: int) -> None:
        ok = await self.repo.approve_review(review_id)
        if not ok:
            raise NotFoundException("Review")

    async def get_pending_reviews(
        self, page: int, per_page: int
    ) -> tuple[list[dict], int]:
        return await self.repo.get_pending_reviews(page, per_page)