from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.api.deps import get_db, get_current_user
from backend.app.models.audit_log import AuditLog
from backend.app.models.notification import Notification
from backend.app.models.user import User
from backend.app.schemas.audit import AuditLogOut, NotificationOut

router = APIRouter(tags=["Audit & Notifications"])

@router.get("/audit/logs", response_model=List[AuditLogOut])
def get_audit_logs(
    complaint_id: Optional[int] = Query(None),
    institution_id: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Query immutable audit events for complete regulatory traceability."""
    query = db.query(AuditLog)
    if complaint_id:
        query = query.filter(AuditLog.complaint_id == complaint_id)
    if institution_id:
        query = query.filter(AuditLog.institution_id == institution_id)
    return query.order_by(desc(AuditLog.timestamp)).limit(limit).all()

@router.get("/notifications", response_model=List[NotificationOut])
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve notifications and alerts relevant to the current officer/bureau."""
    query = db.query(Notification).filter(
        (Notification.user_id == current_user.id) |
        (Notification.target_bureau == current_user.bureau) |
        (current_user.role == "SUPER_ADMIN")
    )
    return query.order_by(desc(Notification.created_at)).limit(30).all()

@router.patch("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark notification alert as read."""
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"status": "ok"}
