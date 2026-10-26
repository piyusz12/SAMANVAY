import os
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from backend.app.api.deps import get_db, get_current_user, require_roles
from backend.app.models.complaint import Complaint
from backend.app.models.institution import Institution
from backend.app.models.user import User
from backend.app.schemas.complaint import (
    ComplaintCreate,
    ComplaintOut,
    ComplaintListResponse,
    StatusUpdateSchema,
    OfficerAssignSchema
)
from backend.app.services.complaint_service import (
    create_complaint,
    update_complaint_status,
    assign_officer,
    complaint_to_out,
    calculate_sla_details
)
from backend.app.services.audit_service import log_audit_event
from backend.app.config import settings

router = APIRouter(prefix="/complaints", tags=["Complaints"])

@router.get("", response_model=ComplaintListResponse)
def list_complaints(
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
    query = db.query(Complaint)

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

    return ComplaintListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[complaint_to_out(c) for c in paged_items]
    )

@router.post("", response_model=ComplaintOut, status_code=status.HTTP_201_CREATED)
def lodge_complaint(
    complaint_in: ComplaintCreate,
    db: Session = Depends(get_db)
):
    """Lodge a new grievance or regulatory complaint in the council coordination system."""
    try:
        new_complaint = create_complaint(db, complaint_in)
        return complaint_to_out(new_complaint)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/{complaint_id}", response_model=ComplaintOut)
def get_complaint(complaint_id: int, db: Session = Depends(get_db)):
    """Retrieve full record of a specific complaint case."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint ID {complaint_id} not found."
        )
    return complaint_to_out(complaint)

@router.patch("/{complaint_id}/status", response_model=ComplaintOut)
def change_status(
    complaint_id: int,
    payload: StatusUpdateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update complaint status and record audit log. Requires authenticated officer/head."""
    try:
        updated = update_complaint_status(
            db=db,
            complaint_id=complaint_id,
            new_status=payload.status,
            notes=payload.notes,
            resolution_summary=payload.resolution_summary,
            current_user=current_user
        )
        return complaint_to_out(updated)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.patch("/{complaint_id}/assign", response_model=ComplaintOut)
def assign_case_officer(
    complaint_id: int,
    payload: OfficerAssignSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["BUREAU_HEAD", "SUPER_ADMIN"]))
):
    """Assign an officer to the complaint. Restricted to Bureau Heads and Admins."""
    try:
        updated = assign_officer(
            db=db,
            complaint_id=complaint_id,
            officer_id=payload.officer_id,
            current_user=current_user
        )
        return complaint_to_out(updated)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/{complaint_id}/upload")
def upload_evidence_document(
    complaint_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload supporting evidence documents (PDF, DOCX, PNG, JPG). Validates size and extension."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")

    allowed_exts = {".pdf", ".docx", ".png", ".jpg", ".jpeg"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed: {', '.join(allowed_exts)}"
        )

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    safe_filename = f"complaint_{complaint_id}_{int(datetime.utcnow().timestamp())}_{file.filename}"
    filepath = os.path.join(settings.UPLOAD_DIR, safe_filename)

    with open(filepath, "wb") as f:
        f.write(file.file.read())

    complaint.evidence_file_name = safe_filename
    db.commit()

    log_audit_event(
        db=db,
        action_type="EVIDENCE_UPLOADED",
        description=f"Evidence document uploaded: {file.filename}",
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_bureau=current_user.bureau,
        complaint_id=complaint.id,
        institution_id=complaint.institution_id,
        commit=True
    )

    return {"filename": safe_filename, "status": "Uploaded successfully"}
