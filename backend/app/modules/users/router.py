from fastapi import APIRouter, Depends
import asyncpg

from app.modules.users.schemas import UpdateProfileRequest, AddressRequest
from app.modules.users.service import UsersService
from app.core.dependencies import get_current_user, TokenData
from app.database import get_db
from app.utils.response import success_response

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me")
async def get_my_profile(
    current_user: TokenData = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    service = UsersService(db)
    profile = await service.get_profile(current_user.user_id)
    return success_response(data=dict(profile), message="Profile fetched.")


@router.patch("/me")
async def update_my_profile(
    data: UpdateProfileRequest,
    current_user: TokenData = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    service = UsersService(db)
    updated = await service.update_profile(current_user.user_id, data)
    return success_response(data=dict(updated), message="Profile updated.")


# ── Addresses ─────────────────────────────────────────────

@router.get("/me/addresses")
async def get_my_addresses(
    current_user: TokenData = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    service = UsersService(db)
    addresses = await service.get_addresses(current_user.user_id)
    return success_response(data=addresses, message="Addresses fetched.")


@router.post("/me/addresses", status_code=201)
async def add_address(
    data: AddressRequest,
    current_user: TokenData = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    service = UsersService(db)
    address = await service.add_address(current_user.user_id, data)
    return success_response(data=address, message="Address added.", status_code=201)


@router.put("/me/addresses/{address_id}")
async def update_address(
    address_id: int,
    data: AddressRequest,
    current_user: TokenData = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    service = UsersService(db)
    address = await service.update_address(address_id, current_user.user_id, data)
    return success_response(data=address, message="Address updated.")


@router.delete("/me/addresses/{address_id}", status_code=200)
async def delete_address(
    address_id: int,
    current_user: TokenData = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    service = UsersService(db)
    await service.delete_address(address_id, current_user.user_id)
    return success_response(message="Address deleted.")


@router.patch("/me/addresses/{address_id}/default")
async def set_default_address(
    address_id: int,
    current_user: TokenData = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    service = UsersService(db)
    await service.set_default_address(address_id, current_user.user_id)
    return success_response(message="Default address updated.")