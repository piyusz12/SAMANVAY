from typing import List, Dict
from pydantic import BaseModel

class BureauMetric(BaseModel):
    bureau: str
    total_cases: int
    active_cases: int
    resolved_cases: int
    overdue_cases: int
    avg_resolution_days: float

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

class DashboardOverviewOut(BaseModel):
    total_institutions: int
    total_complaints: int
    active_complaints: int
    resolved_complaints: int
    disposed_complaints: int
    overdue_complaints: int
    conflicting_institutions_count: int
    pending_transfers_count: int
    bureau_metrics: List[BureauMetric]
    region_metrics: List[RegionMetric]
    category_distribution: List[CategoryMetric]
    hotspot_institutions: List[HotspotInstitution]
