from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class TransferRequestSchema(BaseModel):
    to_bureau: str
    movement_type: str = "TRANSFER_REQUEST"  # TRANSFER_REQUEST, CO_HANDLING, ESCALATION
    reason: str

class TransferDecisionSchema(BaseModel):
    decision: str  # ACCEPTED or REJECTED
    notes: Optional[str] = None

class MovementOut(BaseModel):
    id: int
    complaint_id: int
    complaint_no: Optional[str] = None
    from_bureau: str
    to_bureau: str
    movement_type: str
    reason: str
    status: str
    requested_by_id: Optional[int] = None
    requested_by_name: Optional[str] = None
    decided_by_id: Optional[int] = None
    decided_by_name: Optional[str] = None
    decision_notes: Optional[str] = None
    created_at: datetime
    decided_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
