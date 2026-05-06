from fastapi import APIRouter, Depends, Query
from decimal import Decimal
import asyncpg

from app.modules.orders.schemas import (
    PlaceOrderRequest, CancelOrderRequest, UpdateOrderStateRequest,
)
from app.modules.orders.service import OrdersService
from app.core.dependencies import get_current_user, require_admin, TokenData
from app.database import get_db
from app.utils.response import success_response

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post("", status_code=201)
async def place_order(
    data: PlaceOrderRequest,
    current_user: TokenData = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """
    POST /api/v1/orders
    Place an order from the user's current cart.
    Atomic transaction: validates stock → creates order → deducts stock → clears cart.
    """
    service = OrdersService(db)
    order = await service.place_order(current_user.user_id, data)
    return success_response(data=order, message="Order placed successfully.", status_code=201)


@router.get("")
async def list_my_orders(
    page:   int          = Query(1, ge=1),
    per_page: int        = Query(10, ge=1, le=50),
    status: str | None   = Query(None),
    current_user: TokenData = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """GET /api/v1/orders — Customer sees their own orders."""
    service = OrdersService(db)
    orders, total = await service.list_orders(
        user_id=current_user.user_id,
        page=page, per_page=per_page,
        status_filter=status,
    )
    return success_response(
        data=orders,
        message="Orders fetched.",
        meta={
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": (total + per_page - 1) // per_page,
        },
    )


@router.get("/admin/all")
async def list_all_orders(
    page:     int        = Query(1, ge=1),
    per_page: int        = Query(20, ge=1, le=100),
    status:   str | None = Query(None),
    _: TokenData         = Depends(require_admin),
    db: asyncpg.Connection = Depends(get_db),
):
    """GET /api/v1/orders/admin/all — Admin sees all orders."""
    service = OrdersService(db)
    orders, total = await service.list_orders(
        user_id=None,
        page=page, per_page=per_page,
        status_filter=status,
    )
    return success_response(
        data=orders,
        message="All orders fetched.",
        meta={
            "page": page, "per_page": per_page,
            "total": total,
            "total_pages": (total + per_page - 1) // per_page,
        },
    )


@router.get("/{order_id}")
async def get_order(
    order_id: int,
    current_user: TokenData = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """
    GET /api/v1/orders/{order_id}
    Customer can only fetch their own order.
    Admin uses /admin/all or fetches without user_id filter.
    """
    service = OrdersService(db)
    # Admin bypasses user filter
    uid = None if current_user.is_admin() else current_user.user_id
    order = await service.get_order(order_id, user_id=uid)
    return success_response(data=order, message="Order fetched.")


@router.post("/{order_id}/cancel")
async def cancel_order(
    order_id: int,
    data: CancelOrderRequest,
    current_user: TokenData = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """
    POST /api/v1/orders/{order_id}/cancel
    Customer: can cancel PENDING/CONFIRMED orders only.
    Admin: can cancel any non-terminal order.
    """
    service = OrdersService(db)
    uid = None if current_user.is_admin() else current_user.user_id
    order = await service.cancel_order(order_id, user_id=uid, data=data)
    return success_response(data=order, message="Order cancelled.")


@router.patch("/{order_id}/state")
async def update_order_state(
    order_id: int,
    data: UpdateOrderStateRequest,
    _: TokenData = Depends(require_admin),
    db: asyncpg.Connection = Depends(get_db),
):
    """
    PATCH /api/v1/orders/{order_id}/state
    Admin only. Advance order through the state machine.
    Validates the transition is allowed before applying.
    """
    service = OrdersService(db)
    order = await service.update_order_state(order_id, data)
    return success_response(data=order, message="Order state updated.")


@router.get("/validate-coupon")
async def validate_coupon(
    code:      str     = Query(...),
    subtotal:  Decimal = Query(...),
    current_user: TokenData = Depends(get_current_user),
    db: asyncpg.Connection  = Depends(get_db),
):
    """
    GET /api/v1/orders/validate-coupon?code=WELCOME10&subtotal=999
    Validate a coupon before checkout — shows discount amount to user.
    """
    service = OrdersService(db)
    result = await service.validate_coupon_for_user(
        code=code,
        user_id=current_user.user_id,
        cart_subtotal=subtotal,
    )
    return success_response(data=result, message=result["message"])