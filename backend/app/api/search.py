from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db, get_optional_current_user
from backend.app.models.user import User
from backend.app.schemas.search import (
    UnifiedSearchResponse,
    ComplaintSearchResponse,
    InstitutionSearchResponse
)
from backend.app.services.search_service import (
    search_unified,
    search_complaints,
    search_institutions
)

router = APIRouter(prefix="/search", tags=["Unified Search & Filtering"])

@router.get("/unified", response_model=UnifiedSearchResponse)
def unified_search_endpoint(
    q: Optional[str] = Query(None, description="Search query string (Institution Name, AICTE ID, Complaint No, keywords)"),
    bureau: Optional[str] = Query(None, description="Optional bureau filter"),
    region: Optional[str] = Query(None, description="Optional AICTE region filter"),
    category: Optional[str] = Query(None, description="Optional complaint category filter"),
    status: Optional[str] = Query(None, description="Optional complaint status filter"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=50, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Unified multi-entity search across technical institutions and active complaint cases.
    Safely normalizes search tokens without degrading exact identifier accuracy.
    Enforces bureau-scoped security on all results.
    """
    return search_unified(
        db=db,
        q=q,
        bureau=bureau,
        region=region,
        category=category,
        status_filter=status,
        page=page,
        page_size=page_size,
        current_user=current_user
    )

@router.get("/complaints", response_model=ComplaintSearchResponse)
def search_complaints_endpoint(
    q: Optional[str] = Query(None, description="Search keyword, description, or subject"),
    institution_name: Optional[str] = Query(None, description="Filter by Institution Name"),
    institution_identifier: Optional[str] = Query(None, description="Filter by AICTE ID or AISHE Code"),
    complaint_no: Optional[str] = Query(None, description="Filter by exact Complaint Reference No"),
    bureau: Optional[str] = Query(None, description="Filter by AICTE Bureau (e.g. REGULATION_BUREAU, PGRC)"),
    region: Optional[str] = Query(None, description="Filter by AICTE Region"),
    category: Optional[str] = Query(None, description="Filter by Complaint Category"),
    status: Optional[str] = Query(None, description="Filter by Case Status"),
    assigned_officer_id: Optional[int] = Query(None, description="Filter by Desk Officer ID"),
    is_overdue: Optional[bool] = Query(None, description="Filter by Overdue SLA status"),
    date_from: Optional[str] = Query(None, description="Filter by received date start (ISO)"),
    date_to: Optional[str] = Query(None, description="Filter by received date end (ISO)"),
    sort_by: str = Query("created_at", description="Sort field: created_at, priority, sla_due_date, status, complaint_no"),
    sort_dir: str = Query("desc", description="Sort direction: asc or desc"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Typed, parameterized complaint search with server-side pagination, verified anti-injection
    parameterization, validated sorting, and bureau-scoped permission enforcement.
    """
    return search_complaints(
        db=db,
        q=q,
        institution_name=institution_name,
        institution_identifier=institution_identifier,
        complaint_no=complaint_no,
        bureau=bureau,
        region=region,
        category=category,
        status_filter=status,
        assigned_officer_id=assigned_officer_id,
        is_overdue=is_overdue,
        date_from=date_from,
        date_to=date_to,
        sort_by=sort_by,
        sort_dir=sort_dir,
        page=page,
        page_size=page_size,
        current_user=current_user
    )

@router.get("/institutions", response_model=InstitutionSearchResponse)
def search_institutions_endpoint(
    q: Optional[str] = Query(None, description="Search institution name, AICTE ID, AISHE code, or location"),
    region: Optional[str] = Query(None, description="Filter by AICTE Region"),
    state: Optional[str] = Query(None, description="Filter by State"),
    institution_type: Optional[str] = Query(None, description="Filter by Institution Type"),
    sort_by: str = Query("name", description="Sort field: name, aicte_id, created_at, region"),
    sort_dir: str = Query("asc", description="Sort direction: asc or desc"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Typed institution search with pagination, multi-attribute indexing,
    and cross-bureau active case statistics.
    """
    return search_institutions(
        db=db,
        q=q,
        region=region,
        state=state,
        institution_type=institution_type,
        sort_by=sort_by,
        sort_dir=sort_dir,
        page=page,
        page_size=page_size,
        current_user=current_user
    )
