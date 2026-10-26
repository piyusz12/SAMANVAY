from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.database import Base
from backend.app.core.datetime_util import utc_now

class BureauMembership(Base):
    __tablename__ = "bureau_memberships"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    bureau_id = Column(Integer, ForeignKey("bureaus.id", ondelete="CASCADE"), nullable=False, index=True)
    role_in_bureau = Column(String(64), nullable=False)  # HEAD, OFFICER, CASE_HANDLER, AUDITOR
    is_primary = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "bureau_id", name="uq_user_bureau_membership"),
    )

    user = relationship("User", back_populates="bureau_memberships")
    bureau = relationship("Bureau", back_populates="memberships")
