from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class InstitutionBase(BaseModel):
    aicte_id: str
    aishe_code: Optional[str] = None
    name: str
    state: str
    city: str
    pin_code: Optional[str] = None
    region: str
    institution_type: str
    approval_status: str = "APPROVED"
    address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

class InstitutionCreate(InstitutionBase):
    pass

class InstitutionUpdate(BaseModel):
    aishe_code: Optional[str] = None
    name: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    pin_code: Optional[str] = None
    region: Optional[str] = None
    institution_type: Optional[str] = None
    approval_status: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    is_active: Optional[bool] = None

class InstitutionOut(InstitutionBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    normalized_name: Optional[str] = None
    is_active: bool = True
    is_deleted: bool = False
    created_at: datetime
    updated_at: datetime

class InstitutionListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[InstitutionOut]

class ConflictAlert(BaseModel):
    has_conflict: bool
    bureaus_involved: List[str]
    active_cases_count: int
    message: str

class InstitutionAuditEntry(BaseModel):
    id: int
    action_type: str
    description: str
    actor_name: str
    actor_role: str
    actor_bureau: str
    previous_state: Optional[str] = None
    new_state: Optional[str] = None
    timestamp: datetime

class InstitutionDossierOut(BaseModel):
    institution: InstitutionOut
    total_complaints: int
    active_complaints: int
    open_complaints: int
    pending_complaints: int
    disposed_complaints: int
    overdue_complaints: int
    overlapping_complaints: int
    bureaus_involved: List[str]
    conflict_alert: ConflictAlert
    recent_complaints: List[dict]
    audit_history: Optional[List[dict]] = []

class InstitutionMatchRequest(BaseModel):
    aicte_id: Optional[str] = None
    aishe_code: Optional[str] = None
    name: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None

class InstitutionMatchResponse(BaseModel):
    is_duplicate: bool
    matched_institution: Optional[InstitutionOut] = None
    match_strategy: Optional[str] = None  # AICTE_ID_EXACT, AISHE_CODE_EXACT, NORMALIZED_NAME_CITY_STATE
    confidence_score: float
    message: str

class CSVImportItemResult(BaseModel):
    row_number: int
    aicte_id: str
    name: str
    status: str  # "IMPORTED", "DUPLICATE_SKIPPED", "VALIDATION_ERROR"
    reason: Optional[str] = None
    matched_institution_id: Optional[int] = None

class CSVImportResponse(BaseModel):
    dry_run: bool
    total_rows: int
    imported_count: int
    skipped_duplicates_count: int
    error_count: int
    results: List[CSVImportItemResult]
    message: str

