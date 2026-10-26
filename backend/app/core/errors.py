from datetime import datetime
from typing import Optional, Any, Dict
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from backend.app.core.logging import request_id_ctx_var, logger

class AppException(Exception):
    """Base application exception."""
    def __init__(
        self,
        detail: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        error_code: str = "APPLICATION_ERROR",
        extra: Optional[Dict[str, Any]] = None
    ):
        self.detail = detail
        self.status_code = status_code
        self.error_code = error_code
        self.extra = extra or {}
        super().__init__(detail)

class NotFoundError(AppException):
    def __init__(self, detail: str = "Requested resource not found"):
        super().__init__(detail=detail, status_code=status.HTTP_404_NOT_FOUND, error_code="NOT_FOUND")

class UnauthorizedError(AppException):
    def __init__(self, detail: str = "Authentication required"):
        super().__init__(detail=detail, status_code=status.HTTP_401_UNAUTHORIZED, error_code="UNAUTHORIZED")

class ForbiddenError(AppException):
    def __init__(self, detail: str = "Access forbidden for current role"):
        super().__init__(detail=detail, status_code=status.HTTP_403_FORBIDDEN, error_code="FORBIDDEN")

class ConflictError(AppException):
    def __init__(self, detail: str = "Resource conflict detected"):
        super().__init__(detail=detail, status_code=status.HTTP_409_CONFLICT, error_code="CONFLICT")

class DatabaseConnectionError(AppException):
    def __init__(self, detail: str = "Database connection unavailable"):
        super().__init__(detail=detail, status_code=status.HTTP_503_SERVICE_UNAVAILABLE, error_code="DATABASE_UNAVAILABLE")

def create_rfc7807_error_response(
    status_code: int,
    title: str,
    detail: str,
    error_code: str = "ERROR",
    extra: Optional[Dict[str, Any]] = None
) -> JSONResponse:
    req_id = request_id_ctx_var.get()
    content = {
        "type": f"https://samanvay.aicte.gov.in/errors/{error_code.lower()}",
        "title": title,
        "status": status_code,
        "detail": detail,
        "error_code": error_code,
        "request_id": req_id,
        "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    }
    if extra:
        content["extra"] = extra
    return JSONResponse(status_code=status_code, content=content)

async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    logger.warning(f"AppException [{exc.error_code}]: {exc.detail}")
    return create_rfc7807_error_response(
        status_code=exc.status_code,
        title="Application Exception",
        detail=exc.detail,
        error_code=exc.error_code,
        extra=exc.extra
    )

async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    logger.warning(f"HTTPException [{exc.status_code}]: {exc.detail}")
    return create_rfc7807_error_response(
        status_code=exc.status_code,
        title="HTTP Error",
        detail=str(exc.detail),
        error_code=f"HTTP_{exc.status_code}"
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    logger.warning(f"Validation Error: {exc.errors()}")
    return create_rfc7807_error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        title="Validation Error",
        detail="The request body or parameters failed validation schema checks.",
        error_code="VALIDATION_ERROR",
        extra={"validation_errors": exc.errors()}
    )

async def global_unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(f"Unhandled Exception: {str(exc)}", exc_info=True)
    return create_rfc7807_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        title="Internal Server Error",
        detail="An unexpected internal error occurred. Please contact the AICTE system administrator with the request ID.",
        error_code="INTERNAL_SERVER_ERROR"
    )
