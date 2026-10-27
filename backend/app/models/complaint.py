from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.app.database import Base
from backend.app.core.datetime_util import utc_now

class Complaint(Base):
    __tablename__ = "complaints"
    __table_args__ = (
        Index("ix_complaints_deleted_bureau_status", "is_deleted", "bureau", "status"),
        Index("ix_complaints_deleted_inst", "is_deleted", "institution_id"),
        Index("ix_complaints_deleted_sla", "is_deleted", "sla_due_date"),
        Index("ix_complaints_deleted_created", "is_deleted", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    complaint_no = Column(String(64), unique=True, index=True, nullable=False)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False, index=True)
    bureau = Column(String(64), index=True, nullable=False)  # REGULATION_BUREAU, PGRC, APPROVAL_BUREAU, etc.
    
    complainant_name = Column(String(255), nullable=False)
    complainant_category = Column(String(64), nullable=False)  # STUDENT, FACULTY, PARENT, CITIZEN, ANONYMOUS
    complainant_email = Column(String(255), nullable=True)
    complainant_phone = Column(String(50), nullable=True)
    is_anonymous_confidential = Column(Boolean, default=False, nullable=False)  # Whistleblower confidentiality
    
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(64), index=True, nullable=False)  # FEE_EXTORTION, FACULTY_SALARY_WITHHELD, etc.
    
    status = Column(String(64), default="LODGED", index=True, nullable=False)  # LODGED, SCRUTINY_PENDING, UNDER_INQUIRY, SHOW_CAUSE_ISSUED, HEARING_SCHEDULED, RESOLVED, DISPOSED, TRANSFERRED
    priority = Column(String(32), default="MEDIUM", index=True, nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    
    sla_deadline_days = Column(Integer, default=30, nullable=False)
    sla_due_date = Column(DateTime, nullable=True, index=True)
    assigned_officer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_officer_name = Column(String(255), nullable=True)
    
    internal_notes = Column(Text, nullable=True)
    evidence_file_name = Column(String(255), nullable=True)
    resolution_summary = Column(Text, nullable=True)
    
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)  # Retention / soft-delete policy
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    disposed_at = Column(DateTime, nullable=True)

    # Relationships
    institution = relationship("Institution", back_populates="complaints")
    assigned_officer = relationship("User", foreign_keys=[assigned_officer_id])
    movements = relationship("CaseMovement", back_populates="complaint", cascade="all, delete-orphan")
    status_history = relationship("CaseStatusHistory", back_populates="complaint", cascade="all, delete-orphan")
    assignment_history = relationship("CaseAssignmentHistory", back_populates="complaint", cascade="all, delete-orphan")
    follow_up_tasks = relationship("FollowUpTask", back_populates="complaint", cascade="all, delete-orphan")
    attachments = relationship("EvidenceAttachment", back_populates="complaint", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="complaint", cascade="all, delete-orphan")
