from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.api.deps import get_db, get_current_user
from backend.app.core.datetime_util import utc_now, format_ist
from backend.app.models.notification import Notification, NotificationDeliveryAttempt
from backend.app.models.user import User
from backend.app.schemas.notification import NotificationOut, NotificationDeliveryAttemptOut

router = APIRouter(prefix="/notifications", tags=["Notification Center"])

@router.get("", response_model=List[NotificationOut])
def get_notifications(
    unread_only: bool = Query(False, description="Filter for unread notifications only"),
    severity: Optional[str] = Query(None, description="Filter by severity level (INFO, WARNING, CRITICAL, URGENT)"),
    alert_type: Optional[str] = Query(None, description="Filter by alert type"),
    limit: int = Query(50, ge=1, le=200, description="Maximum notifications to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve in-app notifications and regulatory alerts scoped to the current user or bureau.
    Super Admins can view council-wide alerts.
    """
    query = db.query(Notification)

    # Bureau & Role Access Scoping
    if current_user.role not in ("SUPER_ADMIN", "AUDITOR"):
        query = query.filter(
            (Notification.user_id == current_user.id) |
            (Notification.target_bureau == current_user.bureau)
        )

    if unread_only:
        query = query.filter(Notification.is_read == False)

    if severity:
        query = query.filter(Notification.severity == severity.upper())

    if alert_type:
        query = query.filter(Notification.alert_type == alert_type)

    results = query.order_by(desc(Notification.created_at)).limit(limit).all()

    # Enrich with formatted IST timestamp
    out_items = []
    for n in results:
        data = NotificationOut.model_validate(n)
        data.created_at_ist = format_ist(n.created_at)
        out_items.append(data)

    return out_items


@router.get("/unread-count")
def get_unread_notification_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns total count of unread notifications for badge counters."""
    query = db.query(Notification).filter(Notification.is_read == False)
    if current_user.role not in ("SUPER_ADMIN", "AUDITOR"):
        query = query.filter(
            (Notification.user_id == current_user.id) |
            (Notification.target_bureau == current_user.bureau)
        )
    return {"unread_count": query.count()}


@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a specific notification alert as read."""
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification with ID {notification_id} not found."
        )

    # Permission check
    if current_user.role not in ("SUPER_ADMIN", "AUDITOR"):
        if notif.user_id and notif.user_id != current_user.id and notif.target_bureau != current_user.bureau:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to mark another bureau's notification as read."
            )

    notif.is_read = True
    notif.read_at = utc_now()
    db.commit()
    return {"status": "ok", "notification_id": notification_id, "is_read": True}


@router.post("/mark-all-read")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marks all accessible unread notifications as read."""
    query = db.query(Notification).filter(Notification.is_read == False)
    if current_user.role not in ("SUPER_ADMIN", "AUDITOR"):
        query = query.filter(
            (Notification.user_id == current_user.id) |
            (Notification.target_bureau == current_user.bureau)
        )
    
    count = query.update(
        {"is_read": True, "read_at": utc_now()},
        synchronize_session=False
    )
    db.commit()
    return {"status": "ok", "marked_read_count": count}


@router.get("/{notification_id}/delivery-attempts", response_model=List[NotificationDeliveryAttemptOut])
def get_notification_delivery_attempts(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Inspect durable delivery attempt history for a notification (Auditability & Retry tracking)."""
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification with ID {notification_id} not found."
        )

    attempts = db.query(NotificationDeliveryAttempt).filter(
        NotificationDeliveryAttempt.notification_id == notification_id
    ).order_by(NotificationDeliveryAttempt.attempt_number.asc()).all()

    return attempts
