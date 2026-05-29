# SMART CART — BACKEND INSTRUCTIONS
## AI Agent Reference Document

> **CRITICAL RULE FOR ANY AI READING THIS:**
> Read this entire document before writing a single line of code.
> Follow the Agent Protocol in Section 1 exactly.
> Update Section 11 (Changelog) after every completed task.

---

## SECTION 1 — AGENT PROTOCOL (READ FIRST)

You are a **senior backend engineer** working on Smart Cart — a production-grade
e-commerce API. You help the developer step by step, never dumping all code at once.

### Your Behavior Rules

**When given ANY new task (new module, new feature, bug fix):**

**Step 1 — Ask clarifying questions first**
Before writing any code, ask what you need to know:
- What inputs does this feature take?
- What should it return?
- Are there business rules (limits, validations, permissions)?
- Does it need a DB migration or new table?

**Step 2 — Show the full plan, wait for approval**
Write out:
```
PLAN: [Feature Name]
Files to create/modify:
  1. scripts/XXX_migration.sql  (if DB change needed)
  2. app/modules/XXX/schemas.py
  3. app/modules/XXX/repository.py
  4. app/modules/XXX/service.py
  5. app/modules/XXX/router.py
  6. app/main.py (register router)

Endpoints:
  POST /api/v1/XXX  → description
  GET  /api/v1/XXX  → description

DB changes: [table names]
```
**Wait for "looks good" or corrections before writing code.**

**Step 3 — Write files one at a time**
- Write one file → stop → wait for confirmation or error report
- Fix any error before moving to the next file
- Never write the next file until the current one works

**Step 4 — Update this document**
After completing a task, add an entry to Section 11 (Changelog).

### What NEVER to do
- Never write all files at once without step-by-step confirmation
- Never use f-string SQL — always parameterized queries (`$1, $2, $3`)
- Never add business logic to `repository.py` — that goes in `service.py`
- Never add SQL queries to `service.py` — that goes in `repository.py`
- Never hardcode secrets — everything comes from `settings` (config.py)
- Never change the response envelope format
- Never add new dependencies without asking first

---

## SECTION 2 — PROJECT OVERVIEW

| Item | Value |
|---|---|
| Project Name | Smart Cart |
| Type | Production E-Commerce REST API (Portfolio) |
| Framework | FastAPI (Python 3.12) |
| Database | PostgreSQL 18.1 |
| DB Driver | asyncpg (async, raw SQL — NO ORM) |
| Auth | JWT (access token 15min + refresh token 7 days) |
| Payments | Razorpay (test mode) |
| Container | Docker (python:3.12-slim) |
| API Prefix | `/api/v1` |
| Docs URL | `http://localhost:8000/docs` (Swagger UI) |
| Health Check | `http://localhost:8000/health` |

### Key Design Decisions
- **No ORM** — every DB query is raw SQL via asyncpg
- **Clean Architecture** — Route → Service → Repository → DB
- **Repository** only touches DB, returns dicts
- **Service** contains all business logic, raises domain exceptions
- **Router** only parses HTTP, calls service, formats response
- **All responses** use the standard envelope (success/error format)
- **Roles** are UPPERCASE strings: `ADMIN`, `SELLER`, `CUSTOMER`

---

## SECTION 3 — FOLDER STRUCTURE

```
smart-cart-api/
│
├── .env                        ← Environment variables (never commit)
├── .gitignore
├── Dockerfile
├── README.md
├── requirements.txt
│
├── app/
│   ├── main.py                 ← App init, middleware, router registration
│   ├── config.py               ← Settings loaded from .env via pydantic-settings
│   ├── database.py             ← asyncpg connection pool (create/close/get)
│   │
│   ├── core/
│   │   ├── dependencies.py     ← FastAPI Depends: get_current_user, require_admin, require_seller
│   │   ├── exceptions.py       ← AppException hierarchy (all custom exceptions)
│   │   └── security.py         ← bcrypt hash/verify, JWT create/decode, refresh token utils
│   │
│   ├── modules/
│   │   ├── auth/               ← Register, Login, Refresh, Logout, Verify Email, Password Reset
│   │   │   ├── repository.py
│   │   │   ├── router.py
│   │   │   ├── schemas.py
│   │   │   └── service.py
│   │   │
│   │   ├── users/              ← Profile CRUD, Address management
│   │   │   ├── repository.py
│   │   │   ├── router.py
│   │   │   ├── schemas.py
│   │   │   └── service.py
│   │   │
│   │   ├── categories/         ← Category tree, CRUD, slug-based routing
│   │   │   ├── repository.py
│   │   │   ├── router.py
│   │   │   ├── schemas.py
│   │   │   └── service.py
│   │   │
│   │   ├── products/           ← Product CRUD, variants, images, search+filter
│   │   │   ├── repository.py
│   │   │   ├── router.py
│   │   │   ├── schemas.py
│   │   │   └── service.py
│   │   │
│   │   ├── cart/               ← Cart CRUD, price snapshots, stock validation
│   │   │   ├── repository.py
│   │   │   ├── router.py
│   │   │   ├── schemas.py
│   │   │   └── service.py
│   │   │
│   │   ├── orders/             ← Place order (atomic tx), state machine, cancel, coupon
│   │   │   ├── repository.py
│   │   │   ├── router.py
│   │   │   ├── schemas.py
│   │   │   └── service.py
│   │   │
│   │   ├── payments/           ← Razorpay initiate, verify, webhook handler
│   │   │   ├── repository.py
│   │   │   ├── router.py
│   │   │   ├── schemas.py
│   │   │   └── service.py
│   │   │
│   │   ├── reviews/            ← Product reviews (verified purchase only), moderation
│   │   │   ├── repository.py
│   │   │   ├── router.py
│   │   │   ├── schemas.py
│   │   │   └── service.py
│   │   │
│   │   └── returns/            ← Return requests, admin approve/reject
│   │       ├── repository.py
│   │       ├── router.py
│   │       ├── schemas.py
│   │       └── service.py
│   │
│   └── utils/
│       └── response.py         ← success_response() and error_response() helpers
│
└── scripts/
    ├── 01_schema.sql               ← All 20 tables, indexes, triggers, DB functions
    ├── 02_seed_reference_data.sql  ← Roles, order states, payment methods, categories, coupons
    ├── phase1_auth_migration.sql   ← refresh_tokens, coupon_usage, user_login_audit tables + functions
    ├── phase2_sample_data.sql      ← 3 sample products with variants + images for testing
    ├── phase4_orders_migration.sql ← generate_order_number(), get_user_coupon_usage() functions
    ├── phase5_payments_migration.sql ← payments table for Razorpay tracking
    └── verify_schema.sql           ← Health check: table counts, indexes, triggers, readiness
```

---

## SECTION 4 — ENVIRONMENT & RUNNING

### .env file (all required variables)
```env
# Application
APP_NAME=SmartCart
APP_ENV=development
DEBUG=true
API_V1_PREFIX=/api/v1

# Database
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/smartcart
DB_MIN_CONNECTIONS=2
DB_MAX_CONNECTIONS=10

# JWT
JWT_SECRET_KEY=your-secret-key-minimum-32-chars
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Razorpay
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here

# Cookie
COOKIE_SECURE=false
COOKIE_SAMESITE=lax

# Rate Limiting
LOGIN_MAX_ATTEMPTS=5
LOGIN_WINDOW_SECONDS=60
```

### Dockerfile
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Run Commands
```bash
# Build
docker build -t smart-cart-api .

# Run (always pass --env-file)
docker run --env-file .env -p 8000:8000 smart-cart-api

# Local dev (no Docker)
uvicorn app.main:app --reload --port 8000
```

### Database Setup Order (run once, in this exact order)
```
1. scripts/01_schema.sql               → creates all 20 tables
2. scripts/02_seed_reference_data.sql  → seeds roles, states, methods, categories
3. scripts/phase1_auth_migration.sql   → adds auth-specific tables + functions
4. scripts/phase2_sample_data.sql      → adds 3 sample products (dev only)
5. scripts/phase4_orders_migration.sql → adds order number generator function
6. scripts/phase5_payments_migration.sql → adds payments table
7. scripts/verify_schema.sql           → run to confirm everything is correct
```

---

## SECTION 5 — DATABASE SCHEMA

### All Tables (25 total)

| Table | Description | Key Columns |
|---|---|---|
| `users` | User accounts | id, email, password_hash, first_name, last_name, is_active, soft_delete |
| `roles` | Role definitions | id, name (ADMIN/SELLER/CUSTOMER) |
| `user_role` | User ↔ Role mapping | user_id, role_id |
| `user_addresses` | Shipping/billing addresses | user_id, address_type, is_default |
| `email_verification_tokens` | Email verify tokens | user_id, token, expires_at, is_used |
| `password_reset_tokens` | Password reset tokens | user_id, token, expires_at, is_used |
| `refresh_tokens` | JWT refresh tokens (hashed) | user_id, token_hash, expires_at, is_revoked |
| `user_login_audit` | Every login attempt | user_id, email_attempted, status, ip_address |
| `category` | Product categories (tree) | id, name, slug, parent_category_id |
| `products` | Product catalog | id, name, slug, price, stock, is_active, is_featured |
| `product_variants` | Size/color variants | product_id, sku, size, color, price, stock |
| `product_images` | Product images | product_id, image_url, is_primary |
| `cart` | One cart per user | id, user_id (UNIQUE) |
| `cart_items` | Items in cart | cart_id, product_id, variant_id, quantity, price_snapshot |
| `wishlist` | Saved products | user_id, product_id |
| `order_state` | Reference: order states | id, name (PENDING/CONFIRMED/etc.) |
| `payment_method` | Reference: payment types | id, name (UPI/COD/etc.) |
| `payment_status` | Reference: payment states | id, name (PENDING/PAID/etc.) |
| `coupon_code` | Discount coupons | code, discount_type, discount_value, usage_limit |
| `coupon_usage` | Coupon usage tracking | coupon_id, user_id, order_id |
| `tax_rates` | GST rates | country, state, rate |
| `orders` | Customer orders | id, user_id, order_number, total_price, order_state_id |
| `order_items` | Items in an order | order_id, product_id, quantity, price_per_unit |
| `order_status_history` | Auto-logged state changes | order_id, order_state_id (via DB trigger) |
| `product_reviews` | Product ratings + text | product_id, user_id, order_id, rating, is_approved |
| `returns` | Return requests | order_id, return_number, status, refund_amount |
| `return_items` | Items in a return | return_id, order_item_id, quantity |
| `payments` | Razorpay payment records | order_id, razorpay_order_id, status |

### DB Functions
| Function | Purpose |
|---|---|
| `update_updated_at_column()` | Trigger: auto-updates `updated_at` on all tables |
| `update_product_rating()` | Trigger: recalculates `average_rating` + `total_reviews` on review insert/update |
| `create_order_status_history()` | Trigger: auto-logs order state changes to `order_status_history` |
| `get_user_with_roles(email)` | Returns user + roles array in one query (used at login) |
| `cleanup_expired_tokens()` | Purges expired refresh/verification/reset tokens |
| `generate_order_number()` | Generates order numbers: `SC-20240506-000001` |
| `get_user_coupon_usage(coupon_id, user_id)` | Returns how many times a user used a coupon |

---

## SECTION 6 — API ENDPOINTS (All 50+)

All endpoints prefixed with `/api/v1`.
🔓 = Public | 🔐 = Authenticated | 👑 = Admin only | 🏪 = Seller or Admin

### Auth Module (`/auth`)
```
🔓 POST   /auth/register           → Register new account
🔓 POST   /auth/login              → Login, get access token + set refresh cookie
🔓 POST   /auth/refresh            → Refresh access token via HTTP-only cookie
🔐 POST   /auth/logout             → Revoke refresh token, clear cookie
🔐 POST   /auth/logout-all         → Revoke ALL refresh tokens (all devices)
🔓 POST   /auth/verify-email       → Verify email with token
🔓 POST   /auth/forgot-password    → Request password reset
🔓 POST   /auth/reset-password     → Reset password with token
🔐 GET    /auth/me                 → Get current user info from JWT (no DB call)
```

### Users Module (`/users`)
```
🔐 GET    /users/me                          → Full profile with roles
🔐 PATCH  /users/me                          → Update profile (PATCH = only changed fields)
🔐 GET    /users/me/addresses                → List addresses (default first)
🔐 POST   /users/me/addresses                → Add address (max 5)
🔐 PUT    /users/me/addresses/{id}           → Full replace address
🔐 DELETE /users/me/addresses/{id}           → Delete (auto-promotes next as default)
🔐 PATCH  /users/me/addresses/{id}/default   → Set as default
```

### Categories Module (`/categories`)
```
🔓 GET    /categories                → Flat top-level list
🔓 GET    /categories/tree           → Full nested tree (for nav menus)
🔓 GET    /categories/{slug}         → Detail + children + breadcrumb
👑 POST   /categories                → Create category
👑 PATCH  /categories/{id}           → Update category
👑 DELETE /categories/{id}           → Soft delete (blocked if has products/children)
```

### Products Module (`/products`)
```
🔓 GET    /products                           → List (search, filter, sort, paginate)
🔓 GET    /products/{slug}                    → Full detail + variants + images
👑 POST   /products                           → Create product
👑 PATCH  /products/{id}                      → Update product
👑 DELETE /products/{id}                      → Soft delete
👑 POST   /products/{id}/variants             → Add variant
👑 PATCH  /products/{id}/variants/{vid}       → Update variant
👑 DELETE /products/{id}/variants/{vid}       → Delete variant
👑 POST   /products/{id}/images               → Add image
👑 DELETE /products/{id}/images/{img_id}      → Delete image
```

### Cart Module (`/cart`)
```
🔐 GET    /cart                  → Full cart with subtotals + price-change flags
🔐 POST   /cart/items            → Add item (increments qty if duplicate)
🔐 PATCH  /cart/items/{id}       → Update item quantity
🔐 DELETE /cart/items/{id}       → Remove item
🔐 DELETE /cart                  → Clear entire cart
```

### Orders Module (`/orders`)
```
🔐 POST   /orders                     → Place order from cart (atomic transaction)
🔐 GET    /orders                     → My order history (customer)
👑 GET    /orders/admin/all           → All orders (admin)
🔐 GET    /orders/{id}                → Order detail (customer sees own, admin sees all)
🔐 POST   /orders/{id}/cancel         → Cancel order (customer: PENDING/CONFIRMED only)
👑 PATCH  /orders/{id}/state          → Update order state (state machine validated)
🔐 GET    /orders/validate-coupon     → Validate coupon before checkout
```

### Payments Module (`/payments`)
```
🔐 POST   /payments/initiate          → Create Razorpay order, return credentials
🔐 POST   /payments/verify            → Verify payment signature (client-side confirmation)
🔓 POST   /payments/webhook           → Razorpay server-to-server webhook
🔐 GET    /payments/status/{order_id} → Check payment status
```

### Reviews Module
```
🔓 GET    /products/{id}/reviews      → Paginated reviews + rating breakdown
🔐 POST   /products/{id}/reviews      → Submit review (verified purchase only)
🔐 PATCH  /reviews/{id}               → Edit own review (resets to pending approval)
🔐 DELETE /reviews/{id}               → Delete (owner or admin)
🔐 POST   /reviews/{id}/helpful       → Mark as helpful
👑 GET    /admin/reviews/pending      → Moderation queue
👑 PATCH  /admin/reviews/{id}/approve → Approve and publish
```

### Returns Module (`/returns`)
```
🔐 POST   /returns                     → Raise return (DELIVERED orders only)
🔐 GET    /returns                     → My return requests
🔐 GET    /returns/{id}                → Return detail
👑 GET    /returns/admin/all           → All returns
👑 POST   /returns/admin/{id}/process  → Approve/reject return
```

### System
```
🔓 GET    /health    → DB health check
🔓 GET    /          → Welcome message
```

---

## SECTION 7 — CODE PATTERNS

Every AI must follow these patterns exactly. Do not invent new patterns.

### 7.1 — Response Envelope (NEVER change this format)
```python
# Success
from app.utils.response import success_response, error_response

return success_response(
    data={"key": "value"},
    message="Operation successful.",
    status_code=200,         # or 201 for creates
    meta={                   # optional — for pagination
        "page": 1,
        "per_page": 20,
        "total": 150,
        "total_pages": 8,
    }
)

# JSON output:
# { "success": true, "message": "...", "data": {...}, "meta": {...} }

# Error (raised via exceptions — never call error_response in routes)
# JSON output:
# { "success": false, "error": { "code": "...", "message": "..." } }
```

### 7.2 — Custom Exceptions (always use these, never raise HTTPException directly)
```python
from app.core.exceptions import (
    NotFoundException,           # 404
    ConflictException,           # 409
    EmailAlreadyExistsException, # 409
    InvalidCredentialsException, # 401
    TokenExpiredException,       # 401
    TokenInvalidException,       # 401
    InsufficientPermissionsException, # 403
    AccountInactiveException,    # 403
)

# Creating a new domain exception for a module:
from app.core.exceptions import AppException
from fastapi import status

class MyModuleException(AppException):
    def __init__(self, msg: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            error_code="MY_MODULE_ERROR_CODE",
            message=msg,
        )
```

### 7.3 — Repository Pattern (raw SQL only)
```python
# app/modules/example/repository.py
import asyncpg

class ExampleRepository:
    def __init__(self, db: asyncpg.Connection):
        self.db = db

    # Single row → fetchrow → dict or None
    async def get_by_id(self, item_id: int) -> dict | None:
        row = await self.db.fetchrow(
            "SELECT id, name FROM example_table WHERE id = $1",
            item_id,
        )
        return dict(row) if row else None

    # Multiple rows → fetch → list of dicts
    async def get_all(self) -> list[dict]:
        rows = await self.db.fetch("SELECT id, name FROM example_table")
        return [dict(r) for r in rows]

    # Single value → fetchval
    async def count(self) -> int:
        return await self.db.fetchval("SELECT COUNT(*) FROM example_table")

    # Insert with RETURNING → fetchrow
    async def create(self, data: dict) -> dict:
        row = await self.db.fetchrow(
            """
            INSERT INTO example_table (name, value)
            VALUES ($1, $2)
            RETURNING id, name, value, created_at
            """,
            data["name"], data["value"],
        )
        return dict(row)

    # Update → execute or fetchrow
    async def update(self, item_id: int, fields: dict) -> dict | None:
        # Dynamic update — only update provided fields
        set_clauses = [f"{col} = ${i+2}" for i, col in enumerate(fields.keys())]
        row = await self.db.fetchrow(
            f"UPDATE example_table SET {', '.join(set_clauses)} WHERE id = $1 RETURNING *",
            item_id, *list(fields.values()),
        )
        return dict(row) if row else None

    # Delete → execute, check affected rows
    async def delete(self, item_id: int) -> bool:
        result = await self.db.execute(
            "DELETE FROM example_table WHERE id = $1", item_id,
        )
        return result == "DELETE 1"
```

### 7.4 — Service Pattern
```python
# app/modules/example/service.py
import asyncpg
from app.modules.example.repository import ExampleRepository
from app.modules.example.schemas import CreateExampleRequest
from app.core.exceptions import NotFoundException, ConflictException

class ExampleService:
    def __init__(self, db: asyncpg.Connection):
        self.repo = ExampleRepository(db)

    async def get_item(self, item_id: int) -> dict:
        item = await self.repo.get_by_id(item_id)
        if not item:
            raise NotFoundException("Item")    # raises 404
        return item

    async def create_item(self, data: CreateExampleRequest) -> dict:
        # Business logic lives here — not in repository or router
        exists = await self.repo.name_exists(data.name)
        if exists:
            raise ConflictException("An item with this name already exists.")

        return await self.repo.create(data.model_dump())

    # Transactions: use async with db.transaction()
    async def atomic_operation(self, db: asyncpg.Connection) -> dict:
        async with db.transaction():
            # All operations here are atomic — all succeed or all rollback
            item = await self.repo.create({...})
            await self.repo.update(item["id"], {...})
        return item
```

### 7.5 — Router Pattern
```python
# app/modules/example/router.py
from fastapi import APIRouter, Depends
import asyncpg
from app.modules.example.schemas import CreateExampleRequest
from app.modules.example.service import ExampleService
from app.core.dependencies import get_current_user, require_admin, TokenData
from app.database import get_db
from app.utils.response import success_response

router = APIRouter(prefix="/example", tags=["Example"])

# Public endpoint
@router.get("")
async def list_items(db: asyncpg.Connection = Depends(get_db)):
    service = ExampleService(db)
    items = await service.get_all()
    return success_response(data=items, message="Items fetched.")

# Authenticated endpoint
@router.get("/{item_id}")
async def get_item(
    item_id: int,
    current_user: TokenData = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    service = ExampleService(db)
    item = await service.get_item(item_id)
    return success_response(data=item, message="Item fetched.")

# Admin only endpoint
@router.post("", status_code=201)
async def create_item(
    data: CreateExampleRequest,
    _: TokenData = Depends(require_admin),
    db: asyncpg.Connection = Depends(get_db),
):
    service = ExampleService(db)
    item = await service.create_item(data)
    return success_response(data=item, message="Item created.", status_code=201)
```

### 7.6 — Auth Dependencies (use these in routes)
```python
from app.core.dependencies import (
    get_current_user,      # any logged-in user → TokenData
    require_admin,         # ADMIN role required → TokenData
    require_seller,        # SELLER or ADMIN required → TokenData
    get_optional_user,     # returns TokenData or None (public routes)
)

# TokenData has:
current_user.user_id   # int
current_user.email     # str
current_user.roles     # list[str] — e.g. ['ADMIN']
current_user.is_admin()   # bool
current_user.is_seller()  # bool
current_user.has_role("CUSTOMER")  # bool
```

### 7.7 — Registering a New Module in main.py
```python
# In app/main.py, add import:
from app.modules.newmodule.router import router as newmodule_router

# Then register:
app.include_router(newmodule_router, prefix=settings.API_V1_PREFIX)
```

### 7.8 — SQL Conventions
```python
# ✅ CORRECT — parameterized
await db.fetchrow("SELECT * FROM users WHERE email = $1", email)
await db.execute("UPDATE users SET name = $1 WHERE id = $2", name, user_id)

# ❌ WRONG — SQL injection risk, never do this
await db.fetchrow(f"SELECT * FROM users WHERE email = '{email}'")

# Timestamps: use ::TEXT for returning timestamps as strings
# (asyncpg returns datetime objects by default which may cause JSON serialization issues)
"SELECT created_at::TEXT AS created_at FROM orders WHERE id = $1"
```

---

## SECTION 8 — SECURITY PATTERNS

### JWT Strategy
```
Access Token:   15 min TTL | In Authorization: Bearer header | Stored in React memory
Refresh Token:  7 day TTL  | HTTP-only cookie               | SHA-256 hashed in DB
```

### Password Hashing
```python
from app.core.security import hash_password, verify_password
hashed = hash_password("plaintext")          # bcrypt, cost=12
ok     = verify_password("plaintext", hashed)
```

### Token Generation
```python
from app.core.security import (
    create_access_token,       # JWT access token
    generate_refresh_token,    # random 256-bit URL-safe string (raw)
    hash_refresh_token,        # SHA-256 hash — store this in DB, not raw token
    get_refresh_token_expiry,  # datetime 7 days from now
)
```

### Role Check in Service (when you need role info in business logic)
```python
# In service methods that receive user_id, check role if needed:
# Prefer passing roles from the router via dependency injection
# rather than doing a DB lookup in the service
```

---

## SECTION 9 — CURRENT MODULES STATUS

| Module | Status | Key Business Rules |
|---|---|---|
| **Auth** | ✅ Complete | Refresh token rotation, SHA-256 token storage, audit logging |
| **Users** | ✅ Complete | Max 5 addresses, auto-promote default on delete |
| **Categories** | ✅ Complete | 2-level max nesting, blocked delete if has products |
| **Products** | ✅ Complete | Auto-slug generation, max 10 images, variant stock tracking |
| **Cart** | ✅ Complete | Price snapshots, max 20 items, max 50 qty, stock validation |
| **Orders** | ✅ Complete | Atomic transaction, state machine, stock deducted on place |
| **Payments** | ✅ Complete | Razorpay integration, webhook verification, idempotent |
| **Reviews** | ✅ Complete | Verified purchase only, edit resets approval, DB trigger updates rating |
| **Returns** | ✅ Complete | DELIVERED orders only, item qty validation, atomic creation |

### Order State Machine
```
PENDING → CONFIRMED → PROCESSING → SHIPPED → OUT_FOR_DELIVERY → DELIVERED
   │           │            │                                        │
   └───────────┴────────────┴── CANCELLED ──────────────────────────┘
                                                                     │
                                              RETURN_REQUESTED ──────┘
                                              ├── RETURN_APPROVED → REFUNDED
                                              └── RETURN_REJECTED
```

### Business Constants (defined in service.py files)
```python
MAX_CART_ITEMS = 20              # distinct product lines per cart
MAX_CART_QTY_PER_ITEM = 50      # qty of one item
MAX_ADDRESSES = 5                # per user
MAX_PRODUCT_IMAGES = 10         # per product
FREE_SHIPPING_THRESHOLD = 499   # INR — below this, charge ₹49
SHIPPING_CHARGE = 49            # INR
TAX_RATE = 0.18                 # 18% GST (flat for simplicity)
```

---

## SECTION 10 — ADDING A NEW MODULE (Template)

When adding a new module, follow this checklist:

**1. Migration script (if new table needed)**
```
scripts/phaseX_modulename_migration.sql
```

**2. Create module folder**
```
app/modules/modulename/
├── __init__.py
├── schemas.py      ← Pydantic request + response models
├── repository.py   ← Raw SQL only
├── service.py      ← Business logic
└── router.py       ← HTTP routes
```

**3. Register in main.py**
```python
from app.modules.modulename.router import router as modulename_router
app.include_router(modulename_router, prefix=settings.API_V1_PREFIX)
```

**4. Update this document — Section 9 (module status) + Section 6 (endpoints) + Section 11 (changelog)**

---

## SECTION 11 — CHANGELOG

> **AI INSTRUCTION:** After completing any task, add a row here.
> Format: `| Date | What changed | Files modified |`

| Version | What Changed | Files Modified |
|---|---|---|
| v1.0 | Initial backend complete — all 9 modules built | All files |
| v1.1 | Razorpay payment integration added | payments/*, main.py, config.py, .env, requirements.txt, phase5_payments_migration.sql |
| v1.2 | BACKEND_INSTRUCTIONS.md created | BACKEND_INSTRUCTIONS.md |

---

## SECTION 12 — COMMON ERRORS & FIXES

| Error | Cause | Fix |
|---|---|---|
| `Extra inputs are not permitted` (pydantic) | .env has vars not in Settings class | Add missing var to `app/config.py` Settings class |
| `asyncpg.exceptions.UniqueViolationError` | Duplicate DB insert | Handle at service level with ConflictException |
| `NoneType has no attribute X` | fetchrow returned None | Always check `if not row: raise NotFoundException` |
| `ValidationError` on startup | Missing required .env var | Add the var to .env |
| `401 on /users/me at startup` | bootstrapAuth called without token | Expected behavior — bootstrap returns early if no token |
| `payment.captured webhook 400` | Wrong webhook secret in .env | Match RAZORPAY_WEBHOOK_SECRET with Razorpay Dashboard |
| `asyncpg.exceptions.UndefinedFunctionError` | Migration not run | Run the relevant phase migration SQL |