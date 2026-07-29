# ════════════════════════════════════════════════════════════════
# SMART CART — BACKEND INSTRUCTIONS
# AI Agent Reference Document
#
# CRITICAL: Read this ENTIRE document before writing a single line of code.
# Follow the Agent Protocol in Section 1 exactly.
# After completing any task, update Sections 3, 10, and 14.
# ════════════════════════════════════════════════════════════════

---

## SECTION 1 — AGENT PROTOCOL (READ FIRST)

You are a **senior backend engineer** on Smart Cart — a production-grade e-commerce API.
Work step by step. Never dump all code at once.

### Workflow

**Step 1 — Ask clarifying questions before any code.**
- What inputs does this feature take?
- What should it return?
- Are there business rules (limits, validations, permissions)?
- Does it need a DB migration or a new table?

**Step 2 — Show the full plan. Wait for approval.**
```
PLAN: [Feature Name]
Files to create/modify:
  1. scripts/phaseX_description_migration.sql  (if DB change needed)
  2. app/modules/xxx/schemas.py
  3. app/modules/xxx/repository.py
  4. app/modules/xxx/service.py
  5. app/modules/xxx/router.py
  6. app/main.py

Endpoints:
  POST /api/v1/xxx  → request body shape + response shape
  GET  /api/v1/xxx  → query params + response shape

DB changes: [table names]
```

> **If this module also needs a frontend page:** include a clear "Frontend Contract" block
> in the plan showing exactly what endpoints the frontend will call and what shape each
> response returns. The developer will copy this block to the frontend AI.

**Step 3 — Write one file. Stop. Wait for confirmation.**
- Fix any error before moving to the next file.
- Never write the next file until the current one works.

**Step 4 — Update this document (every time, no exceptions).**
- **Section 3** — add every new file to the folder tree
- **Section 6** — add all new endpoints to the API Endpoints section
- **Section 10** — mark the module ✅ Complete or ⚠️ Needs Testing
- **Section 14** — overwrite the entire current state snapshot

**If this module is in the "Backend + Frontend both needed" table in Section 14:**
Update its Backend column from 🔲 to ✅ in the table.
Add this note below the updated row:
`→ Developer: open FRONTEND_INSTRUCTIONS.md Section 10 and add these new endpoints, then update the frontend doc's Section 15 — move this module to "Frontend only — backend ✅".`

---

### How the Developer Uses This Document

**Single-side task** (backend only — no frontend needed):
Send only `BACKEND_INSTRUCTIONS.md`.

**Both-sides task** (module needs backend routes AND a frontend page):
1. Start here — build the backend routes first.
2. After completion, this doc will have the new endpoints in Section 6.
3. Send **both** `BACKEND_INSTRUCTIONS.md` + `FRONTEND_INSTRUCTIONS.md` to the frontend AI.
   Tell it: *"FRONTEND_INSTRUCTIONS.md is your primary doc.
   Use BACKEND_INSTRUCTIONS.md Section 6 for the new endpoints."*

**After every completed task:**
The AI outputs updated section content. Save it as the new version of the file immediately.
Never use a stale doc — an outdated doc causes the next AI to build on wrong assumptions.

---

### ⚑ Hard Rule — File Path on Line One (Every File, No Exceptions)

The very first line of every file must be the full path as a comment:

```python
# app/modules/orders/repository.py
# app/modules/orders/service.py
# app/modules/orders/router.py
# app/modules/orders/schemas.py
# app/core/dependencies.py
```
```sql
-- scripts/phase6_wishlist_migration.sql
-- scripts/verify_schema.sql
```

If this line is missing, the developer cannot place the file. No exceptions ever.

---

### All Other Hard Rules

- Never use f-string SQL — always parameterized queries (`$1, $2, $3`)
- Never add business logic to `repository.py` — that goes in `service.py`
- Never add SQL queries to `service.py` — that goes in `repository.py`
- Never hardcode secrets — everything comes from `settings` in `config.py`
- Never change the response envelope format (Section 7.1)
- Never raise `HTTPException` directly — use custom exceptions from `app/core/exceptions.py`
- Never add new dependencies without asking first
- Never use `datetime.now()` in SQL — use `NOW()` in the query or let the DB default handle it
- Never write all files at once — one file at a time, step by step

---

## SECTION 2 — PROJECT OVERVIEW

| Item | Value |
|---|---|
| Project Name | Smart Cart |
| Type | Production E-Commerce REST API (Portfolio) |
| Framework | FastAPI (Python 3.12) |
| Database | PostgreSQL 18.1 |
| DB Driver | asyncpg (async, raw SQL — NO ORM) |
| Auth | JWT (access token 15 min + refresh token 7 days) |
| Payments | Razorpay (test mode) |
| Container | Docker (python:3.12-slim) |
| API Prefix | `/api/v1` |
| Docs | `http://localhost:8000/docs` (Swagger UI) |
| Health Check | `http://localhost:8000/health` |

### Architecture — Never Skip Layers
```
HTTP Request → Router → Service → Repository → asyncpg → PostgreSQL
```
- **Router** — parses HTTP only, calls service, returns `success_response()`
- **Service** — all business logic, raises domain exceptions, handles transactions
- **Repository** — raw SQL only, converts rows to dicts, no logic
- Roles are UPPERCASE strings: `ADMIN`, `SELLER`, `CUSTOMER`

---

## SECTION 3 — FOLDER STRUCTURE

```
smart-cart-api/
├── .env                              ← never commit — see Section 4
├── Dockerfile
├── requirements.txt
│
├── app/
│   ├── main.py                       ← app init, middleware, router registration, logging
│   ├── config.py                     ← Settings class loaded from .env via pydantic-settings
│   ├── database.py                   ← asyncpg connection pool (create / close / get)
│   │
│   ├── core/
│   │   ├── dependencies.py           ← get_current_user, require_admin, require_seller
│   │   ├── exceptions.py             ← AppException hierarchy — all custom exceptions here
│   │   └── security.py               ← bcrypt hash/verify, JWT create/decode, refresh token utils
│   │
│   ├── modules/
│   │   ├── auth/                     ✅ Register, Login, Refresh, Logout, Password Reset
│   │   ├── users/                    ✅ Profile CRUD, Address management (max 5)
│   │   ├── categories/               ✅ Tree, CRUD, slug, 2-level nesting limit
│   │   ├── products/                 ✅ CRUD, variants, images, search + filter
│   │   ├── cart/                     ✅ Price snapshots, stock validation, max 20 items
│   │   ├── orders/                   ✅ Atomic transaction, state machine, coupon, stock deduct
│   │   ├── payments/                 ⚠️ Razorpay initiate + verify + webhook
│   │   ├── reviews/                  ✅ Verified purchase gate, approval flow, DB trigger
│   │   └── returns/                  ✅ DELIVERED orders only, admin approve/reject
│   │       (each module has: __init__.py, schemas.py, repository.py, service.py, router.py)
│   │
│   └── utils/
│       └── response.py               ← success_response() and error_response() helpers
│
└── scripts/
    ├── 01_schema.sql                 ← all 25 tables, indexes, triggers, DB functions
    ├── 02_seed_reference_data.sql    ← roles, order states, payment methods, categories
    ├── phase1_auth_migration.sql     ← refresh_tokens, coupon_usage, user_login_audit
    ├── phase2_sample_data.sql        ← 3 sample products (dev only)
    ├── phase4_orders_migration.sql   ← generate_order_number() function
    ├── phase5_payments_migration.sql ← payments table
    └── verify_schema.sql             ← health check: table counts, indexes, triggers
```

---

## SECTION 4 — ENVIRONMENT & RUNNING

### `.env` (all required variables — never commit)
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

# Rate Limiting (⚠️ these vars exist but NO code enforces them — see Section 13)
LOGIN_MAX_ATTEMPTS=5
LOGIN_WINDOW_SECONDS=60
```

### Run Commands
```bash
# Docker
docker build -t smart-cart-api .
docker run --env-file .env -p 8000:8000 smart-cart-api

# Local dev
uvicorn app.main:app --reload --port 8000
```

### Database Setup (run once, in this exact order)
```
1. 01_schema.sql                 → all 25 tables
2. 02_seed_reference_data.sql    → reference data
3. phase1_auth_migration.sql     → auth tables + functions
4. phase2_sample_data.sql        → dev sample products
5. phase4_orders_migration.sql   → order number generator
6. phase5_payments_migration.sql → payments table
7. verify_schema.sql             → confirm everything is correct
```

> ⚠️ **No migration tracking table exists.** There is no record of which scripts have been applied.
> Most scripts are safe to re-run (`IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`).
> Exception: bare `INSERT` without `ON CONFLICT DO NOTHING` will duplicate data.
> **Rule for new migrations:** always add `ON CONFLICT DO NOTHING` to every INSERT.

---

## SECTION 5 — DATABASE SCHEMA

### Tables (25 total)

| Table | Description | Key Columns |
|---|---|---|
| `users` | User accounts | id, email, password_hash, first_name, last_name, is_active, **soft_delete** |
| `roles` | Role definitions | id, name (ADMIN/SELLER/CUSTOMER), is_active |
| `user_role` | User ↔ Role | user_id, role_id, is_active |
| `user_addresses` | Addresses | user_id, address_type, is_default |
| `refresh_tokens` | JWT refresh tokens (hashed) | user_id, token_hash, expires_at, is_revoked |
| `user_login_audit` | Login attempts | user_id, email_attempted, status, ip_address |
| `email_verification_tokens` | Email verify | user_id, token, expires_at, is_used |
| `password_reset_tokens` | Password reset | user_id, token, expires_at, is_used |
| `category` | Categories (tree) | id, name, slug, parent_category_id, **is_active** |
| `products` | Product catalog | id, name, slug, price, stock, **is_active**, is_featured |
| `product_variants` | Size/color variants | product_id, sku, price, stock, **is_active** |
| `product_images` | Images | product_id, image_url (VARCHAR 500), is_primary |
| `cart` | One per user | id, user_id UNIQUE |
| `cart_items` | Items in cart | cart_id, product_id, variant_id, quantity, price_snapshot |
| `wishlist` | Saved products | user_id, product_id |
| `order_state` | Reference: states | id, name (PENDING … REFUNDED) |
| `payment_method` | Reference: methods | id, name (UPI/COD/etc.), **is_active** |
| `coupon_code` | Discount coupons | code, discount_type, discount_value, usage_limit |
| `coupon_usage` | Usage tracking | coupon_id, user_id, order_id |
| `orders` | Customer orders | id, user_id, order_number, total_price, order_state_id |
| `order_items` | Items in order | order_id, product_id, quantity, price_per_unit |
| `order_status_history` | State changes | order_id, order_state_id (auto via DB trigger) |
| `product_reviews` | Ratings + text | product_id, user_id, order_id, rating, is_approved |
| `returns` | Return requests | order_id, return_number, status, refund_amount |
| `return_items` | Items in return | return_id, order_item_id, quantity |
| `payments` | Razorpay records | order_id, razorpay_order_id, status |

### ⚠️ Soft Delete — Critical Reference

There is NO base class enforcing soft delete filters. Every list query must add the filter manually.
If you forget it, deleted records will appear in responses.

| Table | Column | Filter to add |
|---|---|---|
| `users` | `soft_delete` (BOOLEAN) | `WHERE soft_delete = FALSE` |
| `products` | `is_active` (BOOLEAN) | `WHERE p.is_active = TRUE` |
| `product_variants` | `is_active` (BOOLEAN) | `WHERE pv.is_active = TRUE` |
| `category` | `is_active` (BOOLEAN) | `WHERE c.is_active = TRUE` |
| `roles` | `is_active` (BOOLEAN) | `WHERE r.is_active = TRUE` |
| `user_role` | `is_active` (BOOLEAN) | `WHERE ur.is_active = TRUE` |
| `payment_method` | `is_active` (BOOLEAN) | `WHERE pm.is_active = TRUE` |

> Note: `users` uses the column name `soft_delete`, all other tables use `is_active`.

### DB Functions

| Function | Purpose |
|---|---|
| `update_updated_at_column()` | Trigger: auto-updates `updated_at` on all tables |
| `update_product_rating()` | Trigger: recalculates `average_rating` + `total_reviews` on review change |
| `create_order_status_history()` | Trigger: auto-logs every order state change |
| `get_user_with_roles(email)` | Returns user + roles array in one query (used at login) |
| `cleanup_expired_tokens()` | Purges expired tokens — **must be run manually, nothing calls it** |
| `generate_order_number()` | Generates `SC-20240506-000001` style order numbers |
| `get_user_coupon_usage(coupon_id, user_id)` | Returns usage count for a user + coupon pair |

### Order State Machine

```
PENDING → CONFIRMED → PROCESSING → SHIPPED → OUT_FOR_DELIVERY → DELIVERED
   │           │            │                                        │
   └───────────┴────────────┴──────────── CANCELLED ────────────────┘
                                                                     │
                                              RETURN_REQUESTED ──────┘
                                              ├── RETURN_APPROVED → REFUNDED
                                              └── RETURN_REJECTED
```

State IDs (stable — frontend components depend on these numbers):
`PENDING=1, CONFIRMED=2, PROCESSING=3, SHIPPED=4, OUT_FOR_DELIVERY=5, DELIVERED=6, CANCELLED=7, RETURN_REQUESTED=8, RETURN_APPROVED=9, RETURN_REJECTED=10, REFUNDED=11`

---

## SECTION 6 — API ENDPOINTS (All 50+)

All endpoints prefixed with `/api/v1`.
🔓 = Public | 🔐 = Authenticated | 👑 = Admin only | 🏪 = Seller or Admin

### Auth (`/auth`)
```
🔓 POST  /auth/register
🔓 POST  /auth/login              → { access_token, user }
🔓 POST  /auth/refresh            → { access_token }
🔐 POST  /auth/logout
🔐 POST  /auth/logout-all         → revoke all devices
🔓 POST  /auth/verify-email
🔓 POST  /auth/forgot-password
🔓 POST  /auth/reset-password
🔐 GET   /auth/me                 → JWT decode only, no DB call
```

### Users (`/users`)
```
🔐 GET    /users/me
🔐 PATCH  /users/me                          → PATCH = only changed fields
🔐 GET    /users/me/addresses                → default address first
🔐 POST   /users/me/addresses                → max 5 per user
🔐 PUT    /users/me/addresses/{id}           → full replace
🔐 DELETE /users/me/addresses/{id}           → auto-promotes next as default
🔐 PATCH  /users/me/addresses/{id}/default
```

### Categories (`/categories`)
```
🔓 GET   /categories
🔓 GET   /categories/tree
🔓 GET   /categories/{slug}       → detail + children + breadcrumb
👑 POST  /categories
👑 PATCH /categories/{id}
👑 DELETE /categories/{id}        → blocked if has products or children
```

### Products (`/products`)
```
🔓 GET    /products               → paginated, filterable, sortable
  ⚠️ category_slug param = category NAME string (e.g. "Electronics"), NOT the slug field
🔓 GET    /products/{slug}        → full detail: variants + images
👑 POST   /products
👑 PATCH  /products/{id}
👑 DELETE /products/{id}          → soft delete
👑 POST   /products/{id}/variants
👑 PATCH  /products/{id}/variants/{vid}
👑 DELETE /products/{id}/variants/{vid}
👑 POST   /products/{id}/images   → stores URL string, no file upload
👑 DELETE /products/{id}/images/{img_id}
```

### Cart (`/cart`)
```
🔐 GET    /cart
🔐 POST   /cart/items             → body: { product_id, quantity, product_variant_id? }
🔐 PATCH  /cart/items/{id}        → body: { quantity }
🔐 DELETE /cart/items/{id}
🔐 DELETE /cart                   → clear all
```

### Orders (`/orders`)
```
🔐 POST   /orders                 → atomic tx: validates stock, deducts, creates order
🔐 GET    /orders                 → own orders
👑 GET    /orders/admin/all
🔐 GET    /orders/{id}            → customer sees own, admin sees all
🔐 POST   /orders/{id}/cancel     → body: { reason? }  (PENDING/CONFIRMED only)
👑 PATCH  /orders/{id}/state      → body: { order_state_id, notes? }
🔐 GET    /orders/validate-coupon → ?code=X&subtotal=Y
```

### Payments (`/payments`) ⚠️ Built, never tested with a live key
```
🔐 POST  /payments/initiate       → { razorpay_order_id, amount, currency, key_id }
🔐 POST  /payments/verify         → { razorpay_order_id, razorpay_payment_id, razorpay_signature }
🔓 POST  /payments/webhook        → Razorpay server-to-server
🔐 GET   /payments/status/{order_id}
```

### Reviews
```
🔓 GET   /products/{id}/reviews   → paginated + rating breakdown
🔐 POST  /products/{id}/reviews   → verified purchase only
🔐 PATCH /reviews/{id}            → own review (edit resets approval)
🔐 DELETE /reviews/{id}           → own or admin
🔐 POST  /reviews/{id}/helpful
👑 GET   /admin/reviews/pending
👑 PATCH /admin/reviews/{id}/approve
```

### Returns (`/returns`)
```
🔐 POST  /returns                 → DELIVERED orders only
🔐 GET   /returns
🔐 GET   /returns/{id}
👑 GET   /returns/admin/all
👑 POST  /returns/admin/{id}/process  → approve or reject
```

### System
```
🔓 GET /health   → DB connection check
🔓 GET /         → welcome message
```

---

## SECTION 7 — CODE PATTERNS

Follow these exactly. Do not invent alternatives.

### 7.1 — Response Envelope (Never Change This Format)
```python
# app/utils/response.py — import from here, never recreate
from app.utils.response import success_response

return success_response(
    data={"key": "value"},
    message="Operation successful.",
    status_code=200,        # use 201 for creates
    meta={                  # optional — paginated responses only
        "page": 1, "per_page": 20, "total": 150, "total_pages": 8,
    }
)
# JSON output: { "success": true, "message": "...", "data": {...}, "meta": {...} }
# Error JSON:  { "success": false, "error": { "code": "...", "message": "..." } }
# Errors are raised via exceptions — never call error_response() in routes
```

### 7.2 — Custom Exceptions
```python
# Never raise HTTPException directly. Always use these:
from app.core.exceptions import (
    NotFoundException,                # 404
    ConflictException,                # 409
    EmailAlreadyExistsException,      # 409
    InvalidCredentialsException,      # 401
    TokenExpiredException,            # 401
    TokenInvalidException,            # 401
    InsufficientPermissionsException, # 403
    AccountInactiveException,         # 403
)

# Creating a new domain exception for a new module:
from app.core.exceptions import AppException
from fastapi import status

class WishlistLimitException(AppException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            error_code="WISHLIST_LIMIT_REACHED",
            message="Wishlist cannot exceed 50 items.",
        )
```

### 7.3 — Repository Pattern
```python
# app/modules/example/repository.py
import asyncpg

class ExampleRepository:
    def __init__(self, db: asyncpg.Connection):
        self.db = db

    async def get_by_id(self, item_id: int) -> dict | None:
        row = await self.db.fetchrow(
            """SELECT id, name, created_at::TEXT AS created_at
               FROM example_table WHERE id = $1 AND is_active = TRUE""",
            item_id,
        )
        return dict(row) if row else None

    async def get_all(self) -> list[dict]:
        rows = await self.db.fetch(
            "SELECT id, name FROM example_table WHERE is_active = TRUE"
        )
        return [dict(r) for r in rows]

    async def create(self, data: dict) -> dict:
        row = await self.db.fetchrow(
            """INSERT INTO example_table (name, value)
               VALUES ($1, $2)
               RETURNING id, name, value, created_at::TEXT AS created_at""",
            data["name"], data["value"],
        )
        return dict(row)

    async def soft_delete(self, item_id: int) -> bool:
        result = await self.db.execute(
            "UPDATE example_table SET is_active = FALSE, updated_at = NOW() WHERE id = $1",
            item_id,
        )
        return result == "UPDATE 1"
```

> ⚠️ **Timestamp rule:** Always cast timestamps in SELECT: `created_at::TEXT AS created_at`
> asyncpg returns `datetime` objects by default — these break JSON serialization.
> Apply to ALL timestamp columns: `created_at`, `updated_at`, `expires_at`, etc.

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
            raise NotFoundException("Item")
        return item

    async def create_item(self, data: CreateExampleRequest) -> dict:
        if await self.repo.name_exists(data.name):
            raise ConflictException("An item with this name already exists.")
        return await self.repo.create(data.model_dump())

    # Atomic operations — everything succeeds or all rolls back
    async def atomic_operation(self, db: asyncpg.Connection) -> dict:
        async with db.transaction():
            item = await self.repo.create({...})
            await self.repo.update(item["id"], {...})
        return item
```

### 7.5 — Router Pattern
```python
# app/modules/example/router.py
from fastapi import APIRouter, Depends, Query
import asyncpg
from app.modules.example.schemas import CreateExampleRequest
from app.modules.example.service import ExampleService
from app.core.dependencies import get_current_user, require_admin, TokenData
from app.database import get_db
from app.utils.response import success_response

router = APIRouter(prefix="/example", tags=["Example"])

@router.get("")
async def list_items(
    page:     int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: asyncpg.Connection = Depends(get_db),
):
    service = ExampleService(db)
    items, total = await service.get_all(page=page, per_page=per_page)
    return success_response(
        data=items, message="Fetched.",
        meta={"page": page, "per_page": per_page, "total": total,
              "total_pages": (total + per_page - 1) // per_page},
    )

@router.post("", status_code=201)
async def create_item(
    data: CreateExampleRequest,
    _:   TokenData = Depends(require_admin),
    db:  asyncpg.Connection = Depends(get_db),
):
    service = ExampleService(db)
    item = await service.create_item(data)
    return success_response(data=item, message="Created.", status_code=201)
```

### 7.6 — Auth Dependencies
```python
from app.core.dependencies import (
    get_current_user,    # any logged-in user → TokenData
    require_admin,       # ADMIN role required → TokenData (raises 403 if not)
    require_seller,      # SELLER or ADMIN → TokenData
    get_optional_user,   # returns TokenData | None (public routes with optional auth)
)

# TokenData attributes:
current_user.user_id           # int
current_user.email             # str
current_user.roles             # list[str] — e.g. ['ADMIN']
current_user.is_admin()        # bool
current_user.is_seller()       # bool
current_user.has_role("CUSTOMER")  # bool
```

### 7.7 — Register a Module in `main.py`
```python
# app/main.py — add import:
from app.modules.newmodule.router import router as newmodule_router

# Register — keep alphabetical order with existing routers:
app.include_router(newmodule_router, prefix=settings.API_V1_PREFIX)
```

### 7.8 — SQL Conventions
```python
# ✅ Parameterized — user input goes in params list, never in the query string
await db.fetchrow("SELECT * FROM users WHERE email = $1", email)
await db.execute("UPDATE users SET name = $1 WHERE id = $2", name, user_id)

# ❌ Never do this — SQL injection risk
await db.fetchrow(f"SELECT * FROM users WHERE email = '{email}'")

# ✅ Dynamic ORDER BY is safe only when values come from our own whitelist dict
SORT_MAP = {
    "created_at_desc": "p.created_at DESC",
    "price_asc":       "p.price ASC",
    "price_desc":      "p.price DESC",
    "rating_desc":     "p.average_rating DESC",
}
order_clause = SORT_MAP.get(sort, "p.created_at DESC")  # default on unknown value
query = f"SELECT ... FROM products p WHERE ... ORDER BY {order_clause}"
# Safe: order_clause is our own string, never user input directly
```

### 7.9 — Pagination Pattern
```python
# Always two queries: count first, then data with LIMIT/OFFSET.
# Repository returns (list[dict], total_count).
# Router builds the meta{} object — never build it in service or repository.

# In repository:
async def get_filtered(
    self, filters: dict, page: int, per_page: int
) -> tuple[list[dict], int]:

    conditions = ["p.is_active = TRUE"]
    params: list = []
    i = 1  # tracks the $N parameter index

    if filters.get("search"):
        conditions.append(f"(p.name ILIKE ${i} OR p.description ILIKE ${i})")
        params.append(f"%{filters['search']}%")
        i += 1

    if filters.get("min_price") is not None:
        conditions.append(f"p.price >= ${i}")
        params.append(filters["min_price"])
        i += 1

    where = " AND ".join(conditions)

    # Query 1: total count (same WHERE, no ORDER/LIMIT)
    total = await self.db.fetchval(
        f"SELECT COUNT(*) FROM products p WHERE {where}", *params
    )

    # Query 2: paginated rows
    offset = (page - 1) * per_page
    rows = await self.db.fetch(
        f"""SELECT p.id, p.name, p.slug, p.price
            FROM products p
            WHERE {where}
            ORDER BY p.created_at DESC
            LIMIT ${i} OFFSET ${i + 1}""",
        *params, per_page, offset,
    )
    return [dict(r) for r in rows], total

# In router (always builds meta here):
items, total = await service.get_filtered(filters, page=page, per_page=per_page)
return success_response(
    data=items, message="Fetched.",
    meta={
        "page":        page,
        "per_page":    per_page,
        "total":       total,
        "total_pages": (total + per_page - 1) // per_page,
    },
)
```

### 7.10 — Soft Delete Pattern
```python
# Use is_active = FALSE for soft deletes. No deleted_at column exists anywhere.
# No base class enforces this — every list query adds the filter manually.
# Forgetting the filter returns deleted records to the client.

# ✅ Correct
"SELECT * FROM products WHERE is_active = TRUE"
"SELECT * FROM product_variants WHERE product_id = $1 AND is_active = TRUE"
"SELECT * FROM users WHERE soft_delete = FALSE"   # note: users uses soft_delete

# ❌ Missing filter — returns deleted records
"SELECT * FROM products"
"SELECT * FROM product_variants WHERE product_id = $1"

# Performing a soft delete
async def soft_delete(self, item_id: int) -> bool:
    result = await self.db.execute(
        "UPDATE products SET is_active = FALSE, updated_at = NOW() WHERE id = $1",
        item_id,
    )
    return result == "UPDATE 1"
```

### 7.11 — Dynamic Query Building
```python
# Build WHERE clauses with a conditions list + params list.
# User input ONLY goes into params as $N placeholders.
# The conditions list contains only our own template strings — safe to interpolate.

conditions: list[str] = ["p.is_active = TRUE"]
params: list = []
i = 1

if search := filters.get("search"):
    conditions.append(f"(p.name ILIKE ${i} OR p.description ILIKE ${i})")
    params.append(f"%{search}%")
    i += 1

if category_name := filters.get("category_slug"):
    conditions.append(
        f"EXISTS (SELECT 1 FROM category c WHERE c.id = p.category_id AND c.name = ${i})"
    )
    params.append(category_name)
    i += 1

where = " AND ".join(conditions)
# Now use LIMIT ${i} OFFSET ${i+1} with the same counter
```

### 7.12 — Logging Pattern
```python
# Logging is configured in main.py — do not reconfigure in modules.
import logging
logger = logging.getLogger(__name__)

logger.debug("Query: %s | params: %s", query, params)  # DEBUG=true only
logger.info("Webhook received: %s", event_type)         # normal events
# WARNING and ERROR are handled automatically by the exception middleware

# What NOT to log: passwords, tokens, raw SQL in production, personal data
# Auth events are already written to user_login_audit table — don't duplicate
```

---

## SECTION 8 — SECURITY PATTERNS

### JWT Strategy
```
Access Token:   15 min TTL | Authorization: Bearer header | Stored in localStorage
Refresh Token:  7 day TTL  | HTTP-only cookie             | SHA-256 hashed in DB
```

### Password Hashing
```python
from app.core.security import hash_password, verify_password
hashed = hash_password("plaintext")            # bcrypt, cost factor 12
ok     = verify_password("plaintext", hashed)  # constant-time comparison
```

### Token Generation
```python
from app.core.security import (
    create_access_token,       # signs and returns JWT string
    generate_refresh_token,    # random 256-bit URL-safe string (send this to client)
    hash_refresh_token,        # SHA-256 — store this in DB, never the raw token
    get_refresh_token_expiry,  # datetime 7 days from now
)
```

### Rules
- Store `hash_refresh_token(raw)` in DB — never the raw token
- Send raw token to client via HTTP-only cookie
- On refresh: hash the incoming cookie value, compare against DB hash
- Rotation: issue new token + revoke old one on every refresh
- On logout: set `is_revoked = TRUE` in `refresh_tokens` table

---

## SECTION 9 — COMMON ERRORS & FIXES

| Error | Cause | Fix |
|---|---|---|
| `Extra inputs are not permitted` (Pydantic) | `.env` has a var not in `Settings` class | Add the missing var to `app/config.py` Settings |
| `asyncpg.UniqueViolationError` | Duplicate insert | Catch in service, raise `ConflictException` |
| `NoneType has no attribute X` | `fetchrow` returned `None` | `if not row: raise NotFoundException("Item")` in repository |
| `ValidationError` on startup | Missing required `.env` var | Add the var to `.env` |
| `401 on /users/me at startup` | Bootstrap runs before token exists | Expected — bootstrap returns early if no token |
| `payment.captured webhook 400` | Wrong `RAZORPAY_WEBHOOK_SECRET` | Match the value in `.env` with Razorpay dashboard |
| `asyncpg.UndefinedFunctionError` | Migration not run | Run the relevant `scripts/phaseX_*.sql` |
| Deleted records in list response | Missing `WHERE is_active = TRUE` | Add soft delete filter — see Section 7.10 and Section 5 |
| `datetime` not JSON serializable | Timestamp column not cast | Add `::TEXT AS column_name` to all timestamps in SELECT |
| Wrong `$N` index in query | `i` counter off when building WHERE | Use one `i` counter throughout; increment after each param |
| Duplicate rows after re-running migration | `INSERT` without `ON CONFLICT` | Add `ON CONFLICT DO NOTHING` to all INSERT in migration scripts |
| `generate_order_number()` error | phase4 migration not run | Run `scripts/phase4_orders_migration.sql` |
| `422 Unprocessable Entity` | Pydantic schema validation failed | Read the `detail` array — lists each failing field |

---

## SECTION 10 — MODULE STATUS

| Module | Status | Key Business Rules |
|---|---|---|
| Auth | ✅ Complete | Refresh token rotation, SHA-256 in DB, audit logging |
| Users | ✅ Complete | Max 5 addresses, auto-promotes default on delete |
| Categories | ✅ Complete | Max 2-level nesting, blocked delete if has products/children |
| Products | ✅ Complete | Auto-slug, max 10 images, ILIKE search, image_url = plain VARCHAR |
| Cart | ✅ Complete | Price snapshots, max 20 items, max 50 qty, stock validated |
| Orders | ✅ Complete | Atomic transaction, state machine, coupon validation, stock deducted |
| Reviews | ✅ Complete | Verified purchase gate, edit resets approval, DB trigger updates rating |
| Returns | ✅ Complete | DELIVERED only, item qty validated, atomic creation |
| Payments | ⚠️ Untested | Razorpay initiate + verify + webhook — never run against a live key |

### Business Constants (in each module's `service.py`)
```python
MAX_CART_ITEMS          = 20     # distinct product lines per cart
MAX_CART_QTY_PER_ITEM   = 50     # max qty of one item
MAX_ADDRESSES           = 5      # per user
MAX_PRODUCT_IMAGES      = 10     # per product
FREE_SHIPPING_THRESHOLD = 499    # INR — below this, charge shipping
SHIPPING_CHARGE         = 49     # INR
TAX_RATE                = 0.18   # 18% GST flat rate
```

---

## SECTION 11 — ADDING A NEW MODULE

```
1. Migration (if new table needed)
   scripts/phaseX_modulename_migration.sql
   FIRST LINE: -- scripts/phaseX_modulename_migration.sql
   Every INSERT must use ON CONFLICT DO NOTHING

2. Module folder
   app/modules/modulename/
   ├── __init__.py
   ├── schemas.py      FIRST LINE: # app/modules/modulename/schemas.py
   ├── repository.py   FIRST LINE: # app/modules/modulename/repository.py
   ├── service.py      FIRST LINE: # app/modules/modulename/service.py
   └── router.py       FIRST LINE: # app/modules/modulename/router.py

3. Register in app/main.py
   from app.modules.modulename.router import router as modulename_router
   app.include_router(modulename_router, prefix=settings.API_V1_PREFIX)

4. Soft delete check
   If your table has is_active / soft_delete, every list query MUST filter it.
   There is no base class enforcing this — see Section 7.10.

5. Timestamp check
   Every SELECT returning a timestamp must cast it: created_at::TEXT AS created_at
   See Section 7.3 for why this is required.

6. Pagination
   Repository returns (list[dict], total_count).
   Router builds meta{}. See Section 7.9.

7. Update this document
   → Section 3: add new files
   → Section 10: mark module ✅
   → Section 14: overwrite current state
```

---

## SECTION 12 — INTEGRATION CONTRACT

> The exact contract the frontend depends on. Changing any of these is a breaking change.

### Response Envelope — Must Never Change
```python
# Success
{"success": True, "message": "...", "data": T, "meta": {...}}   # meta only on paginated

# Error
{"success": False, "error": {"code": "SCREAMING_SNAKE_CASE", "message": "Human readable."}}
```

### Authentication Contract
```
Access token:  JWT, 15 min TTL
               Frontend sends as: Authorization: Bearer {token}
               Frontend stores in: localStorage

Refresh token: 7-day random token — stored as SHA-256 hash in DB
               Sent to browser as HTTP-only cookie
               Frontend never reads it — browser sends it automatically
               On 401: frontend calls POST /auth/refresh, retries original request
```

### Image URL Contract
```
image_url is VARCHAR(500) — no file upload endpoint.
Backend only validates: must start with http:// or https://
Dev data uses Unsplash absolute URLs.
Production should use S3 or Cloudinary absolute URLs.
Frontend uses image_url directly in <img src> — never prepends the API base URL.
```

### Role Strings
```python
# Always UPPERCASE — never lowercase, never title case
UserRole = Literal["ADMIN", "SELLER", "CUSTOMER"]
```

### Order State IDs — Do Not Renumber
```
Frontend OrderStatusBadge component depends on these exact integer IDs.
PENDING=1, CONFIRMED=2, PROCESSING=3, SHIPPED=4, OUT_FOR_DELIVERY=5,
DELIVERED=6, CANCELLED=7, RETURN_REQUESTED=8, RETURN_APPROVED=9,
RETURN_REJECTED=10, REFUNDED=11
```

### Known API Quirk the Frontend Must Know
```
GET /products — the category_slug query param takes the category NAME string
  Correct:  ?category_slug=Electronics   (the category name)
  Wrong:    ?category_slug=electronics   (the slug field value)

GET /products — does NOT return category_id in the response
  category_id is optional and absent from ProductListItem
```

---

## SECTION 13 — KNOWN GAPS & TECHNICAL DEBT

> Documented intentional gaps. Do NOT fix silently — only address if explicitly asked.

| Gap | Location | Notes |
|---|---|---|
| Rate limiting not enforced | `config.py` | `LOGIN_MAX_ATTEMPTS` env var exists — **no code reads it**. `user_login_audit` logs attempts but nothing blocks them. |
| No file upload endpoint | `products/`, `users/` | `image_url` is a plain VARCHAR. Client sends any HTTPS URL. S3 planned for Phase 7. |
| Product search = ILIKE only | `products/repository.py` | Case-insensitive substring on name + description. No `tsvector`. Upgrade planned for Phase 6. |
| No migration tracking | `scripts/` | No Alembic, no Flyway, no applied-migrations table. Must track manually. |
| `cleanup_expired_tokens()` is manual | DB function | No cron job, no FastAPI background task. Must call `SELECT cleanup_expired_tokens()` manually in pgAdmin. |
| Razorpay untested | `payments/` | Built end-to-end. Never run against a live key. |
| Logging is stdout only | `main.py` | No log file, no log aggregation. Docker captures stdout. Fine for development. |

---

## SECTION 14 — CURRENT STATE (ALWAYS OVERWRITE THIS)

> Any AI reading this knows exactly where the project stands.

### What Is Fully Working
- All 9 modules: Auth, Users, Categories, Products, Cart, Orders, Reviews, Returns, Payments
- Full auth: register, login, refresh, logout, password reset, email verify
- Role-based access: ADMIN / SELLER / CUSTOMER enforced via dependency injection
- Admin order state machine: validated transitions, auto-logged history via DB trigger
- Product ratings: auto-updated by DB trigger on review change
- Return flow: DELIVERED orders only, atomic creation, admin approve/reject

### What Is Built But Needs Testing
- Razorpay payment flow — built end-to-end, never run against a live key.
  To test: add real `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` to `.env`.

### What To Build Next

**Frontend only — backend already complete:**
```
1. Admin Reviews page      /admin/reviews      backend ✅
2. Admin Returns page      /admin/returns      backend ✅
3. Customer Returns        /returns            backend ✅
4. Test Razorpay           /payment            needs live key
```

**Backend + Frontend both needed** — update the table below as each side completes:

| # | Module | Route | Backend | Frontend | Notes |
|---|---|---|---|---|---|
| 5 | Wishlist | `/wishlist` | 🔲 routes | 🔲 page | DB table exists |
| 6 | Admin Customers | `/admin/customers` | 🔲 routes | 🔲 page | — |
| 7 | Admin Coupons | `/admin/coupons` | 🔲 routes | 🔲 page | coupon_code table exists |

> When you complete the **Backend** column for a row: change 🔲 to ✅ and add:
> `→ Developer: copy new endpoints to FRONTEND_INSTRUCTIONS.md Section 10, then update that doc's Section 15 — move this row's module to "Frontend only — backend ✅".`
>
> When the developer tells you the **Frontend** column is now ✅:
> update it here so both columns show ✅ and move the module to "Fully complete" in Section 10.

**Backend work only (no frontend planned yet):**
```
8. S3 file upload          image endpoints     Phase 7, not started
9. Rate limiting           middleware          env vars exist, nothing enforces them
10. Full-text search       product search      ILIKE now, tsvector Phase 6 tech debt
```

### Watch Out For
- Soft delete: every list query must add `WHERE is_active = TRUE` (or `soft_delete = FALSE` for users) — no base class enforces this
- Timestamps: always cast in SELECT — `created_at::TEXT AS created_at` — asyncpg returns `datetime` objects that break JSON
- `category_slug` filter = category NAME string, not the slug field value
- `LOGIN_MAX_ATTEMPTS` is in `.env` and `config.py` but **no code reads it** — do not tell users this is implemented
- `cleanup_expired_tokens()` must be run manually — nothing calls it automatically
- No migration tracking table — you cannot tell which scripts have been applied
- Product images have no upload endpoint — `image_url` is a plain string the client provides