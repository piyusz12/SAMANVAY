from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Institution(Base):
    __tablename__ = "institutions"

    id = Column(Integer, primary_key=True, index=True)
    aicte_id = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(255), index=True, nullable=False)
    state = Column(String(100), index=True, nullable=False)
    city = Column(String(100), nullable=False)
    region = Column(String(100), index=True, nullable=False)  # Northern, Southern, Western, etc.
    institution_type = Column(String(100), nullable=False)    # Govt, Private, etc.
    approval_status = Column(String(64), default="APPROVED", nullable=False)
    address = Column(Text, nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    complaints = relationship("Complaint", back_populates="institution", cascade="all, delete-orphan")
