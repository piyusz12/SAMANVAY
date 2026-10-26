from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base
from backend.app.core.datetime_util import utc_now

class CaseAssignmentHistory(Base):
    __tablename__ = "case_assignment_history"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_officer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    previous_officer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    bureau = Column(String(64), nullable=False)
    assignment_notes = Column(Text, nullable=True)
    is_current = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

    complaint = relationship("Complaint", back_populates="assignment_history")
    assigned_officer = relationship("User", foreign_keys=[assigned_officer_id])
    previous_officer = relationship("User", foreign_keys=[previous_officer_id])
    assigned_by = relationship("User", foreign_keys=[assigned_by_id])
