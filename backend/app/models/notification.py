from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base
from backend.app.core.datetime_util import utc_now

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
    delivery_channel = Column(String(32), default="IN_APP", nullable=False)  # IN_APP, EMAIL, SMS, WEBHOOK
    delivery_status = Column(String(32), default="DELIVERED", nullable=False)  # PENDING, DELIVERED, FAILED
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

    delivery_attempts = relationship("NotificationDeliveryAttempt", back_populates="notification", cascade="all, delete-orphan")


class NotificationDeliveryAttempt(Base):
    __tablename__ = "notification_delivery_attempts"

    id = Column(Integer, primary_key=True, index=True)
    notification_id = Column(Integer, ForeignKey("notifications.id", ondelete="CASCADE"), nullable=False, index=True)
    channel = Column(String(32), nullable=False)  # IN_APP, EMAIL, SMS
    attempt_number = Column(Integer, default=1, nullable=False)
    status = Column(String(32), nullable=False)  # SUCCESS, FAILED, RETRYING
    error_message = Column(Text, nullable=True)
    attempted_at = Column(DateTime, default=utc_now, nullable=False)

    notification = relationship("Notification", back_populates="delivery_attempts")
