from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.orm import relationship
from backend.app.database import Base
from backend.app.core.datetime_util import utc_now

class Bureau(Base):
    __tablename__ = "bureaus"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(64), unique=True, index=True, nullable=False)  # e.g. REGULATION_BUREAU, PGRC
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    default_sla_days = Column(Integer, default=30, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    memberships = relationship("BureauMembership", back_populates="bureau", cascade="all, delete-orphan")
