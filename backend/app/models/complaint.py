from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    complaint_no = Column(String(64), unique=True, index=True, nullable=False)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    bureau = Column(String(64), index=True, nullable=False)  # REGULATION_BUREAU, PGRC, APPROVAL_BUREAU, etc.
    
    complainant_name = Column(String(255), nullable=False)
    complainant_category = Column(String(64), nullable=False)  # STUDENT, FACULTY, PARENT, CITIZEN, ANONYMOUS
    complainant_email = Column(String(255), nullable=True)
    complainant_phone = Column(String(50), nullable=True)
    
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(64), index=True, nullable=False)  # FEE_EXTORTION, FACULTY_SALARY_WITHHELD, etc.
    
    status = Column(String(64), default="LODGED", index=True, nullable=False)  # LODGED, SCRUTINY_PENDING, UNDER_INQUIRY, SHOW_CAUSE_ISSUED, HEARING_SCHEDULED, RESOLVED, DISPOSED, TRANSFERRED
    priority = Column(String(32), default="MEDIUM", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    
    sla_deadline_days = Column(Integer, default=30, nullable=False)
    assigned_officer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_officer_name = Column(String(255), nullable=True)
    
    internal_notes = Column(Text, nullable=True)
    evidence_file_name = Column(String(255), nullable=True)
    resolution_summary = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    disposed_at = Column(DateTime, nullable=True)

    # Relationships
    institution = relationship("Institution", back_populates="complaints")
    assigned_officer = relationship("User", foreign_keys=[assigned_officer_id])
    movements = relationship("CaseMovement", back_populates="complaint", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="complaint", cascade="all, delete-orphan")
