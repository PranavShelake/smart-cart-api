from fastapi import APIRouter, Depends, Query
import asyncpg

from app.modules.reviews.schemas import (
    CreateReviewRequest, UpdateReviewRequest, ReviewFilterParams,
)
from app.modules.reviews.service import ReviewsService
from app.core.dependencies import get_current_user, require_admin, TokenData
from app.database import get_db
from app.utils.response import success_response

router = APIRouter(tags=["Reviews"])


# ── Public: product reviews ───────────────────────────────────
@router.get("/products/{product_id}/reviews")
async def get_product_reviews(
    product_id:     int,
    page:           int  = Query(1, ge=1),
    per_page:       int  = Query(10, ge=1, le=50),
    rating:         int | None = Query(None, ge=1, le=5),
    verified_only:  bool = Query(False),
    db: asyncpg.Connection = Depends(get_db),
):
    params = ReviewFilterParams(
        page=page, per_page=per_page,
        rating=rating, verified_only=verified_only,
    )
    service = ReviewsService(db)
    reviews, total, breakdown = await service.get_product_reviews(product_id, params)
    return success_response(
        data={"reviews": reviews, "rating_breakdown": breakdown},
        message="Reviews fetched.",
        meta={
            "page": page, "per_page": per_page, "total": total,
            "total_pages": (total + per_page - 1) // per_page,
        },
    )


# ── Authenticated: write review ───────────────────────────────
@router.post("/products/{product_id}/reviews", status_code=201)
async def create_review(
    product_id: int,
    data: CreateReviewRequest,
    current_user: TokenData = Depends(get_current_user),
    db: asyncpg.Connection  = Depends(get_db),
):
    service = ReviewsService(db)
    review = await service.create_review(product_id, current_user.user_id, data)
    return success_response(
        data=review, message="Review submitted. Pending approval.", status_code=201,
    )


@router.patch("/reviews/{review_id}")
async def update_review(
    review_id: int,
    data: UpdateReviewRequest,
    current_user: TokenData = Depends(get_current_user),
    db: asyncpg.Connection  = Depends(get_db),
):
    service = ReviewsService(db)
    review = await service.update_review(review_id, current_user.user_id, data)
    return success_response(data=review, message="Review updated. Pending re-approval.")


@router.delete("/reviews/{review_id}")
async def delete_review(
    review_id: int,
    current_user: TokenData = Depends(get_current_user),
    db: asyncpg.Connection  = Depends(get_db),
):
    service = ReviewsService(db)
    await service.delete_review(
        review_id, current_user.user_id, is_admin=current_user.is_admin()
    )
    return success_response(message="Review deleted.")


@router.post("/reviews/{review_id}/helpful")
async def mark_helpful(
    review_id: int,
    current_user: TokenData = Depends(get_current_user),
    db: asyncpg.Connection  = Depends(get_db),
):
    service = ReviewsService(db)
    await service.mark_helpful(review_id)
    return success_response(message="Marked as helpful.")


# ── Admin: moderation ─────────────────────────────────────────
@router.get("/admin/reviews/pending")
async def get_pending_reviews(
    page:     int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _: TokenData  = Depends(require_admin),
    db: asyncpg.Connection = Depends(get_db),
):
    service = ReviewsService(db)
    reviews, total = await service.get_pending_reviews(page, per_page)
    return success_response(
        data=reviews, message="Pending reviews fetched.",
        meta={
            "page": page, "per_page": per_page, "total": total,
            "total_pages": (total + per_page - 1) // per_page,
        },
    )


@router.patch("/admin/reviews/{review_id}/approve")
async def approve_review(
    review_id: int,
    _: TokenData = Depends(require_admin),
    db: asyncpg.Connection = Depends(get_db),
):
    service = ReviewsService(db)
    await service.approve_review(review_id)
    return success_response(message="Review approved and published.")