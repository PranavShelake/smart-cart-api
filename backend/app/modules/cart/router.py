from fastapi import APIRouter, Depends
import asyncpg

from app.modules.cart.schemas import AddToCartRequest, UpdateCartItemRequest
from app.modules.cart.service import CartService
from app.core.dependencies import get_current_user, TokenData
from app.database import get_db
from app.utils.response import success_response

router = APIRouter(prefix="/cart", tags=["Cart"])


@router.get("")
async def get_cart(
    current_user: TokenData = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """
    GET /api/v1/cart
    Returns the authenticated user's full cart with subtotals and price-change flags.
    Returns empty cart structure if user has never added anything.
    """
    service = CartService(db)
    cart = await service.get_cart(current_user.user_id)
    return success_response(data=cart, message="Cart fetched.")


@router.post("/items", status_code=201)
async def add_to_cart(
    data: AddToCartRequest,
    current_user: TokenData = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """
    POST /api/v1/cart/items
    Add a product to cart. If item already exists, increments quantity.
    Returns full updated cart.
    """
    service = CartService(db)
    cart = await service.add_item(current_user.user_id, data)
    return success_response(data=cart, message="Item added to cart.", status_code=201)


@router.patch("/items/{item_id}")
async def update_cart_item(
    item_id: int,
    data: UpdateCartItemRequest,
    current_user: TokenData = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """
    PATCH /api/v1/cart/items/{item_id}
    Update quantity of a specific cart item.
    Returns full updated cart.
    """
    service = CartService(db)
    cart = await service.update_item(current_user.user_id, item_id, data)
    return success_response(data=cart, message="Cart updated.")


@router.delete("/items/{item_id}")
async def remove_cart_item(
    item_id: int,
    current_user: TokenData = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """
    DELETE /api/v1/cart/items/{item_id}
    Remove a single item from cart.
    Returns full updated cart (so frontend can re-render without a second fetch).
    """
    service = CartService(db)
    cart = await service.remove_item(current_user.user_id, item_id)
    return success_response(data=cart, message="Item removed from cart.")


@router.delete("")
async def clear_cart(
    current_user: TokenData = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """
    DELETE /api/v1/cart
    Remove ALL items from the cart.
    Called automatically after order is placed.
    """
    service = CartService(db)
    await service.clear_cart(current_user.user_id)
    return success_response(message="Cart cleared.")