from typing import Optional
from sqlalchemy.orm import Session
from backend.app.models.audit_log import AuditLog
from backend.app.core.datetime_util import utc_now
from backend.app.core.logging import request_id_ctx_var

def log_audit_event(
    db: Session,
    action_type: str,
    description: str,
    actor_id: Optional[int] = None,
    actor_name: str = "System",
    actor_role: str = "SYSTEM",
    actor_bureau: str = "SYSTEM",
    complaint_id: Optional[int] = None,
    institution_id: Optional[int] = None,
    previous_state: Optional[str] = None,
    new_state: Optional[str] = None,
    ip_address: Optional[str] = None,
    commit: bool = False
) -> AuditLog:
    """Record an immutable regulatory audit event in the system."""
    entry = AuditLog(
        complaint_id=complaint_id,
        institution_id=institution_id,
        actor_id=actor_id,
        actor_name=actor_name,
        actor_role=actor_role,
        actor_bureau=actor_bureau,
        action_type=action_type,
        description=description,
        previous_state=previous_state,
        new_state=new_state,
        ip_address=ip_address,
        request_id=request_id_ctx_var.get(),
        timestamp=utc_now()
    )
    db.add(entry)
    if commit:
        db.commit()
        db.refresh(entry)
    return entry
