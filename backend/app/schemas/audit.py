from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class AuditLogOut(BaseModel):
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
    timestamp: datetime

    class Config:
        from_attributes = True

class NotificationOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    target_bureau: Optional[str] = None
    complaint_id: Optional[int] = None
    institution_id: Optional[int] = None
    alert_type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
