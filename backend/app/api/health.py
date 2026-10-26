from datetime import datetime
from fastapi import APIRouter, Response, status
from backend.app.config import settings
from backend.app.core.db_check import validate_database_connection

router = APIRouter(tags=["Health & Diagnostics"])

@router.get("/health")
def health_check(response: Response):
    """
    Comprehensive system health endpoint.
    Validates database connectivity, latency, and returns service operational status.
    Returns HTTP 503 if database connection is broken.
    """
    is_db_ok, db_diag = validate_database_connection()

    system_status = "healthy" if is_db_ok else "unhealthy"
    if not is_db_ok:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": system_status,
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.APP_ENV,
        "database": {
            "status": db_diag["status"],
            "dialect": db_diag["dialect"],
            "latency_ms": db_diag["latency_ms"]
        },
        "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    }

@router.get("/health/live")
def liveness_probe():
    """Lightweight Kubernetes / Docker liveness probe."""
    return {"status": "alive"}
