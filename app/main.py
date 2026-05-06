# ============================================================
# app/main.py
#
# FastAPI Application Entry Point
#
# Responsibilities:
#   1. Create FastAPI app with metadata (used in Swagger docs)
#   2. Lifespan: connect/disconnect DB pool on startup/shutdown
#   3. Register middleware (CORS, request logging)
#   4. Register global exception handler
#   5. Register all module routers
# ============================================================

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import create_pool, close_pool
from app.core.exceptions import AppException
from app.utils.response import error_response

# ── Module Routers ────────────────────────────────────────
from app.modules.auth.router import router as auth_router
from app.modules.users.router import router as users_router
from app.modules.categories.router import router as categories_router
from app.modules.products.router import router as products_router
from app.modules.cart.router import router as cart_router
from app.modules.orders.router import router as orders_router

# ── Logging Setup ─────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── Lifespan ──────────────────────────────────────────────
# WHY lifespan instead of @app.on_event("startup")?
#   on_event is deprecated in newer FastAPI.
#   Lifespan is the modern, recommended approach.
#   It uses Python's async context manager — clean and explicit.

@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP — runs before the app starts accepting requests
    logger.info(f"🚀 Starting {settings.APP_NAME} [{settings.APP_ENV}]")
    await create_pool()
    logger.info("✅ Application startup complete.")
    yield
    # SHUTDOWN — runs after the app stops accepting requests
    logger.info("🛑 Shutting down...")
    await close_pool()
    logger.info("✅ Application shutdown complete.")


# ── FastAPI App ───────────────────────────────────────────
app = FastAPI(
    title=f"{settings.APP_NAME} API",
    description="Production-grade E-Commerce REST API built with FastAPI + PostgreSQL.",
    version="1.0.0",
    docs_url="/docs",           # Swagger UI
    redoc_url="/redoc",         # ReDoc UI
    openapi_url="/openapi.json",
    lifespan=lifespan,
    # In production, disable docs:
    # docs_url=None if settings.APP_ENV == "production" else "/docs",
)


# ── CORS Middleware ───────────────────────────────────────
# WHY allow_credentials=True?
#   Needed for cookies (refresh token) to be sent cross-origin.
#   REQUIRED when frontend is on a different origin (localhost:5173 vs localhost:8000).
#   MUST be paired with specific origins — '*' doesn't work with credentials.

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,             # Required for HTTP-only cookies
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],    # Expose custom headers to frontend
)


# ── Request Logging Middleware ────────────────────────────
# Logs every request with method, path, status, and duration.
# Useful for debugging and performance monitoring.

@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start_time) * 1000

    logger.info(
        f"{request.method} {request.url.path} "
        f"→ {response.status_code} "
        f"[{duration_ms:.1f}ms]"
    )
    # Add timing header — useful for frontend performance monitoring
    response.headers["X-Response-Time"] = f"{duration_ms:.1f}ms"
    return response


# ── Global Exception Handler ──────────────────────────────
# WHY a global handler?
#   - Service layer raises AppException subclasses (business errors)
#   - This handler catches ALL of them and formats them consistently
#   - Routes NEVER need try/except boilerplate for expected errors
#   - Unexpected errors (DB down, bugs) → 500 with generic message (security)

@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle all custom AppException subclasses."""
    logger.warning(
        f"AppException: {exc.error_code} | {exc.message} | "
        f"Path: {request.url.path}"
    )
    return error_response(
        error_code=exc.error_code,
        message=exc.message,
        status_code=exc.status_code,
        details=exc.details,
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all for unexpected errors.
    SECURITY: Never expose internal error details to the client in production.
    Log the full error server-side for debugging.
    """
    logger.error(
        f"Unhandled exception on {request.method} {request.url.path}: {exc}",
        exc_info=True,      # Include full traceback in logs
    )
    if settings.DEBUG:
        # In development, return the actual error for debugging
        return error_response(
            error_code="INTERNAL_SERVER_ERROR",
            message=str(exc),
            status_code=500,
        )
    # In production, hide internal details
    return error_response(
        error_code="INTERNAL_SERVER_ERROR",
        message="An unexpected error occurred. Please try again later.",
        status_code=500,
    )


# ── Router Registration ───────────────────────────────────
# All routers are prefixed with /api/v1
# WHY /api/v1 prefix?
#   - /api distinguishes API from frontend routes
#   - /v1 allows breaking changes in v2 without removing v1
#   - Frontend can explicitly target the version it was built against

app.include_router(auth_router,  prefix=settings.API_V1_PREFIX)
app.include_router(users_router,      prefix=settings.API_V1_PREFIX)
app.include_router(categories_router, prefix=settings.API_V1_PREFIX)
app.include_router(products_router,   prefix=settings.API_V1_PREFIX)
app.include_router(cart_router,     prefix=settings.API_V1_PREFIX)
app.include_router(orders_router,   prefix=settings.API_V1_PREFIX)


# ── Health Check ─────────────────────────────────────────
# WHY a health check endpoint?
#   - AWS Load Balancer / ECS uses this to know if the app is alive
#   - Monitoring tools (UptimeRobot, etc.) ping this
#   - Returns DB status so you know the full stack is healthy

@app.get("/health", tags=["System"])
async def health_check():
    from app.database import get_pool
    try:
        pool = get_pool()
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "app": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "database": db_status,
        "version": "1.0.0",
    }

@app.get("/", tags=["System"])
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "docs": "/docs",
        "version": "1.0.0",
    }