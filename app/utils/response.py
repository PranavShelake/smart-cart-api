# ============================================================
# app/utils/response.py
#
# SUCCESS:
#   { "success": true, "data": {...}, "message": "...", "meta": {...} }
#
# ERROR:
#   { "success": false, "error": { "code": "...", "message": "..." } }
# ============================================================

from fastapi.responses import JSONResponse
from typing import Any


def success_response(
    data: Any = None,
    message: str = "Success",
    status_code: int = 200,
    meta: dict | None = None,
) -> JSONResponse:
    """
    Standard success response.

    Args:
        data:        The response payload (dict, list, or None)
        message:     Human-readable success message
        status_code: HTTP status code (200, 201, etc.)
        meta:        Optional pagination or extra info
    """
    body: dict = {
        "success": True,
        "message": message,
        "data": data,
    }
    if meta:
        body["meta"] = meta

    return JSONResponse(content=body, status_code=status_code)


def error_response(
    error_code: str,
    message: str,
    status_code: int = 400,
    details: dict | None = None,
) -> JSONResponse:
    """
    Standard error response.
    Normally called from the global exception handler — not from routes directly.
    """
    body: dict = {
        "success": False,
        "error": {
            "code": error_code,
            "message": message,
            "details": details,
        },
    }
    return JSONResponse(content=body, status_code=status_code)