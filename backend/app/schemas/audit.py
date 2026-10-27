from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    complaint_id: Optional[int] = None
    institution_id: Optional[int] = None
    actor_id: Optional[int] = None
    actor_name: str
    actor_role: str
    actor_bureau: str
    action_type: str
    description: str
    previous_state: Optional[str] = None
    new_state: Optional[str] = None
    ip_address: Optional[str] = None
    request_id: Optional[str] = None
    timestamp: datetime
    prev_hash: Optional[str] = None
    entry_hash: Optional[str] = None

class NotificationDeliveryAttemptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    notification_id: int
    channel: str
    attempt_number: int
    status: str
    error_message: Optional[str] = None
    attempted_at: datetime

class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: Optional[int] = None
    target_bureau: Optional[str] = None
    complaint_id: Optional[int] = None
    institution_id: Optional[int] = None
    alert_type: str
    title: str
    message: str
    delivery_channel: str
    delivery_status: str
    is_read: bool
    created_at: datetime
