from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from backend.app.database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    target_bureau = Column(String(64), nullable=True, index=True)  # If broadcast to entire bureau
    
    complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True)
    
    alert_type = Column(String(64), nullable=False)  # OVERLAP_ALERT, SLA_BREACH, TRANSFER_PENDING, STATUS_UPDATE, HIGH_PRIORITY
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
