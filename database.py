
# ============================================================================
# database.py
# ============================================================================
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from typing import Any, Dict, List, Optional, Tuple
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DB_URL")

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "port": os.getenv("DB_PORT"),
    "database": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
}

@contextmanager
def get_db_connection():
    """Context manager for database connections"""
    conn = None
    try:
        if DATABASE_URL:
            # RDS / Hosted DB
            conn = psycopg2.connect(DATABASE_URL)
        else:
            # Local DB
            conn = psycopg2.connect(**DB_CONFIG)

        yield conn
        conn.commit()

    except Exception as e:
        if conn:
            conn.rollback()
        raise e

    finally:
        if conn:
            conn.close()


def execute_query(
    query: str,
    params: Optional[Tuple[Any, ...]] = None,
    fetch_one: bool = False,
    fetch_all: bool = True
) -> Optional[Dict[str, Any] | List[Dict[str, Any]]]:
    """Execute SELECT query and return results"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, params)
            if fetch_one:
                result = cursor.fetchone()
                return dict(result) if result else None
            elif fetch_all:
                results = cursor.fetchall()
                return [dict(row) for row in results]
            return None

def execute_update(
    query: str,
    params: Optional[Tuple[Any, ...]] = None
) -> int:
    """Execute INSERT, UPDATE, DELETE query"""
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(query, params)
            return cursor.rowcount

def execute_insert_returning(
    query: str,
    params: Optional[Tuple[Any, ...]] = None
) -> Optional[Dict[str, Any]]:
    """Execute INSERT with RETURNING clause"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, params)
            result = cursor.fetchone()
            return dict(result) if result else None
