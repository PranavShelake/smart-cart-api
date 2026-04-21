# 🛒 Smart Cart — Production-Grade E-Commerce Platform

> **Portfolio Project** | Full-Stack Engineering Showcase  
> **Stack:** FastAPI · PostgreSQL · React (Vite + Tailwind) · AWS  
> **Architecture:** Clean Architecture — Route → Service → Repository → DB  
> **Author:** [Your Name]

---

## 📌 Table of Contents

1. [Project Vision](#-project-vision)
2. [System Architecture](#-system-architecture)
3. [Tech Stack](#-tech-stack)
4. [Folder Structure](#-folder-structure)
5. [Database Schema Overview](#-database-schema-overview)
6. [API Design Principles](#-api-design-principles)
7. [Development Phases & Modules](#-development-phases--modules)
8. [Current Phase Tracker](#-current-phase-tracker)
9. [Authentication & Security](#-authentication--security)
10. [Running Locally](#-running-locally)
11. [Environment Variables](#-environment-variables)
12. [AWS Deployment Plan](#-aws-deployment-plan)
13. [Engineering Decisions Log](#-engineering-decisions-log)
14. [Interview Talking Points](#-interview-talking-points)

---

## 🎯 Project Vision

**Smart Cart** is a full-featured, production-ready e-commerce backend and frontend system. It is built to demonstrate real-world engineering skills at a startup level — not a tutorial project. The system handles:

- Multi-role user management (Customer, Seller, Admin)
- Product catalog with categories, variants, and inventory
- Shopping cart with session + authenticated cart merge
- Orders, payments, refunds, and return management
- Review & rating system with abuse controls
- Real-time inventory tracking
- JWT-based authentication with refresh tokens
- AWS-hosted infrastructure

This project reflects the engineering quality expected at companies like Flipkart, Meesho, Razorpay, and similar product companies.

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                         │
│         React (Vite + Tailwind CSS)  ─  Port 5173           │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS / REST API
┌───────────────────────────▼─────────────────────────────────┐
│                      API GATEWAY LAYER                       │
│              FastAPI Application  ─  Port 8000               │
│         (CORS · Rate Limiting · JWT Middleware)              │
└────────────────┬───────────────────────────────────┬────────┘
                 │                                   │
    ┌────────────▼──────────┐          ┌─────────────▼────────┐
    │    ROUTE LAYER        │          │   MIDDLEWARE LAYER    │
    │  (HTTP handling,      │          │  (Auth, Logging,      │
    │   request parsing)    │          │   Error handling)     │
    └────────────┬──────────┘          └──────────────────────┘
                 │
    ┌────────────▼──────────┐
    │    SERVICE LAYER      │  ← Business Logic Lives Here
    │  (Validation, rules,  │
    │   orchestration)      │
    └────────────┬──────────┘
                 │
    ┌────────────▼──────────┐
    │   REPOSITORY LAYER    │  ← Raw SQL Queries Here
    │  (DB access, queries, │
    │   no business logic)  │
    └────────────┬──────────┘
                 │
    ┌────────────▼──────────┐
    │     DATABASE LAYER    │
    │   PostgreSQL (RDS)    │
    └───────────────────────┘
```

**Why Clean Architecture?**
- Each layer has ONE responsibility — testable in isolation
- You can swap the DB layer without touching business logic
- Interviewers love this — shows you understand separation of concerns
- Industry standard at companies like Uber, Airbnb, and Amazon

---

## 💻 Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Backend Framework | FastAPI (Python 3.11+) | Async-first, auto docs, type hints, Pydantic |
| Database | PostgreSQL 15 | ACID compliance, complex joins, reliability |
| DB Access | Raw SQL (psycopg2 / asyncpg) | Full control, performance, interview credibility |
| Auth | JWT (access + refresh tokens) | Stateless, scalable, industry standard |
| Password | bcrypt | Adaptive hashing, salted by default |
| Frontend | React + Vite + Tailwind CSS | Fast DX, modern tooling, utility-first CSS |
| HTTP Client | Axios | Interceptors for JWT refresh, error handling |
| State Management | Zustand | Lightweight, no boilerplate |
| Cloud | AWS (EC2, RDS, S3, CloudFront) | Real-world deployment experience |
| CI/CD | GitHub Actions | Automated test + deploy pipeline |
| Containerization | Docker + Docker Compose | Reproducible environments |
| API Docs | Swagger UI (auto via FastAPI) | `/docs` endpoint, always up to date |

---

## 📁 Folder Structure

```
smart-cart/
│
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app init, middleware, router registration
│   │   ├── config.py                  # Settings (env vars via pydantic-settings)
│   │   ├── database.py                # DB connection pool (asyncpg)
│   │   │
│   │   ├── core/
│   │   │   ├── security.py            # JWT create/verify, bcrypt hashing
│   │   │   ├── dependencies.py        # get_current_user, get_db (FastAPI deps)
│   │   │   ├── exceptions.py          # Custom exception classes
│   │   │   └── middleware.py          # Request logging, rate limiting
│   │   │
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── router.py
│   │   │   │   ├── service.py
│   │   │   │   ├── repository.py
│   │   │   │   └── schemas.py
│   │   │   │
│   │   │   ├── users/
│   │   │   │   ├── router.py
│   │   │   │   ├── service.py
│   │   │   │   ├── repository.py
│   │   │   │   └── schemas.py
│   │   │   │
│   │   │   ├── products/
│   │   │   │   ├── router.py
│   │   │   │   ├── service.py
│   │   │   │   ├── repository.py
│   │   │   │   └── schemas.py
│   │   │   │
│   │   │   ├── categories/
│   │   │   ├── cart/
│   │   │   ├── orders/
│   │   │   ├── payments/
│   │   │   ├── reviews/
│   │   │   ├── inventory/
│   │   │   ├── coupons/
│   │   │   └── returns/
│   │   │
│   │   └── utils/
│   │       ├── pagination.py          # Reusable cursor-based pagination
│   │       ├── validators.py          # Phone, email, pincode validators
│   │       └── response.py            # Standard API response wrapper
│   │
│   ├── tests/
│   │   └── (pytest test files mirror module structure)
│   ├── .env
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── api/                       # Axios instances + API call functions
│   │   ├── components/                # Reusable UI components
│   │   ├── pages/                     # Route-level page components
│   │   ├── store/                     # Zustand state stores
│   │   ├── hooks/                     # Custom React hooks
│   │   ├── utils/                     # Formatters, validators
│   │   └── App.jsx
│   ├── .env
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml
├── .github/
│   └── workflows/
│       └── deploy.yml
└── README.md
```

---

## 🗄 Database Schema Overview

The PostgreSQL schema covers these core tables:

```
users               → id, email, phone, password_hash, role, is_active
user_profiles       → user_id, full_name, avatar_url, default_address_id
addresses           → id, user_id, line1, city, state, pincode, is_default
categories          → id, name, slug, parent_id (self-referential tree)
products            → id, seller_id, category_id, name, slug, description, status
product_variants    → id, product_id, sku, price, compare_price, attributes (JSONB)
product_images      → id, product_id, variant_id, url, is_primary, sort_order
inventory           → variant_id, quantity, reserved_qty, warehouse_id
cart_sessions       → id, user_id (nullable), session_token, expires_at
cart_items          → id, cart_id, variant_id, quantity, price_snapshot
orders              → id, user_id, address_id, status, total, payment_status
order_items         → id, order_id, variant_id, quantity, unit_price, subtotal
payments            → id, order_id, provider, transaction_id, status, amount
reviews             → id, user_id, product_id, order_item_id, rating, body
review_votes        → reviewer_id, voter_id, is_helpful
coupons             → id, code, type, value, min_order, max_uses, expires_at
order_coupons       → order_id, coupon_id, discount_applied
returns             → id, order_item_id, reason, status, refund_amount
refresh_tokens      → id, user_id, token_hash, expires_at, is_revoked
```

**Design Highlights:**
- `product_variants` uses JSONB for flexible attributes (size, color, etc.)
- `cart_sessions` supports both guest and authenticated carts (merge on login)
- `inventory` tracks reserved qty separately to prevent overselling
- `refresh_tokens` stored as hashed values — never raw tokens in DB

---

## 📐 API Design Principles

All APIs follow REST conventions strictly:

```
GET    /api/v1/products          → List products (paginated)
GET    /api/v1/products/{id}     → Get single product
POST   /api/v1/products          → Create product (seller only)
PUT    /api/v1/products/{id}     → Full update (seller only)
PATCH  /api/v1/products/{id}     → Partial update
DELETE /api/v1/products/{id}     → Soft delete (sets status=archived)
```

**Standard Response Envelope:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Product fetched successfully",
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 348
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email or password is incorrect",
    "details": null
  }
}
```

---

## 🚀 Development Phases & Modules

### ✅ Phase 0 — Project Foundation
| Task | Status |
|---|---|
| PostgreSQL schema design & creation | ✅ Done |
| FastAPI project setup | ✅ Done |
| PostgreSQL connection working | ✅ Done |
| Folder structure finalized | ✅ Done |
| README.md & Project Plan | ✅ Done |

---

### 🔐 Phase 1 — Authentication & User Core
| Module | Status | Key Features |
|---|---|---|
| **AUTH MODULE** | 🔄 In Progress | Register, Login, Refresh Token, Logout |
| **USERS MODULE** | ⏳ Pending | Profile CRUD, Address Management |

**Endpoints:**
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/users/me
PUT    /api/v1/users/me
POST   /api/v1/users/me/addresses
GET    /api/v1/users/me/addresses
PUT    /api/v1/users/me/addresses/{id}
DELETE /api/v1/users/me/addresses/{id}
```

---

### 📦 Phase 2 — Catalog
| Module | Status | Key Features |
|---|---|---|
| **CATEGORIES MODULE** | ⏳ Pending | Hierarchical tree, slug-based routing |
| **PRODUCTS MODULE** | ⏳ Pending | CRUD, variants, images, search, filters |
| **INVENTORY MODULE** | ⏳ Pending | Stock tracking, low-stock alerts |

**Endpoints:**
```
GET    /api/v1/categories
GET    /api/v1/categories/{slug}/products
POST   /api/v1/products
GET    /api/v1/products?search=&category=&min_price=&max_price=&sort=
GET    /api/v1/products/{slug}
PUT    /api/v1/products/{id}
POST   /api/v1/products/{id}/variants
GET    /api/v1/inventory/{variant_id}
PATCH  /api/v1/inventory/{variant_id}
```

---

### 🛒 Phase 3 — Cart
| Module | Status | Key Features |
|---|---|---|
| **CART MODULE** | ⏳ Pending | Guest cart, auth cart, merge on login, price snapshots |

**Endpoints:**
```
GET    /api/v1/cart
POST   /api/v1/cart/items
PATCH  /api/v1/cart/items/{item_id}
DELETE /api/v1/cart/items/{item_id}
DELETE /api/v1/cart
POST   /api/v1/cart/merge           ← Guest → Auth merge on login
```

---

### 📋 Phase 4 — Orders & Payments
| Module | Status | Key Features |
|---|---|---|
| **ORDERS MODULE** | ⏳ Pending | Order creation, status tracking, cancellation |
| **PAYMENTS MODULE** | ⏳ Pending | Razorpay/Stripe integration, webhook handling |
| **COUPONS MODULE** | ⏳ Pending | Discount codes, validation, max-use tracking |

**Endpoints:**
```
POST   /api/v1/orders
GET    /api/v1/orders
GET    /api/v1/orders/{id}
PATCH  /api/v1/orders/{id}/cancel
POST   /api/v1/payments/initiate
POST   /api/v1/payments/webhook
GET    /api/v1/payments/{order_id}
POST   /api/v1/coupons/validate
```

---

### ⭐ Phase 5 — Reviews & Returns
| Module | Status | Key Features |
|---|---|---|
| **REVIEWS MODULE** | ⏳ Pending | Verified purchase only, ratings, helpful votes |
| **RETURNS MODULE** | ⏳ Pending | Return request, approval flow, refund trigger |

---

### 🔧 Phase 6 — Admin & Seller Dashboard
| Module | Status | Key Features |
|---|---|---|
| **ADMIN MODULE** | ⏳ Pending | User management, product approval, reports |
| **SELLER MODULE** | ⏳ Pending | Seller dashboard, product management, order view |

---

### ☁️ Phase 7 — AWS Deployment
| Task | Status | Details |
|---|---|---|
| Dockerize Backend | ⏳ Pending | Multi-stage Dockerfile |
| Dockerize Frontend | ⏳ Pending | Nginx-served static build |
| AWS RDS (PostgreSQL) | ⏳ Pending | Private subnet, security groups |
| AWS EC2 / ECS | ⏳ Pending | Backend hosting |
| AWS S3 + CloudFront | ⏳ Pending | Frontend static hosting + CDN |
| AWS S3 (images) | ⏳ Pending | Product image uploads via presigned URLs |
| GitHub Actions CI/CD | ⏳ Pending | Automated deploy on push to main |

---

## 📊 Current Phase Tracker

```
Phase 0 ████████████████████ 100% ✅  Foundation
Phase 1 ████░░░░░░░░░░░░░░░░  20% 🔄  Auth Module (IN PROGRESS)
Phase 2 ░░░░░░░░░░░░░░░░░░░░   0% ⏳  Catalog
Phase 3 ░░░░░░░░░░░░░░░░░░░░   0% ⏳  Cart
Phase 4 ░░░░░░░░░░░░░░░░░░░░   0% ⏳  Orders & Payments
Phase 5 ░░░░░░░░░░░░░░░░░░░░   0% ⏳  Reviews & Returns
Phase 6 ░░░░░░░░░░░░░░░░░░░░   0% ⏳  Admin & Seller
Phase 7 ░░░░░░░░░░░░░░░░░░░░   0% ⏳  AWS Deployment
```

> **Update this tracker** after completing each module. This is what you show in interviews to demonstrate structured thinking.

---

## 🔐 Authentication & Security

**Token Strategy:**
```
Access Token  → Short-lived (15 min) · Stored in memory (React state)
Refresh Token → Long-lived (7 days)  · Stored in HTTP-only cookie
```

**Why this approach?**
- Access token in memory: XSS cannot steal it (unlike localStorage)
- Refresh token in HTTP-only cookie: JS cannot read it, CSRF protected via SameSite=Strict
- On page refresh: call `/auth/refresh` silently using the cookie
- On logout: revoke refresh token in DB + clear cookie

**Security Layers:**
1. bcrypt password hashing (cost factor 12)
2. JWT signed with RS256 (asymmetric) or HS256 with strong secret
3. Refresh token stored as SHA-256 hash in DB (not raw)
4. Rate limiting on auth endpoints (5 attempts/minute)
5. SQL injection prevention via parameterized queries (never string interpolation)
6. Role-based access control (CUSTOMER / SELLER / ADMIN)
7. Input validation via Pydantic schemas on all endpoints

---

## 🏃 Running Locally

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15
- Docker (optional)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env           # Fill in your values
uvicorn app.main:app --reload --port 8000
```

API Docs available at: `http://localhost:8000/docs`

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

App available at: `http://localhost:5173`

### Docker Compose (Full Stack)
```bash
docker-compose up --build
```

---

## 🔑 Environment Variables

### Backend `.env`
```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/smartcart

# JWT
JWT_SECRET_KEY=your-super-secret-key-min-32-chars
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# App
APP_ENV=development
DEBUG=true
ALLOWED_ORIGINS=http://localhost:5173

# AWS (Phase 7)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=smartcart-media
AWS_REGION=ap-south-1

# Payment (Phase 4)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

---

## ☁️ AWS Deployment Plan

```
┌─────────────────────────────────────────────────┐
│                    AWS Cloud                     │
│                                                 │
│  ┌──────────┐    ┌──────────┐    ┌───────────┐  │
│  │CloudFront│    │    EC2   │    │    RDS    │  │
│  │(Frontend)│───▶│(Backend) │───▶│(Postgres) │  │
│  └──────────┘    └──────────┘    └───────────┘  │
│        │               │                        │
│  ┌─────▼──────┐  ┌─────▼──────┐                │
│  │  S3 Bucket │  │  S3 Bucket │                │
│  │ (Frontend) │  │  (Images)  │                │
│  └────────────┘  └────────────┘                │
└─────────────────────────────────────────────────┘
```

**Services Used:**
- **S3** — Static frontend hosting + product image storage
- **CloudFront** — CDN for frontend + image delivery
- **EC2 / ECS** — Backend API hosting
- **RDS** — Managed PostgreSQL (Multi-AZ for production)
- **IAM** — Role-based access, least-privilege principles
- **Secrets Manager** — Store `.env` values securely
- **Route 53** — Custom domain setup
- **Certificate Manager** — Free SSL/TLS

---

## 📝 Engineering Decisions Log

| Decision | Chosen | Rejected | Why |
|---|---|---|---|
| DB Access | Raw SQL | SQLAlchemy ORM | Full query control, teaches real SQL, better performance visibility |
| Auth Storage | Memory + HTTP-only cookie | localStorage | Security: XSS-proof access token, CSRF-proof refresh token |
| Pagination | Cursor-based | Offset-based | Consistent results, handles inserts mid-page, better performance at scale |
| Password Hash | bcrypt | MD5, SHA256 | Adaptive cost factor, salted, industry standard |
| API Versioning | URL prefix `/v1/` | Header-based | Explicit, easy to test, CDN-friendly |
| Soft Delete | `status=archived` | Hard DELETE | Maintains order history integrity, audit trail |
| Cart Design | DB-persisted | Redis only | Survives server restart; Redis can be added as cache layer later |

---

## 🎤 Interview Talking Points

When presenting this project, be ready to discuss:

**Architecture:**
- "Why Clean Architecture?" → Separation of concerns, testability, each layer mockable independently
- "Why not ORM?" → Better understanding of SQL, full control over query optimization, no N+1 surprises

**Security:**
- "How do you handle JWT refresh?" → Refresh token rotation with DB revocation check
- "How do you prevent SQL injection?" → Parameterized queries exclusively, never f-string SQL
- "How are passwords stored?" → bcrypt with cost factor 12, salted automatically

**Database:**
- "How do you prevent overselling?" → Reserved quantity column + DB transaction with SELECT FOR UPDATE
- "How does guest cart merge work?" → On login, merge guest cart items into user cart, resolve conflicts by max(quantity)

**Performance:**
- "How would you scale this?" → Connection pooling, read replicas, Redis cache for product catalog, CDN for images
- "What indexes do you have?" → Explain your index strategy (FK indexes, search columns, composite indexes)

**AWS:**
- "Why RDS over self-managed Postgres?" → Automated backups, Multi-AZ failover, patch management, no ops overhead

---

## 📬 Contact

Built by: [Your Name]  
LinkedIn: [Your LinkedIn]  
GitHub: [Your GitHub]

---

*This README is updated at the end of each phase. Last updated: Phase 0 — Foundation Complete.*