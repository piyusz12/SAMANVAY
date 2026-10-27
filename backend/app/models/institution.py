from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, Index
from sqlalchemy.orm import relationship
from backend.app.database import Base
from backend.app.core.datetime_util import utc_now

def normalize_name(name: str) -> str:
    """Normalize institution name for deterministic matching and deduplication."""
    if not name:
        return ""
    import re
    cleaned = re.sub(r"[^\w\s]", "", name).strip().upper()
    return re.sub(r"\s+", " ", cleaned)

class Institution(Base):
    __tablename__ = "institutions"
    __table_args__ = (
        Index("ix_institutions_deleted_region", "is_deleted", "region"),
        Index("ix_institutions_deleted_name", "is_deleted", "name"),
    )

    id = Column(Integer, primary_key=True, index=True)
    aicte_id = Column(String(64), unique=True, index=True, nullable=False)  # e.g. 1-10972412
    aishe_code = Column(String(64), unique=True, index=True, nullable=True)  # e.g. C-12345
    name = Column(String(255), index=True, nullable=False)
    normalized_name = Column(String(255), index=True, nullable=False)  # Stripped uppercase for deduplication
    state = Column(String(100), index=True, nullable=False)
    city = Column(String(100), index=True, nullable=False)
    pin_code = Column(String(20), nullable=True)
    region = Column(String(100), index=True, nullable=False)  # Northern, Southern, Western, etc.
    institution_type = Column(String(100), nullable=False)    # Govt, Private-Self-Financed, Deemed, etc.
    approval_status = Column(String(64), default="APPROVED", nullable=False)
    address = Column(Text, nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)  # Retention / soft-delete policy
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    complaints = relationship("Complaint", back_populates="institution", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="institution")

    def __init__(self, **kwargs):
        if "normalized_name" not in kwargs and "name" in kwargs:
            kwargs["normalized_name"] = normalize_name(kwargs["name"])
        super().__init__(**kwargs)
