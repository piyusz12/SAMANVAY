from datetime import timedelta
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from backend.app.models.complaint import Complaint
from backend.app.models.institution import Institution
from backend.app.models.user import User
from backend.app.models.case_status_history import CaseStatusHistory
from backend.app.models.case_assignment_history import CaseAssignmentHistory
from backend.app.schemas.complaint import ComplaintCreate, ComplaintOut
from backend.app.services.audit_service import log_audit_event
from backend.app.services.overlap_service import trigger_conflict_notifications
from backend.app.core.datetime_util import utc_now

BUREAU_PREFIX_MAP = {
    "REGULATION_BUREAU": "RB",
    "PGRC": "PGRC",
    "APPROVAL_BUREAU": "AB",
    "LEGAL_CELL": "LC",
    "VIGILANCE_CELL": "VC",
    "POLICY_BUREAU": "PAPB",
    "CENTRAL_ADMIN": "HQ"
}

def generate_complaint_no(db: Session, bureau: str) -> str:
    """Generates an official AICTE complaint tracking number format: AICTE/{BUREAU}/{YEAR}/{SEQ}"""
    prefix = BUREAU_PREFIX_MAP.get(bureau, "GEN")
    year = utc_now().year
    count = db.query(Complaint).count() + 1
    return f"AICTE/{prefix}/{year}/{count:04d}"

def calculate_sla_details(complaint: Complaint) -> Tuple[int, bool, str]:
    """Calculates days open, overdue flag, and SLA status indicator."""
    now = complaint.disposed_at or utc_now()
    days_open = max(0, (now - complaint.created_at).days)
    is_overdue = (days_open > complaint.sla_deadline_days) and (complaint.status not in ["DISPOSED", "RESOLVED"])
    
    if complaint.status in ["DISPOSED", "RESOLVED"]:
        sla_status = "RESOLVED"
    elif is_overdue:
        sla_status = "OVERDUE"
    elif days_open >= (complaint.sla_deadline_days - 7):
        sla_status = "APPROACHING_DEADLINE"
    else:
        sla_status = "ON_TRACK"
        
    return days_open, is_overdue, sla_status

def complaint_to_out(complaint: Complaint) -> ComplaintOut:
    """Transforms SQLAlchemy Complaint model to ComplaintOut schema with computed SLA details."""
    days_open, is_overdue, sla_status = calculate_sla_details(complaint)
    
    inst_name = complaint.institution.name if complaint.institution else None
    inst_aicte_id = complaint.institution.aicte_id if complaint.institution else None

    return ComplaintOut(
        id=complaint.id,
        complaint_no=complaint.complaint_no,
        institution_id=complaint.institution_id,
        institution_name=inst_name,
        institution_aicte_id=inst_aicte_id,
        bureau=complaint.bureau,
        complainant_name=complaint.complainant_name,
        complainant_category=complaint.complainant_category,
        complainant_email=complaint.complainant_email,
        complainant_phone=complaint.complainant_phone,
        is_anonymous_confidential=bool(complaint.is_anonymous_confidential),
        subject=complaint.subject,
        description=complaint.description,
        category=complaint.category,
        status=complaint.status,
        priority=complaint.priority,
        sla_deadline_days=complaint.sla_deadline_days,
        sla_due_date=complaint.sla_due_date,
        days_open=days_open,
        is_overdue=is_overdue,
        sla_status=sla_status,
        assigned_officer_id=complaint.assigned_officer_id,
        assigned_officer_name=complaint.assigned_officer_name,
        internal_notes=complaint.internal_notes,
        evidence_file_name=complaint.evidence_file_name,
        resolution_summary=complaint.resolution_summary,
        is_deleted=bool(complaint.is_deleted),
        created_at=complaint.created_at,
        updated_at=complaint.updated_at,
        disposed_at=complaint.disposed_at
    )

def create_complaint(
    db: Session,
    data: ComplaintCreate,
    current_user: Optional[User] = None
) -> Complaint:
    """Creates a new complaint inside a transaction, generates tracking number and records status/audit events."""
    institution = db.query(Institution).filter(
        Institution.id == data.institution_id,
        Institution.is_deleted == False
    ).first()
    if not institution:
        raise ValueError(f"Institution with ID {data.institution_id} does not exist or has been deleted.")

    complaint_no = generate_complaint_no(db, data.bureau)
    deadline_days = data.sla_deadline_days or 30
    now = utc_now()
    due_date = now + timedelta(days=deadline_days)
    
    complaint = Complaint(
        complaint_no=complaint_no,
        institution_id=data.institution_id,
        bureau=data.bureau,
        complainant_name=data.complainant_name,
        complainant_category=data.complainant_category,
        complainant_email=data.complainant_email,
        complainant_phone=data.complainant_phone,
        is_anonymous_confidential=data.is_anonymous_confidential,
        subject=data.subject,
        description=data.description,
        category=data.category,
        status="LODGED",
        priority=data.priority,
        sla_deadline_days=deadline_days,
        sla_due_date=due_date,
        internal_notes=data.internal_notes,
        is_deleted=False,
        created_at=now,
        updated_at=now
    )
    db.add(complaint)
    db.flush()

    # Record initial immutable status history
    status_hist = CaseStatusHistory(
        complaint_id=complaint.id,
        from_status=None,
        to_status="LODGED",
        action_taken="LODGED",
        changed_by_id=current_user.id if current_user else None,
        remarks=f"Complaint lodged under category {complaint.category} for {complaint.bureau}.",
        created_at=now
    )
    db.add(status_hist)

    db.commit()
    db.refresh(complaint)

    # Immutable audit log
    actor_id = current_user.id if current_user else None
    actor_name = current_user.full_name if current_user else "Public Intake Portal"
    actor_role = current_user.role if current_user else "COMPLAINANT"
    actor_bureau = current_user.bureau if current_user else data.bureau

    log_audit_event(
        db=db,
        action_type="CASE_LODGED",
        description=f"Complaint lodged under {data.bureau.replace('_', ' ')} with Subject: '{data.subject[:50]}...'",
        actor_id=actor_id,
        actor_name=actor_name,
        actor_role=actor_role,
        actor_bureau=actor_bureau,
        complaint_id=complaint.id,
        institution_id=institution.id,
        new_state=complaint.status,
        commit=True
    )

    # Check if this creates a cross-bureau overlap and alert respective heads
    trigger_conflict_notifications(db, complaint)

    return complaint

def update_complaint_status(
    db: Session,
    complaint_id: int,
    new_status: str,
    notes: Optional[str],
    resolution_summary: Optional[str],
    current_user: User,
    action_taken: str = "STATUS_UPDATE"
) -> Complaint:
    """Updates complaint status, records immutable CaseStatusHistory and audit trail."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise ValueError(f"Complaint ID {complaint_id} not found.")

    old_status = complaint.status
    complaint.status = new_status
    now = utc_now()
    complaint.updated_at = now

    if notes:
        existing_notes = complaint.internal_notes or ""
        timestamp_str = now.strftime("%Y-%m-%d %H:%M")
        complaint.internal_notes = f"{existing_notes}\n[{timestamp_str} by {current_user.full_name} ({current_user.bureau})]: {notes}".strip()

    if resolution_summary:
        complaint.resolution_summary = resolution_summary

    if new_status in ["RESOLVED", "DISPOSED"]:
        complaint.disposed_at = now
    elif old_status in ["RESOLVED", "DISPOSED"] and new_status not in ["RESOLVED", "DISPOSED"]:
        complaint.disposed_at = None

    # Immutable CaseStatusHistory
    status_entry = CaseStatusHistory(
        complaint_id=complaint.id,
        from_status=old_status,
        to_status=new_status,
        action_taken=action_taken,
        changed_by_id=current_user.id,
        remarks=notes or f"Status transitioned from {old_status} to {new_status}.",
        created_at=now
    )
    db.add(status_entry)

    db.commit()
    db.refresh(complaint)

    log_audit_event(
        db=db,
        action_type="STATUS_CHANGED",
        description=f"Status transitioned from {old_status} to {new_status}. {notes or ''}".strip(),
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_bureau=current_user.bureau,
        complaint_id=complaint.id,
        institution_id=complaint.institution_id,
        previous_state=old_status,
        new_state=new_status,
        commit=True
    )

    return complaint

def assign_officer(
    db: Session,
    complaint_id: int,
    officer_id: int,
    current_user: User,
    assignment_notes: Optional[str] = None
) -> Complaint:
    """Assigns an active scrutiny or desk officer to the case and records CaseAssignmentHistory."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise ValueError(f"Complaint ID {complaint_id} not found.")

    officer = db.query(User).filter(User.id == officer_id).first()
    if not officer:
        raise ValueError(f"Officer ID {officer_id} not found.")

    old_officer_id = complaint.assigned_officer_id
    old_officer_name = complaint.assigned_officer_name or "Unassigned"
    now = utc_now()

    # Mark prior assignments as not current
    db.query(CaseAssignmentHistory).filter(
        CaseAssignmentHistory.complaint_id == complaint.id,
        CaseAssignmentHistory.is_current == True
    ).update({"is_current": False})

    complaint.assigned_officer_id = officer.id
    complaint.assigned_officer_name = officer.full_name
    complaint.updated_at = now

    if complaint.status == "LODGED":
        complaint.status = "UNDER_INQUIRY"

    # Immutable CaseAssignmentHistory
    new_assignment = CaseAssignmentHistory(
        complaint_id=complaint.id,
        assigned_officer_id=officer.id,
        previous_officer_id=old_officer_id,
        assigned_by_id=current_user.id,
        bureau=complaint.bureau,
        assignment_notes=assignment_notes or f"Assigned to Desk Officer {officer.full_name}.",
        is_current=True,
        created_at=now
    )
    db.add(new_assignment)

    db.commit()
    db.refresh(complaint)

    log_audit_event(
        db=db,
        action_type="OFFICER_ASSIGNED",
        description=f"Assigned to Desk Officer {officer.full_name} ({officer.designation or 'Officer'}).",
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_bureau=current_user.bureau,
        complaint_id=complaint.id,
        institution_id=complaint.institution_id,
        previous_state=old_officer_name,
        new_state=officer.full_name,
        commit=True
    )

    return complaint
