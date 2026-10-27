from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class ReportMetadata(BaseModel):
    report_type: str
    report_title: str
    generated_at: datetime
    generated_by: str
    user_role: str
    user_bureau: Optional[str] = None
    selected_filters: Dict[str, Any]
    record_count: int
    is_truncated: bool = False

class BureauReportItem(BaseModel):
    bureau: str
    bureau_name: str
    total_cases: int
    open_cases: int
    under_process_cases: int
    disposed_cases: int
    transferred_cases: int
    overdue_cases: int
    avg_resolution_days: float
    sla_compliance_rate: float
    officer_count: int

class RegionReportItem(BaseModel):
    region: str
    total_institutions: int
    total_complaints: int
    active_complaints: int
    resolved_complaints: int
    overdue_complaints: int

class InstitutionHistoryItem(BaseModel):
    institution_id: int
    institution_name: str
    aishe_code: Optional[str] = None
    region: str
    state: str
    total_complaints: int
    active_complaints: int
    resolved_complaints: int
    highest_priority: str
    primary_category: str

class PendingAgeingBucket(BaseModel):
    bucket: str
    case_count: int
    percentage: float

class PendingAgeingReport(BaseModel):
    total_pending: int
    average_age_days: float
    oldest_case_days: int
    buckets: List[PendingAgeingBucket]
    ageing_cases: List[Dict[str, Any]]

class DisposalTrendItem(BaseModel):
    period: str
    received_count: int
    disposed_count: int
    avg_resolution_days: float
    disposed_percentage: float

class OverlapReportData(BaseModel):
    total_candidate_pairs: int
    pending_review: int
    confirmed_linked: int
    dismissed: int
    cross_bureau_summary: Dict[str, int]
    linkage_records: List[Dict[str, Any]]

class DeadlineEscalationData(BaseModel):
    upcoming_7_days: int
    upcoming_15_days: int
    overdue_cases: int
    escalated_level_1: int
    escalated_level_2: int
    escalated_level_3: int
    critical_overdue_list: List[Dict[str, Any]]

class GenericReportResponse(BaseModel):
    metadata: ReportMetadata
    data: Any
