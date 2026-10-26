from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from backend.app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(64), nullable=False)  # SUPER_ADMIN, BUREAU_HEAD, CASE_OFFICER, REGIONAL_OFFICER, VIEWER
    bureau = Column(String(64), nullable=False)  # REGULATION_BUREAU, PGRC, APPROVAL_BUREAU, LEGAL_CELL, VIGILANCE_CELL, POLICY_BUREAU, CENTRAL_ADMIN
    designation = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
