# ============================================================
# app/database.py
# ============================================================

import asyncpg
from asyncpg import Pool
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# ── Global pool — initialized once at startup ─────────────
_pool: Pool | None = None


async def create_pool() -> None:
    """
    Called once when FastAPI app starts (lifespan startup).
    Creates the asyncpg connection pool and stores it globally.
    """
    global _pool
    _pool = await asyncpg.create_pool(
        dsn=settings.DATABASE_URL,
        min_size=settings.DB_MIN_CONNECTIONS,
        max_size=settings.DB_MAX_CONNECTIONS,
        command_timeout=60,
    )
    logger.info(
        f"✅ Database pool created — "
        f"min={settings.DB_MIN_CONNECTIONS}, max={settings.DB_MAX_CONNECTIONS}"
    )


async def close_pool() -> None:
    """
    Called once when FastAPI app shuts down (lifespan shutdown).
    Gracefully closes all connections in the pool.
    """
    global _pool
    if _pool:
        await _pool.close()
        logger.info("🔌 Database pool closed.")


def get_pool() -> Pool:
    """
    Returns the active pool. Raises if pool was never initialized.
    Used as a FastAPI dependency.
    """
    if _pool is None:
        raise RuntimeError(
            "Database pool is not initialized. "
            "Ensure create_pool() is called in app lifespan."
        )
    return _pool

async def get_db():
    pool = get_pool()
    async with pool.acquire() as connection:
        yield connection