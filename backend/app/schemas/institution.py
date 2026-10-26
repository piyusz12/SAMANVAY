from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class InstitutionBase(BaseModel):
    aicte_id: str
    name: str
    state: str
    city: str
    region: str
    institution_type: str
    approval_status: str = "APPROVED"
    address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

class InstitutionCreate(InstitutionBase):
    pass

class InstitutionOut(InstitutionBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

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
