from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base
from backend.app.core.datetime_util import utc_now

class FollowUpTask(Base):
    __tablename__ = "follow_up_tasks"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    deadline = Column(DateTime, nullable=False, index=True)
    status = Column(String(32), default="PENDING", nullable=False, index=True)  # PENDING, IN_PROGRESS, COMPLETED, OVERDUE, CANCELLED
    priority = Column(String(32), default="MEDIUM", nullable=False)  # LOW, MEDIUM, HIGH, URGENT
    reminder_frequency_days = Column(Integer, default=7, nullable=False)
    escalation_level = Column(Integer, default=0, nullable=False)  # 0: None, 1: Bureau Head, 2: Super Admin
    completed_at = Column(DateTime, nullable=True)
    completion_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    complaint = relationship("Complaint", back_populates="follow_up_tasks")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
