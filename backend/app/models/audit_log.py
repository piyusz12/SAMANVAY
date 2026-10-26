from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="SET NULL"), nullable=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True, index=True)
    
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    actor_name = Column(String(255), nullable=False)
    actor_role = Column(String(64), nullable=False)
    actor_bureau = Column(String(64), nullable=False)
    
    action_type = Column(String(64), nullable=False, index=True)  # CASE_LODGED, STATUS_UPDATE, ASSIGNMENT, TRANSFER, LINKAGE, NOTE
    description = Column(Text, nullable=False)
    previous_state = Column(Text, nullable=True)
    new_state = Column(Text, nullable=True)
    
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    complaint = relationship("Complaint", back_populates="audit_logs")
    actor = relationship("User", foreign_keys=[actor_id])
