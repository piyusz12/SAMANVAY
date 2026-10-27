import os
import json
import time
from datetime import datetime, timezone
from fastapi import APIRouter, Response, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.config import settings
from backend.app.core.db_check import validate_database_connection
from backend.app.api.deps import get_db
from backend.app.models.complaint import Complaint
from backend.app.models.institution import Institution

router = APIRouter(tags=["Health & Diagnostics"])

_START_TIME = time.time()

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
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    }

@router.get("/health/live")
def liveness_probe():
    """Lightweight Kubernetes / Docker liveness probe."""
    return {"status": "alive"}

@router.get("/health/ready")
def readiness_probe(response: Response, db: Session = Depends(get_db)):
    """
    Kubernetes / Docker readiness probe.
    Verifies database connection, storage directory writeability, and schema readiness.
    Returns HTTP 503 if the service is not ready to accept traffic.
    """
    checks = {}
    is_ready = True

    # 1. Database check
    is_db_ok, db_diag = validate_database_connection()
    checks["database"] = {"status": "ok" if is_db_ok else "fail", "latency_ms": db_diag.get("latency_ms")}
    if not is_db_ok:
        is_ready = False

    # 2. Storage writeability check
    storage_ok = True
    try:
        os.makedirs(settings.EVIDENCE_STORAGE_DIR, exist_ok=True)
        test_file = os.path.join(settings.EVIDENCE_STORAGE_DIR, ".readiness_probe")
        with open(test_file, "w") as f:
            f.write("ready")
        os.remove(test_file)
        checks["storage"] = {"status": "ok", "path": settings.EVIDENCE_STORAGE_DIR}
    except Exception as e:
        storage_ok = False
        is_ready = False
        checks["storage"] = {"status": "fail", "error": str(e)}

    # 3. Schema tables check
    schema_ok = True
    try:
        db.execute(text("SELECT count(*) FROM complaints")).scalar()
        checks["schema"] = {"status": "ok"}
    except Exception as e:
        schema_ok = False
        is_ready = False
        checks["schema"] = {"status": "fail", "error": str(e)}

    if not is_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "ready" if is_ready else "not_ready",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.APP_ENV,
        "checks": checks,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    }

@router.get("/health/metrics")
def operational_metrics(db: Session = Depends(get_db)):
    """
    Operational telemetry and metrics endpoint for infrastructure monitoring (Prometheus/Grafana).
    Reports complaint volumes, storage health, uptime, and background scheduler heartbeat.
    """
    uptime_seconds = round(time.time() - _START_TIME, 1)

    # Database operational counts
    total_complaints = db.query(Complaint).filter(Complaint.is_deleted == False).count()
    active_complaints = db.query(Complaint).filter(
        Complaint.is_deleted == False,
        Complaint.status.in_(["LODGED", "SCRUTINY_PENDING", "UNDER_INQUIRY", "SHOW_CAUSE_ISSUED", "HEARING_SCHEDULED"])
    ).count()
    total_institutions = db.query(Institution).filter(Institution.is_deleted == False).count()

    # Background worker heartbeat check
    worker_status = "idle"
    last_heartbeat = None
    if os.path.exists(settings.BACKGROUND_WORKER_HEARTBEAT_PATH):
        try:
            with open(settings.BACKGROUND_WORKER_HEARTBEAT_PATH, "r") as f:
                hb_data = json.load(f)
                last_heartbeat = hb_data.get("timestamp")
                worker_status = hb_data.get("status", "running")
        except Exception:
            worker_status = "heartbeat_error"

    return {
        "service": settings.PROJECT_NAME,
        "environment": settings.APP_ENV,
        "uptime_seconds": uptime_seconds,
        "metrics": {
            "total_complaints": total_complaints,
            "active_complaints": active_complaints,
            "total_institutions": total_institutions,
        },
        "background_worker": {
            "status": worker_status,
            "last_heartbeat": last_heartbeat
        },
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    }
