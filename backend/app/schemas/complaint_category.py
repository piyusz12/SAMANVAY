from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class ComplaintCategoryBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    default_bureau: Optional[str] = None
    default_priority: str = "MEDIUM"
    default_sla_days: int = 30
    is_active: bool = True

class ComplaintCategoryCreate(ComplaintCategoryBase):
    pass

class ComplaintCategoryOut(ComplaintCategoryBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
