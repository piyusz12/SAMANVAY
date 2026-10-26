from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from backend.app.database import Base
from backend.app.core.datetime_util import utc_now

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(64), nullable=False)  # SUPER_ADMIN, BUREAU_ADMIN, BUREAU_OFFICER, CASE_OFFICER, AUDITOR
    bureau = Column(String(64), nullable=False)  # Primary bureau e.g. REGULATION_BUREAU, PGRC
    designation = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    bureau_memberships = relationship("BureauMembership", back_populates="user", cascade="all, delete-orphan")
