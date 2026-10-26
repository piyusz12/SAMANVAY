from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from backend.app.database import Base
from backend.app.core.datetime_util import utc_now

class ComplaintCategory(Base):
    __tablename__ = "complaint_categories"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(64), unique=True, index=True, nullable=False)  # e.g. FEE_EXTORTION, FACULTY_SALARY_WITHHELD
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    default_bureau = Column(String(64), nullable=True)  # Default handling bureau e.g. REGULATION_BUREAU, PGRC
    default_priority = Column(String(32), default="MEDIUM", nullable=False)
    default_sla_days = Column(Integer, default=30, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
