from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, UniqueConstraint
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
    
    status = Column(String(32), default="PROPOSED_BY_AI", nullable=False, index=True)  # PROPOSED_BY_AI, CONFIRMED_BY_OFFICER, DISMISSED
    verified_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    verification_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("source_complaint_id", "target_complaint_id", "link_type", name="uq_case_linkage_pair"),
    )

    source_complaint = relationship("Complaint", foreign_keys=[source_complaint_id])
    target_complaint = relationship("Complaint", foreign_keys=[target_complaint_id])
    verified_by = relationship("User", foreign_keys=[verified_by_id])
