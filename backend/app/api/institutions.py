from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.app.api.deps import get_db, get_current_user
from backend.app.models.institution import Institution
from backend.app.models.complaint import Complaint
from backend.app.models.user import User
from backend.app.schemas.institution import InstitutionOut, InstitutionDossierOut, ConflictAlert
from backend.app.services.overlap_service import check_institution_conflict, ACTIVE_STATUSES
from backend.app.services.complaint_service import calculate_sla_details

router = APIRouter(prefix="/institutions", tags=["Institutions"])

@router.get("", response_model=List[InstitutionOut])
def list_institutions(
    search: Optional[str] = Query(None, description="Search by name, AICTE ID, or city"),
    region: Optional[str] = Query(None, description="Filter by AICTE region"),
    state: Optional[str] = Query(None, description="Filter by state"),
    db: Session = Depends(get_db)
):
    """Retrieve list of registered institutions with optional multi-facet filtering."""
    query = db.query(Institution)
    
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            or_(
                Institution.name.ilike(search_fmt),
                Institution.aicte_id.ilike(search_fmt),
                Institution.city.ilike(search_fmt),
                Institution.state.ilike(search_fmt)
            )
        )
    if region:
        query = query.filter(Institution.region == region)
    if state:
        query = query.filter(Institution.state == state)

    return query.order_by(Institution.name.asc()).all()

@router.get("/{institution_id}", response_model=InstitutionOut)
def get_institution(institution_id: int, db: Session = Depends(get_db)):
    """Retrieve institution details by primary key."""
    institution = db.query(Institution).filter(Institution.id == institution_id).first()
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution ID {institution_id} not found."
        )
    return institution

@router.get("/{institution_id}/dossier", response_model=InstitutionDossierOut)
def get_institution_dossier(
    institution_id: int,
    db: Session = Depends(get_db)
):
    """
    Unified Institution 360-degree Dossier:
    Returns full institutional history, all past/active complaints across all AICTE bureaus,
    and live cross-bureau conflict radar alert.
    """
    institution = db.query(Institution).filter(Institution.id == institution_id).first()
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution ID {institution_id} not found."
        )

    complaints = db.query(Complaint).filter(Complaint.institution_id == institution_id).order_by(Complaint.created_at.desc()).all()
    
    active_count = sum(1 for c in complaints if c.status in ACTIVE_STATUSES)
    disposed_count = sum(1 for c in complaints if c.status in ["DISPOSED", "RESOLVED"])
    bureaus_involved = list(set(c.bureau for c in complaints))

    conflict_data = check_institution_conflict(db, institution_id)
    conflict_alert = ConflictAlert(
        has_conflict=conflict_data["has_conflict"],
        bureaus_involved=conflict_data["bureaus_involved"],
        active_cases_count=conflict_data["active_cases_count"],
        message=conflict_data["message"]
    )

    recent_complaints_data = []
    for c in complaints:
        days_open, is_overdue, sla_status = calculate_sla_details(c)
        recent_complaints_data.append({
            "id": c.id,
            "complaint_no": c.complaint_no,
            "bureau": c.bureau,
            "subject": c.subject,
            "category": c.category,
            "status": c.status,
            "priority": c.priority,
            "days_open": days_open,
            "is_overdue": is_overdue,
            "sla_status": sla_status,
            "created_at": c.created_at.isoformat(),
            "assigned_officer_name": c.assigned_officer_name
        })

    return InstitutionDossierOut(
        institution=InstitutionOut.model_validate(institution),
        total_complaints=len(complaints),
        active_complaints=active_count,
        disposed_complaints=disposed_count,
        bureaus_involved=bureaus_involved,
        conflict_alert=conflict_alert,
        recent_complaints=recent_complaints_data
    )
