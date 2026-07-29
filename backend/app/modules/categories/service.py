import re
import asyncpg

from app.modules.categories.repository import CategoriesRepository
from app.modules.categories.schemas import CategoryCreateRequest, CategoryUpdateRequest
from app.core.exceptions import NotFoundException, ConflictException


def _generate_slug(name: str) -> str:
    """Convert 'Home & Kitchen' → 'home-kitchen'"""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug


def _build_tree(categories: list[dict]) -> list[dict]:
    """
    Build a nested category tree from a flat list.
    O(n) using a dict lookup — much faster than nested loops.

    WHY in Python not SQL?
        A recursive CTE works but returns flat rows that still need
        Python assembly. Doing it here is transparent and easy to test.
    """
    lookup: dict[int, dict] = {}
    roots: list[dict] = []

    for cat in categories:
        cat["children"] = []
        lookup[cat["id"]] = cat

    for cat in categories:
        parent_id = cat.get("parent_category_id")
        if parent_id and parent_id in lookup:
            lookup[parent_id]["children"].append(cat)
        else:
            roots.append(cat)

    return roots


class CategoriesService:

    def __init__(self, db: asyncpg.Connection):
        self.repo = CategoriesRepository(db)

    async def get_tree(self) -> list[dict]:
        """Full nested tree — used for nav menus."""
        flat = await self.repo.get_all_active()
        return _build_tree(flat)

    async def get_top_level(self) -> list[dict]:
        return await self.repo.get_top_level()

    async def get_by_slug(self, slug: str) -> dict:
        category = await self.repo.get_by_slug(slug)
        if not category:
            raise NotFoundException("Category")
        children = await self.repo.get_children(category["id"])
        breadcrumb = await self.repo.get_breadcrumb(category["id"])
        return {**category, "children": children, "breadcrumb": breadcrumb}

    async def create(self, data: CategoryCreateRequest) -> dict:
        # Auto-generate slug if not provided
        slug = data.slug or _generate_slug(data.name)

        if await self.repo.name_exists(data.name):
            raise ConflictException("A category with this name already exists.")
        if await self.repo.slug_exists(slug):
            raise ConflictException(f"Slug '{slug}' is already taken.")

        # Validate parent exists if provided
        if data.parent_category_id:
            parent = await self.repo.get_by_id(data.parent_category_id)
            if not parent:
                raise NotFoundException("Parent category")
            # Only allow 2 levels deep — prevents infinite nesting complexity
            if parent.get("parent_category_id"):
                raise ConflictException(
                    "Only 2 levels of category nesting are allowed. "
                    "The selected parent is already a sub-category."
                )

        payload = data.model_dump()
        payload["slug"] = slug
        return await self.repo.create(payload)

    async def update(self, category_id: int, data: CategoryUpdateRequest) -> dict:
        existing = await self.repo.get_by_id(category_id)
        if not existing:
            raise NotFoundException("Category")

        fields = {k: v for k, v in data.model_dump().items() if v is not None}

        if "name" in fields and fields["name"] != existing["name"]:
            if await self.repo.name_exists(fields["name"], exclude_id=category_id):
                raise ConflictException("A category with this name already exists.")

        updated = await self.repo.update(category_id, fields)
        return updated

    async def delete(self, category_id: int) -> None:
        existing = await self.repo.get_by_id(category_id)
        if not existing:
            raise NotFoundException("Category")
        if await self.repo.has_products(category_id):
            raise ConflictException(
                "Cannot delete a category that has active products. "
                "Reassign or deactivate products first."
            )
        if await self.repo.has_children(category_id):
            raise ConflictException(
                "Cannot delete a category that has sub-categories. "
                "Delete sub-categories first."
            )
        await self.repo.soft_delete(category_id)