from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from backend.app.models.institution import Institution, normalize_name
from backend.app.repositories.base import BaseRepository

class InstitutionRepository(BaseRepository[Institution]):
    def __init__(self, db: Session):
        super().__init__(Institution, db)

    def get_by_aicte_id(self, aicte_id: str) -> Optional[Institution]:
        return self.db.query(Institution).filter(
            Institution.aicte_id == aicte_id.strip(),
            Institution.is_deleted == False
        ).first()

    def get_by_aishe_code(self, aishe_code: str) -> Optional[Institution]:
        if not aishe_code:
            return None
        return self.db.query(Institution).filter(
            Institution.aishe_code == aishe_code.strip(),
            Institution.is_deleted == False
        ).first()

    def check_duplicate_or_match(
        self,
        aicte_id: Optional[str] = None,
        aishe_code: Optional[str] = None,
        name: Optional[str] = None,
        city: Optional[str] = None,
        state: Optional[str] = None
    ) -> Tuple[bool, Optional[Institution], Optional[str], float, str]:
        """
        Normalized institution matching rule:
        1. Check exact AICTE ID match -> Confidence 1.0
        2. Check exact AISHE Code match -> Confidence 0.98
        3. Check normalized name + city + state match -> Confidence 0.90
        Returns (is_duplicate, matched_instance, strategy, confidence, message)
        """
        # Rule 1: AICTE ID Match
        if aicte_id and aicte_id.strip():
            matched = self.get_by_aicte_id(aicte_id.strip())
            if matched:
                return (
                    True,
                    matched,
                    "AICTE_ID_EXACT",
                    1.0,
                    f"Institution already registered with AICTE Permanent ID '{aicte_id.strip()}'."
                )

        # Rule 2: AISHE Code Match
        if aishe_code and aishe_code.strip():
            matched = self.get_by_aishe_code(aishe_code.strip())
            if matched:
                return (
                    True,
                    matched,
                    "AISHE_CODE_EXACT",
                    0.98,
                    f"Institution already registered with AISHE Code '{aishe_code.strip()}'."
                )

        # Rule 3: Normalized Name + City + State Match
        if name and city and state:
            norm_name = normalize_name(name)
            matched = self.db.query(Institution).filter(
                Institution.normalized_name == norm_name,
                Institution.city.ilike(city.strip()),
                Institution.state.ilike(state.strip()),
                Institution.is_deleted == False
            ).first()
            if matched:
                return (
                    True,
                    matched,
                    "NORMALIZED_NAME_CITY_STATE",
                    0.90,
                    f"Duplicate detected: '{matched.name}' already exists in {city.strip()}, {state.strip()}."
                )

        return (False, None, None, 0.0, "No duplicate institution found.")

    def soft_delete(self, institution: Institution) -> None:
        institution.is_deleted = True
        self.db.flush()
