import uuid
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base
from backend.app.core.datetime_util import utc_now

class EvidenceAttachment(Base):
    __tablename__ = "evidence_attachments"

    id = Column(Integer, primary_key=True, index=True)
    storage_key = Column(String(64), unique=True, index=True, nullable=True, default=lambda: uuid.uuid4().hex)
    complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    original_file_name = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    mime_type = Column(String(128), nullable=False)
    sha256_checksum = Column(String(64), nullable=True, index=True)
    uploaded_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Retention & lifecycle states: ACTIVE, ARCHIVED, QUARANTINED, PURGED, DELETED
    retention_status = Column(String(32), default="ACTIVE", nullable=False, index=True)
    is_confidential = Column(Boolean, default=False, nullable=False)
    description = Column(Text, nullable=True)
    
    # Security & Malware scanning
    malware_scan_status = Column(String(32), default="CLEAN", nullable=False, index=True)  # CLEAN, INFECTED, QUARANTINED, PENDING
    malware_scan_result = Column(String(255), nullable=True)
    
    # Legal hold & Retention protection
    legal_hold = Column(Boolean, default=False, nullable=False, index=True)
    download_count = Column(Integer, default=0, nullable=False)
    last_accessed_at = Column(DateTime, nullable=True)
    
    # Soft deletion metadata
    deleted_at = Column(DateTime, nullable=True)
    deleted_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    deletion_reason = Column(Text, nullable=True)

    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    complaint = relationship("Complaint", back_populates="attachments")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])
    deleted_by = relationship("User", foreign_keys=[deleted_by_id])
