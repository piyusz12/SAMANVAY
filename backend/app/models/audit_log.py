from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base
from backend.app.core.datetime_util import utc_now

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="SET NULL"), nullable=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True, index=True)
    
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    actor_name = Column(String(255), nullable=False)
    actor_role = Column(String(64), nullable=False)
    actor_bureau = Column(String(64), nullable=False)
    
    action_type = Column(String(64), nullable=False, index=True)  # CASE_LODGED, STATUS_UPDATE, ASSIGNMENT, TRANSFER, LINKAGE, NOTE, ATTACHMENT_UPLOAD
    description = Column(Text, nullable=False)
    previous_state = Column(Text, nullable=True)
    new_state = Column(Text, nullable=True)
    ip_address = Column(String(64), nullable=True)
    request_id = Column(String(64), nullable=True, index=True)
    
    timestamp = Column(DateTime, default=utc_now, nullable=False, index=True)
    
    # Cryptographic Tamper-Detection & Hash Chaining (Phase 14)
    prev_hash = Column(String(64), nullable=True)
    entry_hash = Column(String(64), nullable=True, index=True)

    complaint = relationship("Complaint", back_populates="audit_logs")
    actor = relationship("User", foreign_keys=[actor_id])
    institution = relationship("Institution", back_populates="audit_logs")
