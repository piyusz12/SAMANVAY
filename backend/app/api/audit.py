from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.api.deps import get_db, get_current_user, require_roles
from backend.app.models.audit_log import AuditLog
from backend.app.models.complaint import Complaint
from backend.app.models.user import User
from backend.app.schemas.audit import AuditLogOut
from backend.app.services.audit_service import verify_audit_trail_integrity

router = APIRouter(tags=["Audit & Notifications"])

@router.get("/audit/logs", response_model=List[AuditLogOut])
def get_audit_logs(
    complaint_id: Optional[int] = Query(None, description="Filter audit events by Complaint ID"),
    institution_id: Optional[int] = Query(None, description="Filter audit events by Institution ID"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Authenticated query for append-only regulatory audit events with cryptographic hash chaining.
    Non-super-admins querying by complaint_id are validated against bureau access controls.
    """
    user_role = (current_user.role or "").upper().replace(" ", "_")
    
    if complaint_id and user_role not in ("SUPER_ADMIN", "AUDITOR"):
        complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
        if complaint and complaint.bureau != current_user.bureau:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: You belong to {current_user.bureau} and cannot inspect audit records for {complaint.bureau}."
            )

    query = db.query(AuditLog)
    if complaint_id:
        query = query.filter(AuditLog.complaint_id == complaint_id)
    if institution_id:
        query = query.filter(AuditLog.institution_id == institution_id)

    return query.order_by(desc(AuditLog.timestamp)).limit(limit).all()

@router.get("/audit/verify-integrity")
def verify_audit_log_integrity(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN", "AUDITOR", "BUREAU_ADMIN", "BUREAU_HEAD"]))
) -> Dict[str, Any]:
    """
    Independently verifies the complete cryptographic SHA-256 hash chain of the audit trail.
    Detects unauthorized row modifications, tampering, out-of-order insertions, or deletions.
    """
    return verify_audit_trail_integrity(db)
