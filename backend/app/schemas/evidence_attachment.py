from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class EvidenceAttachmentBase(BaseModel):
    complaint_id: int
    file_name: str
    original_file_name: str
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
    storage_key: Optional[str] = None
    uploaded_by_id: Optional[int] = None
    retention_status: str
    malware_scan_status: str = "CLEAN"
    malware_scan_result: Optional[str] = None
    legal_hold: bool = False
    download_count: int = 0
    last_accessed_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    deleted_by_id: Optional[int] = None
    deletion_reason: Optional[str] = None
    created_at: datetime

class EvidenceDeleteRequest(BaseModel):
    reason: str = Field(..., min_length=10, description="Mandatory official justification for document removal")

class EvidenceLegalHoldRequest(BaseModel):
    legal_hold: bool = Field(..., description="True to freeze document against deletion, False to release")
    reason: str = Field(..., min_length=5, description="Administrative or judicial justification for legal hold action")

class EvidenceUploadResponse(BaseModel):
    attachment_id: int
    storage_key: str
    filename: str
    original_filename: str
    sha256: str
    size_bytes: int
    mime_type: str
    malware_scan_status: str
    status: str
