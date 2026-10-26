from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class EvidenceAttachmentBase(BaseModel):
    complaint_id: int
    file_name: str
    original_file_name: str
    file_path: str
    file_size_bytes: int
    mime_type: str
    sha256_checksum: Optional[str] = None
    is_confidential: bool = False
    description: Optional[str] = None

class EvidenceAttachmentCreate(EvidenceAttachmentBase):
    uploaded_by_id: Optional[int] = None

class EvidenceAttachmentOut(EvidenceAttachmentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    uploaded_by_id: Optional[int] = None
    retention_status: str
    created_at: datetime
