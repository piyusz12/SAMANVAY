from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, UniqueConstraint, Boolean
from sqlalchemy.orm import relationship
from backend.app.database import Base
from backend.app.core.datetime_util import utc_now

class CaseLinkage(Base):
    __tablename__ = "case_linkages"

    id = Column(Integer, primary_key=True, index=True)
    source_complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True)
    target_complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True)
    
    link_type = Column(String(64), default="CROSS_BUREAU_OVERLAP", nullable=False)  # DUPLICATE, RELATED_INQUIRY, CROSS_BUREAU_OVERLAP, REPEAT_OFFENSE
    similarity_score = Column(Float, nullable=False)  # e.g. 0.88 (88%)
    explanation_json = Column(Text, nullable=False)   # JSON string breaking down factors
    
    status = Column(String(32), default="PENDING_REVIEW", nullable=False, index=True)  # PENDING_REVIEW, CONFIRMED_RELATED, NOT_RELATED, ALREADY_LINKED
    confidence_tier = Column(String(16), default="MEDIUM", nullable=False)  # HIGH, MEDIUM, LOW
    reasons_json = Column(Text, nullable=True)  # JSON array of human-readable rationale strings
    rationale = Column(Text, nullable=True)     # Reviewer rationale for linking or dismissing
    source_complaint_hash = Column(String(64), nullable=True)  # Hash of text content for re-evaluation tracking
    target_complaint_hash = Column(String(64), nullable=True)
    
    verified_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    verification_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    # Coordination Workspace Fields (Phase 08)
    coordination_decision = Column(String(64), nullable=True)  # JOINT_INSPECTION, LEGAL_REFERRAL, BUREAU_TRANSFER, INDEPENDENT_PARALLEL_PROCEEDINGS, NO_ACTION_REQUIRED, EVIDENCE_SHARING
    coordination_notes = Column(Text, nullable=True)
    lead_bureau = Column(String(64), nullable=True)
    lead_officer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    coordination_deadline = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    unlinked_at = Column(DateTime, nullable=True)
    unlinked_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    unlink_reason = Column(Text, nullable=True)
    version = Column(Integer, default=1, nullable=False)  # Optimistic concurrency lock token
    
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("source_complaint_id", "target_complaint_id", "link_type", name="uq_case_linkage_pair"),
    )

    source_complaint = relationship("Complaint", foreign_keys=[source_complaint_id])
    target_complaint = relationship("Complaint", foreign_keys=[target_complaint_id])
    verified_by = relationship("User", foreign_keys=[verified_by_id])
    lead_officer = relationship("User", foreign_keys=[lead_officer_id])
    unlinked_by = relationship("User", foreign_keys=[unlinked_by_id])
    follow_up_tasks = relationship("FollowUpTask", back_populates="linkage", cascade="all, delete-orphan")
