from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.app.database import Base
from backend.app.core.datetime_util import utc_now

class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_user_read", "user_id", "is_read"),
        Index("ix_notifications_bureau_read", "target_bureau", "is_read"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    target_bureau = Column(String(64), nullable=True, index=True)  # If broadcast to entire bureau
    target_role = Column(String(64), nullable=True)  # Optional role targeting e.g. BUREAU_ADMIN, CASE_OFFICER
    
    complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True)
    follow_up_task_id = Column(Integer, ForeignKey("follow_up_tasks.id", ondelete="SET NULL"), nullable=True)
    linkage_id = Column(Integer, ForeignKey("case_linkages.id", ondelete="SET NULL"), nullable=True)
    
    alert_type = Column(String(64), nullable=False, index=True)  # UPCOMING_DEADLINE, SLA_BREACH, OVERDUE_CASE, UNRESOLVED_OVERLAP, OVERDUE_COORDINATION_TASK, ESCALATION_TRIGGERED, OVERLAP_ALERT, TRANSFER_PENDING
    severity = Column(String(32), default="INFO", nullable=False, index=True)  # INFO, WARNING, CRITICAL, URGENT
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    delivery_channel = Column(String(32), default="IN_APP", nullable=False)  # IN_APP, EMAIL, SMS, WEBHOOK
    delivery_status = Column(String(32), default="DELIVERED", nullable=False)  # PENDING, DELIVERED, FAILED
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    read_at = Column(DateTime, nullable=True)
    
    escalation_level = Column(Integer, default=0, nullable=False)  # 0: None, 1: Officer Warning, 2: Bureau Head Breach, 3: Escalated to Central Admin
    idempotency_key = Column(String(255), unique=True, index=True, nullable=True)  # Prevents duplicate alert records
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

    delivery_attempts = relationship("NotificationDeliveryAttempt", back_populates="notification", cascade="all, delete-orphan")


class NotificationDeliveryAttempt(Base):
    __tablename__ = "notification_delivery_attempts"
    __table_args__ = (
        Index("ix_notif_attempts_status_channel", "status", "channel"),
    )

    id = Column(Integer, primary_key=True, index=True)
    notification_id = Column(Integer, ForeignKey("notifications.id", ondelete="CASCADE"), nullable=False, index=True)
    channel = Column(String(32), nullable=False)  # IN_APP, EMAIL, SMS
    attempt_number = Column(Integer, default=1, nullable=False)
    status = Column(String(32), nullable=False)  # SUCCESS, FAILED, RETRYING
    recipient = Column(String(255), nullable=True)
    error_message = Column(Text, nullable=True)
    attempted_at = Column(DateTime, default=utc_now, nullable=False)
    next_retry_at = Column(DateTime, nullable=True)

    notification = relationship("Notification", back_populates="delivery_attempts")

