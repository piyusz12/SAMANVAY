from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class CaseStatusHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    complaint_id: int
    from_status: Optional[str] = None
    to_status: str
    action_taken: str
    changed_by_id: Optional[int] = None
    remarks: Optional[str] = None
    created_at: datetime

class CaseAssignmentHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    complaint_id: int
    assigned_officer_id: Optional[int] = None
    previous_officer_id: Optional[int] = None
    assigned_by_id: Optional[int] = None
    bureau: str
    assignment_notes: Optional[str] = None
    is_current: bool
    created_at: datetime

class ComplaintCreate(BaseModel):
    institution_id: int
    bureau: str = Field(..., description="Bureau handling this case, e.g. REGULATION_BUREAU, PGRC")
    complainant_name: str
    complainant_category: str
    complainant_email: Optional[str] = None
    complainant_phone: Optional[str] = None
    is_anonymous_confidential: bool = False
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
    action_taken: Optional[str] = "STATUS_UPDATE"
    notes: Optional[str] = None
    resolution_summary: Optional[str] = None

class OfficerAssignSchema(BaseModel):
    officer_id: int
    assignment_notes: Optional[str] = None

class ComplaintOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
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
    is_anonymous_confidential: bool = False
    subject: str
    description: str
    category: str
    status: str
    priority: str
    sla_deadline_days: int
    sla_due_date: Optional[datetime] = None
    days_open: int
    is_overdue: bool
    sla_status: str  # ON_TRACK, APPROACHING_DEADLINE, OVERDUE
    assigned_officer_id: Optional[int] = None
    assigned_officer_name: Optional[str] = None
    internal_notes: Optional[str] = None
    evidence_file_name: Optional[str] = None
    resolution_summary: Optional[str] = None
    is_deleted: bool = False
    created_at: datetime
    updated_at: datetime
    disposed_at: Optional[datetime] = None

class ComplaintDetailOut(ComplaintOut):
    status_history: List[CaseStatusHistoryOut] = []
    assignment_history: List[CaseAssignmentHistoryOut] = []

class ComplaintListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[ComplaintOut]
