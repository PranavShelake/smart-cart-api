from fastapi import APIRouter, Depends, Query
import asyncpg

from app.modules.returns.schemas import CreateReturnRequest, ProcessReturnRequest
from app.modules.returns.service import ReturnsService
from app.core.dependencies import get_current_user, require_admin, TokenData
from app.database import get_db
from app.utils.response import success_response

router = APIRouter(prefix="/returns", tags=["Returns"])


@router.post("", status_code=201)
async def create_return(
    data: CreateReturnRequest,
    current_user: TokenData = Depends(get_current_user),
    db: asyncpg.Connection  = Depends(get_db),
):
    """
    POST /api/v1/returns
    Customer raises a return request for a delivered order.
    Validates ownership, delivery status, and item quantities.
    """
    service = ReturnsService(db)
    ret = await service.create_return(current_user.user_id, data)
    return success_response(
        data=ret, message="Return request submitted.", status_code=201,
    )


@router.get("")
async def list_my_returns(
    page:     int        = Query(1, ge=1),
    per_page: int        = Query(10, ge=1, le=50),
    status:   str | None = Query(None),
    current_user: TokenData = Depends(get_current_user),
    db: asyncpg.Connection  = Depends(get_db),
):
    """GET /api/v1/returns — Customer sees their own return requests."""
    service = ReturnsService(db)
    returns, total = await service.list_returns(
        user_id=current_user.user_id,
        page=page, per_page=per_page,
        status_filter=status,
    )
    return success_response(
        data=returns, message="Returns fetched.",
        meta={
            "page": page, "per_page": per_page, "total": total,
            "total_pages": (total + per_page - 1) // per_page,
        },
    )


@router.get("/{return_id}")
async def get_return(
    return_id: int,
    current_user: TokenData = Depends(get_current_user),
    db: asyncpg.Connection  = Depends(get_db),
):
    service = ReturnsService(db)
    uid = None if current_user.is_admin() else current_user.user_id
    ret = await service.get_return(return_id, user_id=uid)
    return success_response(data=ret, message="Return fetched.")


# ── Admin ─────────────────────────────────────────────────────

@router.get("/admin/all")
async def list_all_returns(
    page:     int        = Query(1, ge=1),
    per_page: int        = Query(20, ge=1, le=100),
    status:   str | None = Query(None),
    _: TokenData         = Depends(require_admin),
    db: asyncpg.Connection = Depends(get_db),
):
    service = ReturnsService(db)
    returns, total = await service.list_returns(
        user_id=None, page=page, per_page=per_page, status_filter=status,
    )
    return success_response(
        data=returns, message="All returns fetched.",
        meta={
            "page": page, "per_page": per_page, "total": total,
            "total_pages": (total + per_page - 1) // per_page,
        },
    )


@router.post("/admin/{return_id}/process")
async def process_return(
    return_id: int,
    data: ProcessReturnRequest,
    _: TokenData = Depends(require_admin),
    db: asyncpg.Connection = Depends(get_db),
):
    """
    POST /api/v1/returns/admin/{id}/process
    Admin approves or rejects a return request.
    Sets refund_amount and updates order state.
    """
    service = ReturnsService(db)
    ret = await service.process_return(return_id, data)
    action_label = "approved" if data.action == "approve" else "rejected"
    return success_response(data=ret, message=f"Return {action_label}.")