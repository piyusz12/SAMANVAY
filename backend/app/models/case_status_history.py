from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base
from backend.app.core.datetime_util import utc_now

class CaseStatusHistory(Base):
    __tablename__ = "case_status_history"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status = Column(String(64), nullable=True)
    to_status = Column(String(64), nullable=False, index=True)
    action_taken = Column(String(64), nullable=False)  # LODGED, STATUS_UPDATE, NOTICE_ISSUED, INQUIRY_OPENED, HEARING_HELD, DISPOSED
    changed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

    complaint = relationship("Complaint", back_populates="status_history")
    changed_by = relationship("User", foreign_keys=[changed_by_id])
