from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class FollowUpTaskBase(BaseModel):
    complaint_id: int
    title: str
    description: Optional[str] = None
    deadline: datetime
    priority: str = "MEDIUM"
    reminder_frequency_days: int = 7
    assigned_to_id: Optional[int] = None

class FollowUpTaskCreate(FollowUpTaskBase):
    pass

class FollowUpTaskUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    deadline: Optional[datetime] = None
    completion_notes: Optional[str] = None
    assigned_to_id: Optional[int] = None

class FollowUpTaskOut(FollowUpTaskBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status: str
    escalation_level: int
    created_by_id: Optional[int] = None
    completed_at: Optional[datetime] = None
    completion_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
