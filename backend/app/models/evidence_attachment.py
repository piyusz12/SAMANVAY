from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base
from backend.app.core.datetime_util import utc_now

class EvidenceAttachment(Base):
    __tablename__ = "evidence_attachments"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    original_file_name = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    mime_type = Column(String(128), nullable=False)
    sha256_checksum = Column(String(64), nullable=True, index=True)
    uploaded_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    retention_status = Column(String(32), default="ACTIVE", nullable=False, index=True)  # ACTIVE, ARCHIVED, QUARANTINED, PURGED
    is_confidential = Column(Boolean, default=False, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    complaint = relationship("Complaint", back_populates="attachments")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])
