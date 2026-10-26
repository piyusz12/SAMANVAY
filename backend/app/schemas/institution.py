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

class ConflictAlert(BaseModel):
    has_conflict: bool
    bureaus_involved: List[str]
    active_cases_count: int
    message: str

class InstitutionDossierOut(BaseModel):
    institution: InstitutionOut
    total_complaints: int
    active_complaints: int
    disposed_complaints: int
    bureaus_involved: List[str]
    conflict_alert: ConflictAlert
    recent_complaints: List[dict]

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
