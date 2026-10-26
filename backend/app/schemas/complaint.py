from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field

class ComplaintCreate(BaseModel):
    institution_id: int
    bureau: str = Field(..., description="Bureau handling this case, e.g. REGULATION_BUREAU, PGRC")
    complainant_name: str
    complainant_category: str
    complainant_email: Optional[str] = None
    complainant_phone: Optional[str] = None
    subject: str
    description: str
    category: str
    priority: str = "MEDIUM"
    sla_deadline_days: int = 30
    internal_notes: Optional[str] = None

class ComplaintUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_officer_id: Optional[int] = None
    internal_notes: Optional[str] = None
    resolution_summary: Optional[str] = None

class StatusUpdateSchema(BaseModel):
    status: str
    notes: Optional[str] = None
    resolution_summary: Optional[str] = None

class OfficerAssignSchema(BaseModel):
    officer_id: int

class ComplaintOut(BaseModel):
    id: int
    complaint_no: str
    institution_id: int
    institution_name: Optional[str] = None
    institution_aicte_id: Optional[str] = None
    bureau: str
    complainant_name: str
    complainant_category: str
    complainant_email: Optional[str] = None
    complainant_phone: Optional[str] = None
    subject: str
    description: str
    category: str
    status: str
    priority: str
    sla_deadline_days: int
    days_open: int
    is_overdue: bool
    sla_status: str  # ON_TRACK, APPROACHING_DEADLINE, OVERDUE
    assigned_officer_id: Optional[int] = None
    assigned_officer_name: Optional[str] = None
    internal_notes: Optional[str] = None
    evidence_file_name: Optional[str] = None
    resolution_summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    disposed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ComplaintListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[ComplaintOut]
