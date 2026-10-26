import os
import hashlib
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
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
from backend.app.schemas.complaint import (
    ComplaintCreate,
    ComplaintOut,
    ComplaintDetailOut,
    ComplaintListResponse,
    StatusUpdateSchema,
    OfficerAssignSchema,
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
from backend.app.services.audit_service import log_audit_event
from backend.app.core.datetime_util import utc_now
from backend.app.config import settings

router = APIRouter(prefix="/complaints", tags=["Complaints"])

def apply_pii_redaction(c_out: ComplaintOut, user: Optional[User]) -> ComplaintOut:
    """Redacts complainant PII for read-only auditor roles and confidential whistleblowers."""
    if not user:
        return c_out

    user_role = normalize_role(user.role)
    if user_role == "AUDITOR":
        c_out.complainant_email = "[REDACTED_FOR_AUDIT]"
        c_out.complainant_phone = "[REDACTED_FOR_AUDIT]"
        if c_out.is_anonymous_confidential:
            c_out.complainant_name = "[CONFIDENTIAL_WHISTLEBLOWER]"
    return c_out

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
    is_overdue: Optional[bool] = Query(None, description="Filter by Overdue SLA"),
    search: Optional[str] = Query(None, description="Search complaint_no, subject, complainant"),
    db: Session = Depends(get_db)
):
    """Retrieve list of complaints with comprehensive filtering, search and pagination."""
    query = db.query(Complaint).filter(Complaint.is_deleted == False)

    if bureau and bureau != "ALL":
        query = query.filter(Complaint.bureau == bureau)
    if status_filter and status_filter != "ALL":
        query = query.filter(Complaint.status == status_filter)
    if institution_id:
        query = query.filter(Complaint.institution_id == institution_id)
    if priority and priority != "ALL":
        query = query.filter(Complaint.priority == priority)
    if category and category != "ALL":
        query = query.filter(Complaint.category == category)
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

    all_items = query.order_by(desc(Complaint.created_at)).all()
    
    # Filter overdue if requested
    if is_overdue is not None:
        filtered = []
        for c in all_items:
            _, overdue_flag, _ = calculate_sla_details(c)
            if overdue_flag == is_overdue:
                filtered.append(c)
        all_items = filtered

    total = len(all_items)
    start_idx = (page - 1) * page_size
    paged_items = all_items[start_idx : start_idx + page_size]

    current_user: Optional[User] = None
    auth_header = request.headers.get("Authorization")
    auth_cookie = request.cookies.get("access_token")
    if auth_header or auth_cookie:
        try:
            current_user = get_current_user(request=request, db=db)
        except HTTPException:
            current_user = None

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
    """Retrieve full record of a specific complaint case."""
    complaint = db.query(Complaint).filter(
        Complaint.id == complaint_id,
        Complaint.is_deleted == False
    ).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint ID {complaint_id} not found."
        )

    current_user: Optional[User] = None
    auth_header = request.headers.get("Authorization")
    auth_cookie = request.cookies.get("access_token")
    if auth_header or auth_cookie:
        try:
            current_user = get_current_user(request=request, db=db)
        except HTTPException:
            current_user = None

    return apply_pii_redaction(complaint_to_out(complaint), current_user)

@router.get("/{complaint_id}/detail", response_model=ComplaintDetailOut)
def get_complaint_detail_with_history(
    complaint_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Retrieve complaint with complete immutable status and assignment histories."""
    complaint = db.query(Complaint).filter(
        Complaint.id == complaint_id,
        Complaint.is_deleted == False
    ).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint ID {complaint_id} not found."
        )

    current_user: Optional[User] = None
    auth_header = request.headers.get("Authorization")
    auth_cookie = request.cookies.get("access_token")
    if auth_header or auth_cookie:
        try:
            current_user = get_current_user(request=request, db=db)
        except HTTPException:
            current_user = None

    base_out = apply_pii_redaction(complaint_to_out(complaint), current_user)
    status_history_out = [CaseStatusHistoryOut.model_validate(h) for h in complaint.status_history]
    assignment_history_out = [CaseAssignmentHistoryOut.model_validate(h) for h in complaint.assignment_history]

    return ComplaintDetailOut(
        **base_out.model_dump(),
        status_history=status_history_out,
        assignment_history=assignment_history_out
    )

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
        if not payload.resolution_summary or not payload.resolution_summary.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Official resolution summary is required for case closure."
            )

    try:
        updated = update_complaint_status(
            db=db,
            complaint_id=complaint_id,
            new_status=payload.status,
            notes=payload.notes,
            resolution_summary=payload.resolution_summary,
            current_user=current_user,
            action_taken=payload.action_taken or "STATUS_UPDATE"
        )
        return complaint_to_out(updated)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.patch("/{complaint_id}/assign", response_model=ComplaintOut)
def assign_case_officer(
    complaint_id: int,
    payload: OfficerAssignSchema,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["BUREAU_ADMIN", "SUPER_ADMIN"]))
):
    """
    Assign a desk officer to the complaint.
    Strictly restricted to Bureau Administrators within their own bureau and Super Admins.
    """
    # 1. Enforce bureau scope (cross-bureau assignment strictly prohibited)
    complaint = verify_bureau_complaint_access(
        complaint_id=complaint_id,
        current_user=current_user,
        db=db,
        request=request,
        is_mutation=True
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

@router.post("/{complaint_id}/assign", response_model=ComplaintOut)
def assign_case_officer(
    complaint_id: int,
    payload: OfficerAssignSchema,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Assign complaint case to a specific case officer.
    Restricted to Bureau Administrators and Super Admin.
    Enforces bureau scope: target officer must belong to the managing bureau.
    """
    # 1. Enforce bureau scope and reject auditors
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
            detail="Assignment prohibited: Only Bureau Administrators or Super Admin can assign cases."
        )

    # 2. Validate target officer
    officer = db.query(User).filter(User.id == payload.officer_id, User.is_active == True).first()
    if not officer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Officer with ID {payload.officer_id} not found."
        )

    # 3. Check officer bureau matches complaint bureau
    if user_role != "SUPER_ADMIN" and officer.bureau != complaint.bureau:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cross-bureau assignment prohibited: Officer belongs to {officer.bureau}, but case is managed by {complaint.bureau}."
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

@router.post("/{complaint_id}/upload")
def upload_evidence_document(
    complaint_id: int,
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload supporting evidence documents (PDF, DOCX, PNG, JPG).
    Enforces bureau scope and prevents Auditors from mutating files.
    """
    # 1. Enforce bureau scope and reject auditors
    complaint = verify_bureau_complaint_access(
        complaint_id=complaint_id,
        current_user=current_user,
        db=db,
        request=request,
        is_mutation=True
    )

    allowed_exts = {".pdf", ".docx", ".png", ".jpg", ".jpeg"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed: {', '.join(allowed_exts)}"
        )

    file_bytes = file.file.read()
    file_size = len(file_bytes)
    sha256 = hashlib.sha256(file_bytes).hexdigest()

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    timestamp_tag = int(utc_now().timestamp())
    safe_filename = f"complaint_{complaint_id}_{timestamp_tag}_{file.filename}"
    filepath = os.path.join(settings.UPLOAD_DIR, safe_filename)

    with open(filepath, "wb") as f:
        f.write(file_bytes)

    complaint.evidence_file_name = safe_filename
    
    # Create EvidenceAttachment record
    attachment = EvidenceAttachment(
        complaint_id=complaint.id,
        file_name=safe_filename,
        original_file_name=file.filename,
        file_path=filepath,
        file_size_bytes=file_size,
        mime_type=file.content_type or "application/octet-stream",
        sha256_checksum=sha256,
        uploaded_by_id=current_user.id,
        retention_status="ACTIVE",
        is_confidential=False,
        created_at=utc_now()
    )
    db.add(attachment)
    db.commit()

    log_audit_event(
        db=db,
        action_type="EVIDENCE_UPLOADED",
        description=f"Evidence document uploaded: {file.filename} (SHA256: {sha256[:12]}...)",
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_bureau=current_user.bureau,
        complaint_id=complaint.id,
        institution_id=complaint.institution_id,
        commit=True
    )

    return {
        "filename": safe_filename,
        "sha256": sha256,
        "size_bytes": file_size,
        "status": "Uploaded successfully"
    }
