from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from backend.app.models.case_linkage import CaseLinkage
from backend.app.repositories.base import BaseRepository
from backend.app.core.datetime_util import utc_now

class CaseLinkageRepository(BaseRepository[CaseLinkage]):
    """
    Manages related-case links and overlap reviews.
    Maintains independent histories for all linked cases rather than destructive merging.
    """
    def __init__(self, db: Session):
        super().__init__(CaseLinkage, db)

    def get_existing_link(
        self,
        source_id: int,
        target_id: int,
        link_type: str = "CROSS_BUREAU_OVERLAP"
    ) -> Optional[CaseLinkage]:
        return self.db.query(CaseLinkage).filter(
            or_(
                and_(CaseLinkage.source_complaint_id == source_id, CaseLinkage.target_complaint_id == target_id),
                and_(CaseLinkage.source_complaint_id == target_id, CaseLinkage.target_complaint_id == source_id),
            ),
            CaseLinkage.link_type == link_type
        ).first()

    def get_links_for_case(self, complaint_id: int) -> List[CaseLinkage]:
        return self.db.query(CaseLinkage).filter(
            or_(
                CaseLinkage.source_complaint_id == complaint_id,
                CaseLinkage.target_complaint_id == complaint_id
            )
        ).all()

    def link_cases(
        self,
        source_id: int,
        target_id: int,
        link_type: str,
        similarity_score: float,
        explanation_json: str,
        status: str = "PROPOSED_BY_AI"
    ) -> CaseLinkage:
        """Links cases without merging histories."""
        existing = self.get_existing_link(source_id, target_id, link_type)
        if existing:
            existing.similarity_score = similarity_score
            existing.explanation_json = explanation_json
            existing.updated_at = utc_now()
            self.db.flush()
            return existing

        linkage = CaseLinkage(
            source_complaint_id=source_id,
            target_complaint_id=target_id,
            link_type=link_type,
            similarity_score=similarity_score,
            explanation_json=explanation_json,
            status=status,
            created_at=utc_now(),
            updated_at=utc_now()
        )
        self.db.add(linkage)
        self.db.flush()
        return linkage

    def review_linkage(
        self,
        linkage_id: int,
        status: str,  # CONFIRMED_BY_OFFICER, DISMISSED
        reviewer_id: int,
        notes: Optional[str] = None
    ) -> Optional[CaseLinkage]:
        linkage = self.get_by_id(linkage_id)
        if not linkage:
            return None
        linkage.status = status
        linkage.verified_by_id = reviewer_id
        linkage.verification_notes = notes
        linkage.reviewed_at = utc_now()
        linkage.updated_at = utc_now()
        self.db.flush()
        return linkage
