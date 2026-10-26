from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class BureauBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    default_sla_days: int = 30
    is_active: bool = True

class BureauCreate(BureauBase):
    pass

class BureauUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    default_sla_days: Optional[int] = None
    is_active: Optional[bool] = None

class BureauOut(BureauBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime

class BureauMembershipBase(BaseModel):
    user_id: int
    bureau_id: int
    role_in_bureau: str
    is_primary: bool = True

class BureauMembershipCreate(BureauMembershipBase):
    pass

class BureauMembershipOut(BureauMembershipBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
