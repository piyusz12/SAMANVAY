from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base

class CaseMovement(Base):
    __tablename__ = "case_movements"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True)
    from_bureau = Column(String(64), nullable=False)
    to_bureau = Column(String(64), nullable=False)
    movement_type = Column(String(64), default="TRANSFER_REQUEST", nullable=False)  # TRANSFER_REQUEST, CO_HANDLING, ESCALATION
    reason = Column(Text, nullable=False)
    status = Column(String(32), default="PENDING_APPROVAL", nullable=False)  # PENDING_APPROVAL, ACCEPTED, REJECTED, COMPLETED
    
    requested_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    decided_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    decision_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    decided_at = Column(DateTime, nullable=True)

    complaint = relationship("Complaint", back_populates="movements")
    requested_by = relationship("User", foreign_keys=[requested_by_id])
    decided_by = relationship("User", foreign_keys=[decided_by_id])
