from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Request, status
from sqlalchemy.orm import Session
from backend.app.api.deps import get_db, get_current_user, require_roles
from backend.app.models.institution import Institution
from backend.app.models.user import User
from backend.app.models.audit_log import AuditLog
from backend.app.schemas.institution import (
    InstitutionOut,
    InstitutionCreate,
    InstitutionUpdate,
    InstitutionListResponse,
    InstitutionDossierOut,
    ConflictAlert,
    InstitutionMatchRequest,
    InstitutionMatchResponse,
    InstitutionAuditEntry,
    CSVImportResponse
)
from backend.app.repositories.institution_repository import InstitutionRepository
from backend.app.services.institution_service import (
    create_institution,
    update_institution,
    get_institution_dossier,
    import_institutions_csv
)
from backend.app.services.audit_service import log_audit_event
from backend.app.core.datetime_util import utc_now

router = APIRouter(prefix="/institutions", tags=["Institutions"])

@router.get("", response_model=Union[InstitutionListResponse, List[InstitutionOut]])
def list_institutions(
    search: Optional[str] = Query(None, description="Search by name, normalized name, AICTE ID, AISHE, city, state, or PIN"),
    region: Optional[str] = Query(None, description="Filter by AICTE region (e.g. Western, Northern)"),
    state: Optional[str] = Query(None, description="Filter by state"),
    institution_type: Optional[str] = Query(None, description="Filter by institution type"),
    approval_status: Optional[str] = Query(None, description="Filter by approval status"),
    sort_by: str = Query("name", description="Field to sort by: name, aicte_id, state, created_at"),
    sort_order: str = Query("asc", description="Sort order: asc, desc"),
    page: Optional[int] = Query(None, ge=1, description="Page number for pagination"),
    page_size: Optional[int] = Query(None, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db)
):
    """
    Retrieve registered institutions with multi-facet filtering, full-text search, and sorting.
    Returns paginated InstitutionListResponse when page parameter is provided; otherwise returns List[InstitutionOut].
    """
    repo = InstitutionRepository(db)
    items, total = repo.search_and_filter(
        search=search,
        region=region,
        state=state,
        institution_type=institution_type,
        approval_status=approval_status,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size
    )

    if page is not None:
        p_size = page_size or 20
        return InstitutionListResponse(
            total=total,
            page=page,
            page_size=p_size,
            items=[InstitutionOut.model_validate(i) for i in items]
        )

    return [InstitutionOut.model_validate(i) for i in items]

@router.post("/match", response_model=InstitutionMatchResponse)
def check_institution_duplicate(
    payload: InstitutionMatchRequest,
    db: Session = Depends(get_db)
):
    """
    Normalized Institution Anti-Duplicate Check:
    Evaluates exact AICTE ID, exact AISHE Code, and normalized name + location to flag duplicate entries.
    """
    repo = InstitutionRepository(db)
    is_dup, matched, strategy, confidence, msg = repo.check_duplicate_or_match(
        aicte_id=payload.aicte_id,
        aishe_code=payload.aishe_code,
        name=payload.name,
        city=payload.city,
        state=payload.state
    )

    matched_out = InstitutionOut.model_validate(matched) if matched else None

    return InstitutionMatchResponse(
        is_duplicate=is_dup,
        matched_institution=matched_out,
        match_strategy=strategy,
        confidence_score=confidence,
        message=msg
    )

@router.post("", response_model=InstitutionOut, status_code=status.HTTP_201_CREATED)
def register_institution(
    payload: InstitutionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN", "BUREAU_ADMIN"]))
):
    """
    Registers a new institution following normalized anti-duplicate matching rules.
    Restricted to Super Administrators and Bureau Administrators.
    """
    return create_institution(db=db, data=payload, current_user=current_user)

@router.get("/{institution_id}", response_model=InstitutionOut)
def get_institution(institution_id: int, db: Session = Depends(get_db)):
    """Retrieve institution details by primary key ID."""
    repo = InstitutionRepository(db)
    institution = repo.get_by_id(institution_id)
    if not institution or institution.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution ID {institution_id} not found."
        )
    return InstitutionOut.model_validate(institution)

@router.patch("/{institution_id}", response_model=InstitutionOut)
def update_institution_details(
    institution_id: int,
    payload: InstitutionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN", "BUREAU_ADMIN"]))
):
    """
    Update institution profile with duplicate validation and audit trail.
    Restricted to Super Administrators and Bureau Administrators.
    """
    return update_institution(
        db=db,
        institution_id=institution_id,
        data=payload,
        current_user=current_user
    )

@router.delete("/{institution_id}", status_code=status.HTTP_200_OK)
def delete_institution(
    institution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN"]))
):
    """Soft-deletes an institution according to statutory retention policies. Restricted to Super Admin."""
    repo = InstitutionRepository(db)
    institution = repo.get_by_id(institution_id)
    if not institution or institution.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Institution not found.")
    
    repo.soft_delete(institution)
    db.commit()

    log_audit_event(
        db=db,
        action_type="INSTITUTION_ARCHIVED",
        description=f"Institution {institution.name} ({institution.aicte_id}) soft-deleted.",
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_bureau=current_user.bureau,
        institution_id=institution.id,
        commit=True
    )

    return {"message": f"Institution {institution.aicte_id} successfully archived."}

@router.get("/{institution_id}/dossier", response_model=InstitutionDossierOut)
def get_institution_360_dossier(
    institution_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Unified Institution 360-degree Dossier:
    Returns full institutional history, all past/active complaints across all AICTE bureaus,
    exact breakdown counts (total, open, pending, disposed, overdue, overlapping),
    live cross-bureau conflict radar alert, and chronological audit trail.
    """
    current_user: Optional[User] = None
    auth_header = request.headers.get("Authorization")
    auth_cookie = request.cookies.get("access_token")
    if auth_header or auth_cookie:
        try:
            current_user = get_current_user(request=request, db=db)
        except HTTPException:
            current_user = None

    return get_institution_dossier(db=db, institution_id=institution_id, current_user=current_user)

@router.get("/{institution_id}/audit-history", response_model=List[InstitutionAuditEntry])
def get_institution_audit_history(
    institution_id: int,
    db: Session = Depends(get_db)
):
    """Retrieve chronological audit trail of changes to this institution."""
    repo = InstitutionRepository(db)
    inst = repo.get_by_id(institution_id)
    if not inst or inst.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Institution not found.")

    logs = db.query(AuditLog).filter(
        AuditLog.institution_id == institution_id
    ).order_by(AuditLog.timestamp.desc()).all()

    return [
        InstitutionAuditEntry(
            id=log.id,
            action_type=log.action_type,
            description=log.description,
            actor_name=log.actor_name,
            actor_role=log.actor_role,
            actor_bureau=log.actor_bureau,
            previous_state=log.previous_state,
            new_state=log.new_state,
            timestamp=log.timestamp
        )
        for log in logs
    ]

@router.post("/import-csv", response_model=CSVImportResponse)
async def import_institutions_csv_dataset(
    file: UploadFile = File(...),
    dry_run: bool = Query(True, description="When true, only validates and reports duplicates without persisting"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN", "BUREAU_ADMIN"]))
):
    """
    Batch import synthetic institution datasets from CSV file.
    Validates mandatory schema columns and executes anti-duplicate matching per record.
    Set dry_run=false to persist valid non-duplicate records.
    """
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only CSV files (.csv) are permitted."
        )

    MAX_CSV_SIZE = 10 * 1024 * 1024  # 10 MB limit
    content = await file.read(MAX_CSV_SIZE + 1)
    if len(content) > MAX_CSV_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="CSV file size exceeds the 10 MB maximum permitted limit."
        )
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded CSV file is empty (0 bytes)."
        )

    try:
        csv_text = content.decode("utf-8")
    except UnicodeDecodeError:
        try:
            csv_text = content.decode("latin-1")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to decode CSV file content with UTF-8 or Latin-1 encoding."
            )

    return import_institutions_csv(
        db=db,
        csv_text=csv_text,
        dry_run=dry_run,
        current_user=current_user
    )
