from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class SearchComplaintItemOut(BaseModel):
    id: int
    complaint_no: str
    institution_id: int
    institution_name: str
    institution_aicte_id: Optional[str] = None
    region: Optional[str] = None
    bureau: str
    category: str
    status: str
    priority: str
    subject: str
    description_snippet: str
    assigned_officer_id: Optional[int] = None
    assigned_officer_name: Optional[str] = None
    sla_deadline_days: int
    sla_due_date: Optional[datetime] = None
    days_open: int = 0
    is_overdue: bool = False
    created_at: datetime
    updated_at: datetime
    match_highlights: List[str] = Field(default_factory=list)

class SearchInstitutionItemOut(BaseModel):
    id: int
    aicte_id: str
    aishe_code: Optional[str] = None
    name: str
    region: str
    state: str
    city: str
    institution_type: str
    approval_status: str
    total_complaints_count: int = 0
    active_complaints_count: int = 0
    is_conflicting: bool = False
    created_at: datetime
    match_highlights: List[str] = Field(default_factory=list)

class UnifiedSearchResponse(BaseModel):
    query: str
    normalized_query: str
    total_matches: int
    complaints_count: int
    institutions_count: int
    page: int
    page_size: int
    complaints: List[SearchComplaintItemOut]
    institutions: List[SearchInstitutionItemOut]

class ComplaintSearchResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[SearchComplaintItemOut]
    applied_filters: Dict[str, Any]

class InstitutionSearchResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[SearchInstitutionItemOut]
    applied_filters: Dict[str, Any]
