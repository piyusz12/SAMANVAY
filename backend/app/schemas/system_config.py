from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class SystemConfigBase(BaseModel):
    config_key: str
    config_value: str
    value_type: str = "STRING"
    category: str = "GENERAL"
    description: Optional[str] = None
    is_editable: bool = True

class SystemConfigCreate(SystemConfigBase):
    pass

class SystemConfigUpdate(BaseModel):
    config_value: str
    description: Optional[str] = None

class SystemConfigOut(SystemConfigBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    updated_by_id: Optional[int] = None
    updated_at: datetime
