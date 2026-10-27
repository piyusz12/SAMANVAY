from typing import List, Dict, Optional
from pydantic import BaseModel, Field

class AgeingBucket(BaseModel):
    bucket: str
    count: int
    percentage: float

class MonthlyTrend(BaseModel):
    period: str
    received: int
    disposed: int

class QuarterlyTrend(BaseModel):
    quarter: str
    received: int
    disposed: int

class ResolutionMetrics(BaseModel):
    average_resolution_days: float
    median_resolution_days: float
    sla_compliance_rate_percent: float
    total_disposed: int
    resolved_count: int
    disposed_count: int
    rejected_count: int

class BureauMetric(BaseModel):
    bureau: str
    bureau_name: Optional[str] = None
    total_cases: int
    open_pending: Optional[int] = 0
    under_process: Optional[int] = 0
    active_cases: int
    resolved_cases: int
    overdue_cases: int
    transferred_cases: Optional[int] = 0
    avg_resolution_days: float
    sla_compliance_percent: Optional[float] = 100.0

class RegionMetric(BaseModel):
    region: str
    total_cases: int
    active_cases: int
    conflicting_institutions: int

class CategoryMetric(BaseModel):
    category: str
    count: int

class HotspotInstitution(BaseModel):
    institution_id: int
    aicte_id: str
    name: str
    state: str
    active_cases: int
    bureaus_involved: List[str]
    is_conflicting: bool

class InstitutionSummaryItem(BaseModel):
    institution_id: int
    aicte_id: str
    name: str
    region: str
    state: str
    total_cases: int
    active_cases: int
    overdue_cases: int
    disposed_cases: int
    bureaus_involved: List[str]
    is_conflicting: bool
    confirmed_links_count: int

class DashboardOverviewOut(BaseModel):
    # Role & Bureau Scope Context
    user_scope_bureau: Optional[str] = None
    user_role: Optional[str] = "SUPER_ADMIN"
    
    # 1. Primary Volume Metrics (strictly non-overlapping partitions)
    total_complaints_received: int
    open_pending_complaints: int
    complaints_under_process: int
    disposed_complaints: int
    transferred_complaints: int
    overdue_complaints: int
    
    # Entity Counts (distinguishing cases vs institutions vs related links)
    total_institutions_count: int
    conflicting_institutions_count: int
    potential_overlaps_awaiting_review: int
    confirmed_related_groups_count: int
    
    # 2. Ageing Distribution
    ageing_distribution: List[AgeingBucket]
    
    # 3. Workload & Breakdown Metrics
    bureau_metrics: List[BureauMetric]
    region_metrics: List[RegionMetric]
    category_distribution: List[CategoryMetric]
    
    # 4. Longitudinal Trends & Velocity
    monthly_trends: List[MonthlyTrend]
    quarterly_trends: List[QuarterlyTrend]
    resolution_metrics: ResolutionMetrics
    
    # 5. Institution-Wise Summaries
    institution_summaries: List[InstitutionSummaryItem]
    hotspot_institutions: List[HotspotInstitution]
    
    # Backward Compatibility Aliases for Phase 01-08 components
    total_institutions: int
    total_complaints: int
    active_complaints: int
    resolved_complaints: int
    pending_transfers_count: int
