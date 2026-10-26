from typing import Optional, List
from sqlalchemy.orm import Session
from backend.app.models.evidence_attachment import EvidenceAttachment
from backend.app.repositories.base import BaseRepository
from backend.app.core.datetime_util import utc_now

class EvidenceRepository(BaseRepository[EvidenceAttachment]):
    def __init__(self, db: Session):
        super().__init__(EvidenceAttachment, db)

    def get_by_complaint(self, complaint_id: int) -> List[EvidenceAttachment]:
        return self.db.query(EvidenceAttachment).filter(
            EvidenceAttachment.complaint_id == complaint_id,
            EvidenceAttachment.retention_status != "PURGED"
        ).order_by(EvidenceAttachment.created_at.desc()).all()

    def find_by_checksum(self, sha256_checksum: str) -> Optional[EvidenceAttachment]:
        if not sha256_checksum:
            return None
        return self.db.query(EvidenceAttachment).filter(
            EvidenceAttachment.sha256_checksum == sha256_checksum,
            EvidenceAttachment.retention_status != "PURGED"
        ).first()

    def update_retention_status(
        self,
        attachment_id: int,
        retention_status: str  # ACTIVE, ARCHIVED, QUARANTINED, PURGED
    ) -> Optional[EvidenceAttachment]:
        attachment = self.get_by_id(attachment_id)
        if not attachment:
            return None
        attachment.retention_status = retention_status
        self.db.flush()
        return attachment
