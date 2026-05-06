from fastapi import APIRouter, Depends
import asyncpg

from app.modules.categories.schemas import CategoryCreateRequest, CategoryUpdateRequest
from app.modules.categories.service import CategoriesService
from app.core.dependencies import get_current_user, require_admin, TokenData
from app.database import get_db
from app.utils.response import success_response

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("/tree")
async def get_category_tree(db: asyncpg.Connection = Depends(get_db)):
    """Full nested tree — used by frontend nav menu. Public endpoint."""
    service = CategoriesService(db)
    tree = await service.get_tree()
    return success_response(data=tree, message="Category tree fetched.")


@router.get("")
async def get_top_level_categories(db: asyncpg.Connection = Depends(get_db)):
    """Flat list of top-level categories. Public."""
    service = CategoriesService(db)
    categories = await service.get_top_level()
    return success_response(data=categories, message="Categories fetched.")


@router.get("/{slug}")
async def get_category_by_slug(
    slug: str,
    db: asyncpg.Connection = Depends(get_db),
):
    """Category detail with children + breadcrumb. Public."""
    service = CategoriesService(db)
    category = await service.get_by_slug(slug)
    return success_response(data=category, message="Category fetched.")


@router.post("", status_code=201)
async def create_category(
    data: CategoryCreateRequest,
    db: asyncpg.Connection = Depends(get_db),
    _: TokenData = Depends(require_admin),      # Admin only
):
    service = CategoriesService(db)
    category = await service.create(data)
    return success_response(data=category, message="Category created.", status_code=201)


@router.patch("/{category_id}")
async def update_category(
    category_id: int,
    data: CategoryUpdateRequest,
    db: asyncpg.Connection = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    service = CategoriesService(db)
    category = await service.update(category_id, data)
    return success_response(data=category, message="Category updated.")


@router.delete("/{category_id}")
async def delete_category(
    category_id: int,
    db: asyncpg.Connection = Depends(get_db),
    _: TokenData = Depends(require_admin),
):
    service = CategoriesService(db)
    await service.delete(category_id)
    return success_response(message="Category deactivated.")