# ============================================================
# app/core/exceptions.py
#
# PATTERN: Exception hierarchy
#   AppException (base)
#     ├── AuthException      → 401 / 403
#     ├── NotFoundException  → 404
#     ├── ConflictException  → 409
#     ├── ValidationException → 422
#     └── ServerException    → 500
# ============================================================

from fastapi import HTTPException, status


class AppException(Exception):
    """
    Base exception for all application-level errors.
    All custom exceptions inherit from this.
    """
    def __init__(
        self,
        status_code: int,
        error_code: str,
        message: str,
        details: dict | None = None,
    ):
        self.status_code = status_code
        self.error_code = error_code   # Machine-readable: "AUTH_EMAIL_EXISTS"
        self.message = message          # Human-readable: "Email already registered"
        self.details = details          # Optional extra context
        super().__init__(message)


# ── Auth Exceptions ───────────────────────────────────────

class EmailAlreadyExistsException(AppException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            error_code="AUTH_EMAIL_EXISTS",
            message="An account with this email address already exists.",
        )

class InvalidCredentialsException(AppException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="AUTH_INVALID_CREDENTIALS",
            message="Incorrect email or password.",
        )

class AccountInactiveException(AppException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="AUTH_ACCOUNT_INACTIVE",
            message="Your account has been deactivated. Please contact support.",
        )

class AccountDeletedException(AppException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="AUTH_ACCOUNT_DELETED",
            message="This account no longer exists.",
        )

class TokenExpiredException(AppException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="AUTH_TOKEN_EXPIRED",
            message="Your session has expired. Please log in again.",
        )

class TokenInvalidException(AppException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="AUTH_TOKEN_INVALID",
            message="Invalid authentication token.",
        )

class RefreshTokenRevokedException(AppException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="AUTH_REFRESH_REVOKED",
            message="Session is no longer valid. Please log in again.",
        )

class RefreshTokenMissingException(AppException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="AUTH_REFRESH_MISSING",
            message="No refresh token found. Please log in.",
        )

class InsufficientPermissionsException(AppException):
    def __init__(self, required_role: str = ""):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="AUTH_INSUFFICIENT_PERMISSIONS",
            message=f"You do not have permission to perform this action."
                    + (f" Required role: {required_role}" if required_role else ""),
        )


# ── Resource Exceptions ───────────────────────────────────

class NotFoundException(AppException):
    def __init__(self, resource: str = "Resource"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND",
            message=f"{resource} not found.",
        )

class ConflictException(AppException):
    def __init__(self, message: str = "Resource already exists."):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            error_code="CONFLICT",
            message=message,
        )


# ── Server Exceptions ─────────────────────────────────────

class DatabaseException(AppException):
    def __init__(self, message: str = "A database error occurred."):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="DATABASE_ERROR",
            message=message,
        )