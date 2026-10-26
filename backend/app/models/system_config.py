from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base
from backend.app.core.datetime_util import utc_now

class SystemConfig(Base):
    __tablename__ = "system_configs"

    id = Column(Integer, primary_key=True, index=True)
    config_key = Column(String(100), unique=True, index=True, nullable=False)
    config_value = Column(Text, nullable=False)
    value_type = Column(String(32), default="STRING", nullable=False)  # STRING, INTEGER, FLOAT, BOOLEAN, JSON
    category = Column(String(64), default="GENERAL", nullable=False, index=True)  # SLA, SIMILARITY, ESCALATION, SECURITY, GENERAL
    description = Column(Text, nullable=True)
    is_editable = Column(Boolean, default=True, nullable=False)
    updated_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    updated_by = relationship("User", foreign_keys=[updated_by_id])
