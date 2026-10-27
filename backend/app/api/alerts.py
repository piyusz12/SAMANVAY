from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db, get_current_user, require_not_auditor, require_roles
from backend.app.models.user import User
from backend.app.schemas.notification import AlertConfigOut, AlertConfigUpdate, SchedulerRunResult
from backend.app.services.deadline_service import (
    get_alert_config,
    update_alert_config,
    run_scheduled_deadline_checks,
    retry_failed_deliveries
)

router = APIRouter(prefix="/alerts", tags=["Deadlines & Escalation Engine"])

def parse_iso_datetime(dt_str: Optional[str]) -> Optional[datetime]:
    if not dt_str:
        return None
    try:
        clean = dt_str.replace("Z", "+00:00")
        if len(clean) == 10:
            dt = datetime.fromisoformat(clean + "T00:00:00")
        else:
            dt = datetime.fromisoformat(clean)
        if dt.tzinfo is not None:
            from datetime import timezone
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid simulated_time format: '{dt_str}'. Use ISO format (e.g. YYYY-MM-DDTHH:MM:SS)."
        )

@router.post("/run-scheduler", response_model=SchedulerRunResult)
def trigger_deadline_scheduler(
    simulated_time: Optional[str] = Query(None, description="Optional ISO timestamp to control clock during automated testing or demo"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_not_auditor)
):
    """
    Executes the deadline & escalation background worker.
    Scans for upcoming SLA deadlines, overdue cases, unresolved overlap reviews, and overdue coordination tasks.
    Enforces multi-tiered escalation and prevents duplicate alerts via idempotency keys.
    Supports a controllable clock via 'simulated_time' for automated tests.
    """
    clock_time = parse_iso_datetime(simulated_time)
    result = run_scheduled_deadline_checks(db, current_time=clock_time)
    return result


@router.get("/config", response_model=AlertConfigOut)
def get_deadline_config_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves current deadline thresholds, reminder intervals, and escalation rules."""
    cfg = get_alert_config(db)
    return AlertConfigOut(**cfg)


@router.put("/config", response_model=AlertConfigOut)
def update_deadline_config_endpoint(
    payload: AlertConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Updates deadline parameters and escalation thresholds.
    Restricted to SUPER_ADMIN or BUREAU_ADMIN.
    """
    if current_user.role not in ("SUPER_ADMIN", "BUREAU_ADMIN", "BUREAU_HEAD"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only administrators can update deadline and escalation configurations."
        )

    updated_cfg = update_alert_config(db, payload, user_id=current_user.id)
    return AlertConfigOut(**updated_cfg)


@router.post("/retry-deliveries")
def retry_deliveries_endpoint(
    max_retries: int = Query(3, ge=1, le=10),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN", "BUREAU_ADMIN", "BUREAU_HEAD"]))
):
    """Manually triggers retries for all failed email deliveries."""
    retried, succeeded, logs = retry_failed_deliveries(db, max_retries=max_retries)
    return {
        "status": "ok",
        "retries_attempted": retried,
        "deliveries_succeeded": succeeded,
        "logs": logs
    }
