from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class ActionHistoryItemOut(BaseModel):
    id: int
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    actor_bureau: Optional[str] = None
    action_type: str
    description: Optional[str] = None
    created_at: datetime

class StatusHistoryItemOut(BaseModel):
    id: int
    from_status: Optional[str] = None
    to_status: str
    reason: Optional[str] = None
    changed_by_name: Optional[str] = None
    created_at: datetime

class SideBySideComplaintOut(BaseModel):
    id: int
    complaint_no: str
    institution_id: int
    institution_name: str
    institution_aicte_id: Optional[str] = None
    institution_aishe_code: Optional[str] = None
    bureau: str
    assigned_officer_id: Optional[int] = None
    assigned_officer_name: Optional[str] = None
    status: str
    priority: str
    category: str
    subject: str
    description: str
    sla_due_date: Optional[datetime] = None
    is_overdue: bool = False
    days_overdue: int = 0
    days_remaining: int = 0
    created_at: datetime
    updated_at: datetime
    last_action: Optional[str] = None
    last_action_date: Optional[datetime] = None
    status_history: List[StatusHistoryItemOut] = Field(default_factory=list)
    action_history: List[ActionHistoryItemOut] = Field(default_factory=list)

class CoordinationDecisionCreate(BaseModel):
    coordination_decision: str  # JOINT_INSPECTION, LEGAL_REFERRAL, BUREAU_TRANSFER, INDEPENDENT_PARALLEL_PROCEEDINGS, NO_ACTION_REQUIRED, EVIDENCE_SHARING, HEARING_COORDINATED
    lead_bureau: Optional[str] = None
    lead_officer_id: Optional[int] = None
    coordination_notes: Optional[str] = None
    coordination_deadline: Optional[datetime] = None
    expected_version: Optional[int] = None  # Optimistic concurrency conflict check token

class CoordinationUnlinkRequest(BaseModel):
    unlink_reason: str
    expected_version: Optional[int] = None

class CoordinationTaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to_id: Optional[int] = None
    target_bureau: Optional[str] = None
    complaint_id: Optional[int] = None
    deadline: datetime
    priority: str = "MEDIUM"

class CoordinationTaskUpdate(BaseModel):
    status: Optional[str] = None  # PENDING, IN_PROGRESS, COMPLETED, OVERDUE, CANCELLED
    completion_notes: Optional[str] = None
    deadline: Optional[datetime] = None
    priority: Optional[str] = None
    assigned_to_id: Optional[int] = None

class CoordinationTaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    linkage_id: Optional[int] = None
    complaint_id: Optional[int] = None
    complaint_no: Optional[str] = None
    title: str
    description: Optional[str] = None
    assigned_to_id: Optional[int] = None
    assigned_to_name: Optional[str] = None
    target_bureau: Optional[str] = None
    created_by_id: Optional[int] = None
    created_by_name: Optional[str] = None
    deadline: datetime
    status: str
    priority: str
    is_overdue: bool = False
    completed_at: Optional[datetime] = None
    completion_notes: Optional[str] = None
    created_at: datetime

class CoordinationWorkspaceItemOut(BaseModel):
    linkage_id: int
    status: str
    is_active: bool
    link_type: str
    similarity_score: float
    confidence_tier: str
    reasons: List[str] = Field(default_factory=list)
    institution_id: int
    institution_name: str
    institution_aicte_id: Optional[str] = None
    source_complaint_id: int
    source_complaint_no: str
    source_bureau: str
    source_status: str
    source_assigned_officer_name: Optional[str] = None
    target_complaint_id: int
    target_complaint_no: str
    target_bureau: str
    target_status: str
    target_assigned_officer_name: Optional[str] = None
    coordination_decision: Optional[str] = None
    lead_bureau: Optional[str] = None
    coordination_deadline: Optional[datetime] = None
    version: int
    outstanding_tasks_count: int = 0
    overdue_tasks_count: int = 0
    created_at: datetime
    updated_at: datetime

class CoordinationWorkspaceDetailOut(BaseModel):
    linkage_id: int
    status: str
    is_active: bool
    link_type: str
    similarity_score: float
    confidence_tier: str
    explanation: Dict[str, Any] = Field(default_factory=dict)
    reasons: List[str] = Field(default_factory=list)
    rationale: Optional[str] = None
    source_complaint: SideBySideComplaintOut
    target_complaint: SideBySideComplaintOut
    coordination_decision: Optional[str] = None
    coordination_notes: Optional[str] = None
    lead_bureau: Optional[str] = None
    lead_officer_id: Optional[int] = None
    lead_officer_name: Optional[str] = None
    coordination_deadline: Optional[datetime] = None
    version: int
    follow_up_tasks: List[CoordinationTaskOut] = Field(default_factory=list)
    outstanding_tasks_count: int = 0
    overdue_tasks_count: int = 0
    verified_by_id: Optional[int] = None
    verified_by_name: Optional[str] = None
    verification_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    unlinked_at: Optional[datetime] = None
    unlinked_by_id: Optional[int] = None
    unlinked_by_name: Optional[str] = None
    unlink_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
