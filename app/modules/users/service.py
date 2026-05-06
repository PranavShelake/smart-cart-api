import asyncpg
from asyncpg import Record
from app.modules.users.repository import UsersRepository
from app.modules.users.schemas import UpdateProfileRequest, AddressRequest
from app.core.exceptions import NotFoundException, ConflictException

MAX_ADDRESSES = 5

def serialize(data):
    if isinstance(data, Record):
        return serialize(dict(data))

    elif isinstance(data, dict):
        return {k: serialize(v) for k, v in data.items()}

    elif isinstance(data, list):
        return [serialize(item) for item in data]

    elif hasattr(data, "isoformat"):
        return data.isoformat()

    return data

class UsersService:

    def __init__(self, db: asyncpg.Connection):
        self.repo = UsersRepository(db)

    # ── Profile ───────────────────────────────────────────

    async def get_profile(self, user_id: int) -> dict:
        user = await self.repo.get_profile(user_id)
        if not user:
            raise NotFoundException("User")
        return serialize(dict(user))

    async def update_profile(self, user_id: int, data: UpdateProfileRequest) -> dict:
        # Build dict of only provided (non-None) fields
        # WHY? PATCH semantics — don't overwrite fields the user didn't send
        fields = {k: v for k, v in data.model_dump().items() if v is not None}

        updated = await self.repo.update_profile(user_id, fields)
        if not updated:
            raise NotFoundException("User")

        # Re-fetch with roles (UPDATE RETURNING doesn't join roles)
        return serialize(await self.repo.get_profile(user_id))

    # ── Addresses ─────────────────────────────────────────

    async def get_addresses(self, user_id: int) -> list[dict]:
        return serialize(await self.repo.get_addresses(user_id))

    async def add_address(self, user_id: int, data: AddressRequest) -> dict:
        # Enforce max address limit — prevents DB bloat and abuse
        count = await self.repo.get_address_count(user_id)
        if count >= MAX_ADDRESSES:
            raise ConflictException(
                f"You can save a maximum of {MAX_ADDRESSES} addresses. "
                "Please delete an existing one first."
            )

        # If this is marked as default OR it's the first address, clear existing defaults
        if data.is_default or count == 0:
            await self.repo.unset_default_address(user_id)
            data_dict = data.model_dump()
            data_dict["is_default"] = True
        else:
            data_dict = data.model_dump()

        return serialize(await self.repo.create_address(user_id, data_dict))

    async def update_address(self, address_id: int, user_id: int, data: AddressRequest) -> dict:
        # Verify ownership before updating
        existing = await self.repo.get_address_by_id(address_id, user_id)
        if not existing:
            raise NotFoundException("Address")

        if data.is_default:
            await self.repo.unset_default_address(user_id)

        updated = await self.repo.update_address(address_id, user_id, data.model_dump())
        if not updated:
            raise NotFoundException("Address")
        return serialize(updated)

    async def delete_address(self, address_id: int, user_id: int) -> None:
        existing = await self.repo.get_address_by_id(address_id, user_id)
        if not existing:
            raise NotFoundException("Address")

        deleted = await self.repo.delete_address(address_id, user_id)
        if not deleted:
            raise NotFoundException("Address")

        # If deleted address was the default, auto-promote the next one
        if existing["is_default"]:
            next_address = await self.repo.get_first_address(user_id)
            if next_address:
                await self.repo.set_default_address(next_address["id"], user_id)

    async def set_default_address(self, address_id: int, user_id: int) -> dict:
        existing = await self.repo.get_address_by_id(address_id, user_id)
        if not existing:
            raise NotFoundException("Address")

        return serialize(await self.repo.set_default_address(address_id, user_id))