from decimal import Decimal
import asyncpg

from app.modules.cart.repository import CartRepository
from app.modules.cart.schemas import AddToCartRequest, UpdateCartItemRequest
from app.core.exceptions import NotFoundException, ConflictException, AppException
from fastapi import status

MAX_CART_ITEMS = 20   # max distinct product lines in one cart


class OutOfStockException(AppException):
    def __init__(self, available: int):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            error_code="CART_OUT_OF_STOCK",
            message=f"Only {available} unit(s) available in stock.",
        )


class CartService:

    def __init__(self, db: asyncpg.Connection):
        self.repo = CartRepository(db)

    async def get_cart(self, user_id: int) -> dict:
        """
        Fetch user's cart with all enriched item data.
        Builds the CartResponse shape including subtotals and price-change flags.
        """
        cart_id = await self.repo.get_cart_id(user_id)

        # Return empty cart structure if user has no cart yet
        if not cart_id:
            return self._empty_cart()

        raw_items = await self.repo.get_cart_items(cart_id)
        return self._build_cart_response(cart_id, raw_items)

    async def add_item(self, user_id: int, data: AddToCartRequest) -> dict:
        """
        Add an item to cart — or increment quantity if already present.

        Steps:
        1. Validate product and variant exist and are active
        2. Check stock availability
        3. Get or create cart
        4. Check cart item limit
        5. If item exists → increment. Else → insert with price snapshot.
        6. Return full cart
        """
        # Step 1: Validate product
        if not await self.repo.product_exists(data.product_id):
            raise NotFoundException("Product")

        if data.product_variant_id:
            if not await self.repo.variant_belongs_to_product(
                data.product_variant_id, data.product_id
            ):
                raise NotFoundException("Product variant")

        # Step 2: Stock check
        stock = await self.repo.get_available_stock(
            data.product_id, data.product_variant_id
        )
        if stock is None or stock < data.quantity:
            raise OutOfStockException(available=stock or 0)

        # Step 3: Get or create cart
        cart_id = await self.repo.get_or_create_cart(user_id)

        # Step 4: Check if item already in cart
        existing = await self.repo.find_existing_item(
            cart_id, data.product_id, data.product_variant_id
        )

        if existing:
            new_qty = existing["quantity"] + data.quantity
            if new_qty > 50:
                raise ConflictException("Cannot have more than 50 units of one item in cart.")
            if new_qty > stock:
                raise OutOfStockException(available=stock)
            await self.repo.increment_item_quantity(existing["id"], data.quantity)
        else:
            # Check cart item limit (distinct lines, not total quantity)
            raw_items = await self.repo.get_cart_items(cart_id)
            if len(raw_items) >= MAX_CART_ITEMS:
                raise ConflictException(
                    f"Cart cannot have more than {MAX_CART_ITEMS} different items."
                )

            # Capture live price as snapshot
            price = await self.repo.get_current_price(
                data.product_id, data.product_variant_id
            )
            if price is None:
                raise NotFoundException("Product price")

            await self.repo.add_item(
                cart_id=cart_id,
                product_id=data.product_id,
                product_variant_id=data.product_variant_id,
                quantity=data.quantity,
                price_snapshot=float(price),
            )

        return await self.get_cart(user_id)

    async def update_item(
        self, user_id: int, item_id: int, data: UpdateCartItemRequest
    ) -> dict:
        cart_id = await self.repo.get_cart_id(user_id)
        if not cart_id:
            raise NotFoundException("Cart")

        item = await self.repo.get_cart_item(cart_id, item_id)
        if not item:
            raise NotFoundException("Cart item")

        # Stock check against new quantity
        stock = await self.repo.get_available_stock(
            item["product_id"], item["product_variant_id"]
        )
        if stock is not None and data.quantity > stock:
            raise OutOfStockException(available=stock)

        await self.repo.update_item_quantity(item_id, data.quantity)
        return await self.get_cart(user_id)

    async def remove_item(self, user_id: int, item_id: int) -> dict:
        cart_id = await self.repo.get_cart_id(user_id)
        if not cart_id:
            raise NotFoundException("Cart")

        deleted = await self.repo.delete_item(item_id, cart_id)
        if not deleted:
            raise NotFoundException("Cart item")

        return await self.get_cart(user_id)

    async def clear_cart(self, user_id: int) -> None:
        cart_id = await self.repo.get_cart_id(user_id)
        if cart_id:
            await self.repo.clear_cart(cart_id)

    # ── Private helpers ───────────────────────────────────────

    def _empty_cart(self) -> dict:
        return {
            "cart_id": None,
            "items": [],
            "item_count": 0,
            "total_quantity": 0,
            "subtotal": Decimal("0"),
            "price_change_warning": False,
        }

    def _build_cart_response(self, cart_id: int, raw_items: list[dict]) -> dict:
        """
        Transform raw DB rows into a clean CartResponse.
        Calculates subtotals, detects price changes, builds variant labels.
        """
        items = []
        total_subtotal = Decimal("0")
        any_price_changed = False

        for row in raw_items:
            snapshot = Decimal(str(row["price_snapshot"]))
            current  = Decimal(str(row["current_price"]))
            qty      = row["quantity"]
            subtotal = snapshot * qty
            price_changed = snapshot != current

            if price_changed:
                any_price_changed = True

            # Clean up variant label — remove stray " / " if only one attr
            variant_label = row.get("variant_label")
            if variant_label:
                variant_label = variant_label.strip(" /")
                if variant_label == "/":
                    variant_label = None

            items.append({
                "id":                 row["id"],
                "product_id":         row["product_id"],
                "product_variant_id": row["product_variant_id"],
                "product_name":       row["product_name"],
                "variant_label":      variant_label,
                "primary_image":      row.get("primary_image"),
                "price_snapshot":     snapshot,
                "current_price":      current,
                "price_changed":      price_changed,
                "quantity":           qty,
                "subtotal":           subtotal,
            })

            total_subtotal += subtotal

        return {
            "cart_id":              cart_id,
            "items":                items,
            "item_count":           len(items),
            "total_quantity":       sum(i["quantity"] for i in items),
            "subtotal":             total_subtotal,
            "price_change_warning": any_price_changed,
        }