from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class NotificationDeliveryAttemptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    notification_id: int
    channel: str
    attempt_number: int
    status: str
    recipient: Optional[str] = None
    error_message: Optional[str] = None
    attempted_at: datetime
    next_retry_at: Optional[datetime] = None


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: Optional[int] = None
    target_bureau: Optional[str] = None
    target_role: Optional[str] = None
    complaint_id: Optional[int] = None
    institution_id: Optional[int] = None
    follow_up_task_id: Optional[int] = None
    linkage_id: Optional[int] = None
    alert_type: str
    severity: str
    title: str
    message: str
    delivery_channel: str
    delivery_status: str
    is_read: bool
    read_at: Optional[datetime] = None
    escalation_level: int = 0
    idempotency_key: Optional[str] = None
    created_at: datetime
    created_at_ist: Optional[str] = None
    delivery_attempts: Optional[List[NotificationDeliveryAttemptOut]] = None


class NotificationListResponse(BaseModel):
    total: int
    unread_count: int
    page: int
    page_size: int
    items: List[NotificationOut]


class AlertConfigOut(BaseModel):
    reminder_intervals_days: List[int]
    overdue_reminder_frequency_days: int
    unresolved_overlap_threshold_days: int
    overdue_task_threshold_days: int
    escalation_level_1_days_before: int
    escalation_level_2_days_overdue: int
    escalation_level_3_days_overdue: int
    critical_priority_escalation_days: int
    email_delivery_enabled: bool
    email_provider_type: str


class AlertConfigUpdate(BaseModel):
    reminder_intervals_days: Optional[List[int]] = None
    overdue_reminder_frequency_days: Optional[int] = Field(None, ge=1, le=30)
    unresolved_overlap_threshold_days: Optional[int] = Field(None, ge=1, le=60)
    overdue_task_threshold_days: Optional[int] = Field(None, ge=1, le=30)
    escalation_level_1_days_before: Optional[int] = Field(None, ge=1, le=14)
    escalation_level_2_days_overdue: Optional[int] = Field(None, ge=0, le=14)
    escalation_level_3_days_overdue: Optional[int] = Field(None, ge=1, le=30)
    critical_priority_escalation_days: Optional[int] = Field(None, ge=1, le=14)
    email_delivery_enabled: Optional[bool] = None


class SchedulerRunResult(BaseModel):
    timestamp: datetime
    timestamp_ist: str
    checks_performed: Dict[str, int]
    alerts_created: int
    escalations_triggered: int
    deliveries_attempted: int
    deliveries_succeeded: int
    deliveries_failed: int
    retries_attempted: int
    details: List[str]
