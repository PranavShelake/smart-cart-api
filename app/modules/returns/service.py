import asyncpg
from app.modules.returns.repository import ReturnsRepository
from app.modules.returns.schemas import CreateReturnRequest, ProcessReturnRequest
from app.core.exceptions import NotFoundException, ConflictException, AppException
from fastapi import status


class ReturnNotEligibleException(AppException):
    def __init__(self, msg: str):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="RETURN_NOT_ELIGIBLE",
            message=msg,
        )


class ReturnsService:

    def __init__(self, db: asyncpg.Connection):
        self.repo = ReturnsRepository(db)

    async def create_return(
        self, user_id: int, data: CreateReturnRequest
    ) -> dict:
        # Must be a delivered order belonging to this user
        order = await self.repo.get_order_for_return(data.order_id, user_id)
        if not order:
            raise ReturnNotEligibleException(
                "Return requests can only be raised for delivered orders."
            )

        # No duplicate active return
        if await self.repo.return_already_exists(data.order_id):
            raise ConflictException(
                "A return request for this order is already in progress."
            )

        # Validate all requested item IDs belong to this order
        item_ids = [item.order_item_id for item in data.items]
        valid_items = await self.repo.validate_order_items(data.order_id, item_ids)
        valid_ids = {item["id"] for item in valid_items}

        for req_item in data.items:
            if req_item.order_item_id not in valid_ids:
                raise NotFoundException(
                    f"Order item {req_item.order_item_id} not found in this order."
                )
            # Validate return quantity <= ordered quantity
            ordered_item = next(
                i for i in valid_items if i["id"] == req_item.order_item_id
            )
            if req_item.quantity > ordered_item["quantity"]:
                raise ConflictException(
                    f"Return quantity for '{ordered_item['product_name']}' "
                    f"cannot exceed ordered quantity of {ordered_item['quantity']}."
                )

        return_number = await self.repo.generate_return_number()

        async with self.db.transaction():
            ret = await self.repo.create_return({
                "order_id":      data.order_id,
                "return_number": return_number,
                "reason":        data.reason,
            })

            for item in data.items:
                await self.repo.create_return_item({
                    "return_id":    ret["id"],
                    "order_item_id": item.order_item_id,
                    "quantity":     item.quantity,
                    "reason":       item.reason,
                })

            # Update order state to RETURN_REQUESTED
            await self.repo.update_order_state_to_return(
                data.order_id, "RETURN_REQUESTED"
            )

        return await self.get_return(ret["id"])

    async def get_return(
        self, return_id: int, user_id: int | None = None
    ) -> dict:
        ret = await self.repo.get_return_by_id(return_id, user_id)
        if not ret:
            raise NotFoundException("Return request")
        ret["items"] = await self.repo.get_return_items(return_id)
        return ret

    async def list_returns(
        self,
        user_id: int | None,
        page: int,
        per_page: int,
        status_filter: str | None,
    ) -> tuple[list[dict], int]:
        return await self.repo.list_returns(user_id, page, per_page, status_filter)

    async def process_return(
        self, return_id: int, data: ProcessReturnRequest
    ) -> dict:
        """Admin: approve or reject a return request."""
        ret = await self.repo.get_return_by_id(return_id)
        if not ret:
            raise NotFoundException("Return request")

        if ret["status"] != "requested":
            raise ConflictException(
                f"This return is already '{ret['status']}' and cannot be processed again."
            )

        refund = float(data.refund_amount) if data.refund_amount else None
        ok = await self.repo.process_return(
            return_id=return_id,
            action=data.action,
            refund_amount=refund,
            admin_notes=data.admin_notes,
        )
        if not ok:
            raise ConflictException("Failed to process return request.")

        # Update order state
        new_order_state = (
            "RETURN_APPROVED" if data.action == "approve" else "RETURN_REJECTED"
        )
        await self.repo.update_order_state_to_return(ret["order_id"], new_order_state)

        return await self.get_return(return_id)

    @property
    def db(self):
        return self.repo.db