import os
import re
import hashlib
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Request, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc
from backend.app.core.datetime_util import utc_now
from backend.app.api.deps import (
    get_db,
    get_current_user,
    require_roles,
    require_not_auditor,
    verify_bureau_complaint_access,
    normalize_role
)
from backend.app.models.complaint import Complaint
from backend.app.models.institution import Institution
from backend.app.models.user import User
from backend.app.models.evidence_attachment import EvidenceAttachment
from backend.app.services.evidence_service import EvidenceService
from backend.app.schemas.auth import UserOut
from backend.app.schemas.complaint import (
    ComplaintCreate,
    ComplaintOut,
    ComplaintDetailOut,
    ComplaintListResponse,
    StatusUpdateSchema,
    OfficerAssignSchema,
    OfficerReassignSchema,
    TimelineEventOut,
    AllowedTransitionsOut,
    StatusTransitionOption,
    StatusConfigItem,
    CaseStatusHistoryOut,
    CaseAssignmentHistoryOut
)
from backend.app.services.complaint_service import (
    create_complaint,
    update_complaint_status,
    assign_officer,
    complaint_to_out,
    calculate_sla_details
)
from backend.app.services.workflow_service import (
    get_all_status_definitions,
    get_allowed_transitions_for_user
)
from backend.app.services.timeline_service import compile_case_timeline
from backend.app.services.audit_service import log_audit_event
from backend.app.core.datetime_util import utc_now
from backend.app.config import settings

router = APIRouter(prefix="/complaints", tags=["Complaints"])

def apply_pii_redaction(c_out: ComplaintOut, user: Optional[User]) -> ComplaintOut:
    """Redacts complainant PII for read-only auditor roles and confidential whistleblowers."""
    if not user:
        if c_out.is_anonymous_confidential:
            c_out.complainant_name = "[CONFIDENTIAL / ANONYMOUS]"
            c_out.complainant_email = "[REDACTED]"
            c_out.complainant_phone = "[REDACTED]"
        return c_out

    user_role = normalize_role(user.role)
    if user_role == "AUDITOR":
        c_out.complainant_email = "[REDACTED_FOR_AUDIT]"
        c_out.complainant_phone = "[REDACTED_FOR_AUDIT]"
        if c_out.is_anonymous_confidential:
            c_out.complainant_name = "[CONFIDENTIAL_WHISTLEBLOWER]"
    elif c_out.is_anonymous_confidential:
        # Whistleblower protection: only Super Admin or Bureau Admin of the case's bureau
        is_super = user_role == "SUPER_ADMIN"
        is_bureau_head = (user_role in ("BUREAU_ADMIN", "BUREAU_HEAD") and user.bureau == c_out.bureau)
        if not (is_super or is_bureau_head):
            c_out.complainant_name = "[CONFIDENTIAL / ANONYMOUS]"
            c_out.complainant_email = "[REDACTED]"
            c_out.complainant_phone = "[REDACTED]"
    return c_out

@router.get("/workflow/statuses", response_model=List[StatusConfigItem])
def get_workflow_statuses():
    """Retrieve all configurable workflow statuses and metadata."""
    return [StatusConfigItem(**s) for s in get_all_status_definitions()]

@router.get("/officers", response_model=List[UserOut])
def list_bureau_officers(
    bureau: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List eligible case officers for assignment.
    Scoped to the user's bureau unless Super Admin.
    """
    user_role = normalize_role(current_user.role)
    query = db.query(User).filter(User.is_active == True)
    if user_role != "SUPER_ADMIN":
        query = query.filter(User.bureau == current_user.bureau)
    elif bureau and bureau != "ALL":
        query = query.filter(User.bureau == bureau)

    query = query.filter(User.role.in_(["CASE_OFFICER", "BUREAU_OFFICER", "BUREAU_ADMIN"]))
    return query.order_by(User.full_name.asc()).all()

@router.get("", response_model=ComplaintListResponse)
def list_complaints(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    bureau: Optional[str] = Query(None, description="Filter by Bureau"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by Status"),
    institution_id: Optional[int] = Query(None, description="Filter by Institution ID"),
    priority: Optional[str] = Query(None, description="Filter by Priority"),
    category: Optional[str] = Query(None, description="Filter by Category"),
    assigned_officer_id: Optional[int] = Query(None, description="Filter by Assigned Desk Officer ID"),
    is_overdue: Optional[bool] = Query(None, description="Filter by Overdue SLA"),
    search: Optional[str] = Query(None, description="Search complaint_no, subject, complainant"),
    sort_by: Optional[str] = Query("created_at", description="Sort by field: created_at, priority, sla_due_date, status, complaint_no"),
    sort_dir: Optional[str] = Query("desc", description="Sort direction: asc or desc"),
    db: Session = Depends(get_db)
):
    current_user: Optional[User] = None
    auth_header = request.headers.get("Authorization")
    auth_cookie = request.cookies.get("access_token")
    if auth_header or auth_cookie:
        current_user = get_current_user(request=request, db=db)

    query = db.query(Complaint).filter(Complaint.is_deleted == False)

    # Broken Access Control mitigation: enforce bureau-scoping for non-admins
    if current_user:
        user_role = normalize_role(current_user.role)
        if user_role not in ("SUPER_ADMIN", "AUDITOR"):
            if bureau and bureau != "ALL" and bureau != current_user.bureau:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied: You belong to {current_user.bureau} and cannot list cases for {bureau}."
                )
            query = query.filter(Complaint.bureau == current_user.bureau)
        elif bureau and bureau != "ALL":
            query = query.filter(Complaint.bureau == bureau)
    elif bureau and bureau != "ALL":
        query = query.filter(Complaint.bureau == bureau)

    if status_filter and status_filter != "ALL":
        query = query.filter(Complaint.status == status_filter)
    if institution_id:
        query = query.filter(Complaint.institution_id == institution_id)
    if priority and priority != "ALL":
        query = query.filter(Complaint.priority == priority)
    if category and category != "ALL":
        query = query.filter(Complaint.category == category)
    if assigned_officer_id:
        query = query.filter(Complaint.assigned_officer_id == assigned_officer_id)
    if search:
        search_fmt = f"%{search}%"
        query = query.join(Institution).filter(
            or_(
                Complaint.complaint_no.ilike(search_fmt),
                Complaint.subject.ilike(search_fmt),
                Complaint.complainant_name.ilike(search_fmt),
                Institution.name.ilike(search_fmt),
                Institution.aicte_id.ilike(search_fmt)
            )
        )

    # Sorting
    sort_col = Complaint.created_at
    if sort_by == "priority":
        sort_col = Complaint.priority
    elif sort_by == "sla_due_date":
        sort_col = Complaint.sla_due_date
    elif sort_by == "status":
        sort_col = Complaint.status
    elif sort_by == "complaint_no":
        sort_col = Complaint.complaint_no
    elif sort_by == "updated_at":
        sort_col = Complaint.updated_at

    if (sort_dir or "").lower() == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    # Filter overdue at the SQL layer if requested
    if is_overdue is not None:
        now = utc_now()
        if is_overdue:
            query = query.filter(
                Complaint.sla_due_date.isnot(None),
                Complaint.sla_due_date < now,
                ~Complaint.status.in_(["DISPOSED", "RESOLVED"])
            )
        else:
            query = query.filter(
                or_(
                    Complaint.status.in_(["DISPOSED", "RESOLVED"]),
                    Complaint.sla_due_date.is_(None),
                    Complaint.sla_due_date >= now
                )
            )

    total = query.count()
    start_idx = (page - 1) * page_size
    paged_items = query.options(joinedload(Complaint.institution)).offset(start_idx).limit(page_size).all()

    return ComplaintListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[apply_pii_redaction(complaint_to_out(c), current_user) for c in paged_items]
    )

@router.post("", response_model=ComplaintOut, status_code=status.HTTP_201_CREATED)
def lodge_complaint(
    complaint_in: ComplaintCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Lodge a new grievance or regulatory complaint in the coordination system.
    If authenticated officer lodges case, enforces bureau-scope matching.
    """
    # Attempt to extract current user if auth header or cookie exists
    current_user: Optional[User] = None
    auth_header = request.headers.get("Authorization")
    auth_cookie = request.cookies.get("access_token")
    if auth_header or auth_cookie:
        try:
            current_user = get_current_user(request=request, db=db)
        except HTTPException:
            current_user = None

    if current_user:
        user_role = normalize_role(current_user.role)
        if user_role == "AUDITOR":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Action prohibited: Read-Only Auditor accounts cannot lodge complaint cases."
            )
        if user_role not in ("SUPER_ADMIN",) and complaint_in.bureau != current_user.bureau:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bureau mismatch: You belong to {current_user.bureau} and cannot lodge cases for {complaint_in.bureau}."
            )

    try:
        new_complaint = create_complaint(db, complaint_in, current_user=current_user)
        return complaint_to_out(new_complaint)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/{complaint_id}", response_model=ComplaintOut)
def get_complaint(
    complaint_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Retrieve full record of a specific complaint case with bureau scope enforcement and PII redaction."""
    current_user: Optional[User] = None
    auth_header = request.headers.get("Authorization")
    auth_cookie = request.cookies.get("access_token")
    if auth_header or auth_cookie:
        current_user = get_current_user(request=request, db=db)

    if current_user:
        complaint = verify_bureau_complaint_access(
            complaint_id=complaint_id,
            current_user=current_user,
            db=db,
            request=request,
            is_mutation=False
        )
    else:
        complaint = db.query(Complaint).filter(
            Complaint.id == complaint_id,
            Complaint.is_deleted == False
        ).first()
        if not complaint:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Complaint ID {complaint_id} not found."
            )

    return apply_pii_redaction(complaint_to_out(complaint), current_user)

@router.get("/{complaint_id}/detail", response_model=ComplaintDetailOut)
def get_complaint_detail_with_history(
    complaint_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Retrieve complaint with complete immutable histories, bureau access checks, and PII redaction."""
    current_user: Optional[User] = None
    auth_header = request.headers.get("Authorization")
    auth_cookie = request.cookies.get("access_token")
    if auth_header or auth_cookie:
        current_user = get_current_user(request=request, db=db)

    if current_user:
        complaint = verify_bureau_complaint_access(
            complaint_id=complaint_id,
            current_user=current_user,
            db=db,
            request=request,
            is_mutation=False
        )
    else:
        complaint = db.query(Complaint).filter(
            Complaint.id == complaint_id,
            Complaint.is_deleted == False
        ).first()
        if not complaint:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Complaint ID {complaint_id} not found."
            )

    base_out = apply_pii_redaction(complaint_to_out(complaint), current_user)
    status_history_out = [CaseStatusHistoryOut.model_validate(h) for h in complaint.status_history]
    assignment_history_out = [CaseAssignmentHistoryOut.model_validate(h) for h in complaint.assignment_history]
    timeline_raw = compile_case_timeline(db, complaint_id)
    timeline_out = [TimelineEventOut(**e) for e in timeline_raw]

    return ComplaintDetailOut(
        **base_out.model_dump(),
        status_history=status_history_out,
        assignment_history=assignment_history_out,
        timeline=timeline_out
    )

@router.get("/{complaint_id}/allowed-transitions", response_model=AllowedTransitionsOut)
def get_complaint_allowed_transitions(
    complaint_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns valid next statuses for the current user and complaint,
    enforcing state machine constraints and role boundaries.
    """
    complaint = db.query(Complaint).filter(
        Complaint.id == complaint_id,
        Complaint.is_deleted == False
    ).first()
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")

    user_role = normalize_role(current_user.role)
    can_close = user_role in ("SUPER_ADMIN", "BUREAU_ADMIN")
    allowed = get_allowed_transitions_for_user(complaint.status, user_role, db=db)

    return AllowedTransitionsOut(
        complaint_id=complaint.id,
        current_status=complaint.status,
        user_role=user_role,
        can_close=can_close,
        allowed_transitions=[StatusTransitionOption(**item) for item in allowed]
    )

@router.get("/{complaint_id}/timeline", response_model=List[TimelineEventOut])
def get_complaint_timeline(
    complaint_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Retrieve full chronological action history across all events for this complaint."""
    complaint = db.query(Complaint).filter(
        Complaint.id == complaint_id,
        Complaint.is_deleted == False
    ).first()
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")

    timeline_raw = compile_case_timeline(db, complaint_id)
    return [TimelineEventOut(**e) for e in timeline_raw]

@router.patch("/{complaint_id}/status", response_model=ComplaintOut)
def change_status(
    complaint_id: int,
    payload: StatusUpdateSchema,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update complaint status and record audit log.
    Enforces bureau scope and role-permission transitions.
    Terminal transitions (RESOLVED, DISPOSED) are restricted to Bureau Admins and Super Admins.
    """
    # 1. Enforce bureau scope and reject auditors
    verify_bureau_complaint_access(
        complaint_id=complaint_id,
        current_user=current_user,
        db=db,
        request=request,
        is_mutation=True
    )

    user_role = normalize_role(current_user.role)

    # 2. Restrict final resolution / disposal to Bureau Administrators and Super Admin
    if payload.status in ("RESOLVED", "DISPOSED"):
        if user_role not in ("SUPER_ADMIN", "BUREAU_ADMIN"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: Final case closure ({payload.status}) requires Bureau Administrator approval."
            )
        effective_summary = payload.resolution_summary or payload.reason or payload.notes
        if not effective_summary or not effective_summary.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Official resolution summary is required for case closure."
            )

    try:
        updated = update_complaint_status(
            db=db,
            complaint_id=complaint_id,
            new_status=payload.status,
            notes=payload.reason or payload.notes,
            resolution_summary=payload.resolution_summary,
            current_user=current_user,
            action_taken=payload.action_taken or "STATUS_UPDATE"
        )
        return complaint_to_out(updated)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.patch("/{complaint_id}/assign", response_model=ComplaintOut)
@router.post("/{complaint_id}/assign", response_model=ComplaintOut)
def assign_case_officer(
    complaint_id: int,
    payload: OfficerAssignSchema,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Assign a desk officer to the complaint.
    Strictly restricted to Bureau Administrators within their own bureau and Super Admins.
    """
    # 1. Enforce bureau scope and check read-only auditor (cross-bureau assignment strictly prohibited)
    complaint = verify_bureau_complaint_access(
        complaint_id=complaint_id,
        current_user=current_user,
        db=db,
        request=request,
        is_mutation=True
    )

    user_role = normalize_role(current_user.role)
    if user_role not in ("SUPER_ADMIN", "BUREAU_ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Officer assignment is strictly prohibited for non-administrative roles."
        )

    # 2. Verify candidate officer belongs to the complaint's bureau
    target_officer = db.query(User).filter(User.id == payload.officer_id).first()
    if not target_officer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target officer not found.")
    
    if normalize_role(current_user.role) != "SUPER_ADMIN" and target_officer.bureau != complaint.bureau:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Invalid assignment: Officer {target_officer.full_name} belongs to {target_officer.bureau}, but case belongs to {complaint.bureau}."
        )

    try:
        updated = assign_officer(
            db=db,
            complaint_id=complaint_id,
            officer_id=payload.officer_id,
            current_user=current_user,
            assignment_notes=payload.assignment_notes
        )
        return complaint_to_out(updated)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/{complaint_id}/reassign", response_model=ComplaintOut)
def reassign_case_officer(
    complaint_id: int,
    payload: OfficerReassignSchema,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Reassign an active complaint case to a different case officer.
    Requires an explicit reassignment reason. Restricted to Bureau Admin and Super Admin.
    """
    complaint = verify_bureau_complaint_access(
        complaint_id=complaint_id,
        current_user=current_user,
        db=db,
        request=request,
        is_mutation=True
    )

    user_role = normalize_role(current_user.role)
    if user_role not in ("SUPER_ADMIN", "BUREAU_ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Officer reassignment is strictly prohibited for non-administrative roles."
        )

    if not payload.reassignment_reason or not payload.reassignment_reason.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A formal justification reason is required for officer reassignment."
        )

    target_officer = db.query(User).filter(User.id == payload.officer_id, User.is_active == True).first()
    if not target_officer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target officer not found.")

    if normalize_role(current_user.role) != "SUPER_ADMIN" and target_officer.bureau != complaint.bureau:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Invalid reassignment: Officer belongs to {target_officer.bureau}, but case belongs to {complaint.bureau}."
        )

    try:
        updated = assign_officer(
            db=db,
            complaint_id=complaint_id,
            officer_id=payload.officer_id,
            current_user=current_user,
            assignment_notes=payload.reassignment_reason
        )
        return complaint_to_out(updated)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete("/{complaint_id}", status_code=status.HTTP_200_OK)
def soft_delete_complaint(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN"]))
):
    """Soft-deletes a complaint according to data retention policy. Restricted to Super Admin."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint or complaint.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")
    
    complaint.is_deleted = True
    complaint.updated_at = utc_now()
    db.commit()

    log_audit_event(
        db=db,
        action_type="CASE_ARCHIVED",
        description=f"Complaint {complaint.complaint_no} soft-deleted under data retention policy.",
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_bureau=current_user.bureau,
        complaint_id=complaint.id,
        institution_id=complaint.institution_id,
        commit=True
    )
    return {"message": f"Complaint {complaint.complaint_no} successfully archived."}

@router.post("/{complaint_id}/upload")
def upload_evidence_document(
    complaint_id: int,
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload supporting evidence documents (PDF, DOCX, PNG, JPG, XLSX, CSV, TXT).
    Enforces magic bytes, malware scanning, opaque storage, and bureau scope.
    """
    # Read up to MAX_UPLOAD_SIZE + 1 to detect oversized uploads
    MAX_UPLOAD_SIZE = settings.MAX_ATTACHMENT_SIZE_BYTES
    file_bytes = file.file.read(MAX_UPLOAD_SIZE + 1)
    raw_filename = file.filename or "evidence_document"

    attachment = EvidenceService.upload_attachment(
        db=db,
        complaint_id=complaint_id,
        user=current_user,
        raw_filename=raw_filename,
        file_bytes=file_bytes
    )

    return {
        "attachment_id": attachment.id,
        "storage_key": attachment.storage_key,
        "filename": attachment.file_name,
        "sha256": attachment.sha256_checksum,
        "size_bytes": attachment.file_size_bytes,
        "status": "Uploaded successfully"
    }
