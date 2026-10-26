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

    def check_duplicate_for_update(
        self,
        exclude_id: int,
        aicte_id: Optional[str] = None,
        aishe_code: Optional[str] = None,
        name: Optional[str] = None,
        city: Optional[str] = None,
        state: Optional[str] = None
    ) -> Tuple[bool, Optional[Institution], Optional[str], float, str]:
        """Validates duplicate rules when updating an existing institution record."""
        # Rule 1: AICTE ID Match on other records
        if aicte_id and aicte_id.strip():
            matched = self.db.query(Institution).filter(
                Institution.aicte_id == aicte_id.strip(),
                Institution.id != exclude_id,
                Institution.is_deleted == False
            ).first()
            if matched:
                return (
                    True,
                    matched,
                    "AICTE_ID_EXACT",
                    1.0,
                    f"Another institution is already registered with AICTE Permanent ID '{aicte_id.strip()}'."
                )

        # Rule 2: AISHE Code Match on other records
        if aishe_code and aishe_code.strip():
            matched = self.db.query(Institution).filter(
                Institution.aishe_code == aishe_code.strip(),
                Institution.id != exclude_id,
                Institution.is_deleted == False
            ).first()
            if matched:
                return (
                    True,
                    matched,
                    "AISHE_CODE_EXACT",
                    0.98,
                    f"Another institution is already registered with AISHE Code '{aishe_code.strip()}'."
                )

        # Rule 3: Normalized Name + City + State Match on other records
        if name and city and state:
            norm_name = normalize_name(name)
            matched = self.db.query(Institution).filter(
                Institution.normalized_name == norm_name,
                Institution.city.ilike(city.strip()),
                Institution.state.ilike(state.strip()),
                Institution.id != exclude_id,
                Institution.is_deleted == False
            ).first()
            if matched:
                return (
                    True,
                    matched,
                    "NORMALIZED_NAME_CITY_STATE",
                    0.90,
                    f"Duplicate detected: Another institution '{matched.name}' already exists in {city.strip()}, {state.strip()}."
                )

        return (False, None, None, 0.0, "No duplicate institution found.")

    def search_and_filter(
        self,
        search: Optional[str] = None,
        region: Optional[str] = None,
        state: Optional[str] = None,
        institution_type: Optional[str] = None,
        approval_status: Optional[str] = None,
        sort_by: str = "name",
        sort_order: str = "asc",
        page: Optional[int] = None,
        page_size: Optional[int] = None
    ) -> Tuple[List[Institution], int]:
        """Multi-facet filter, search (by ID, AISHE, and normalized name), sorting and pagination."""
        query = self.db.query(Institution).filter(Institution.is_deleted == False)

        if search and search.strip():
            term = search.strip()
            search_fmt = f"%{term}%"
            norm_term = normalize_name(term)
            query = query.filter(
                or_(
                    Institution.name.ilike(search_fmt),
                    Institution.normalized_name.ilike(f"%{norm_term}%"),
                    Institution.aicte_id.ilike(search_fmt),
                    Institution.aishe_code.ilike(search_fmt),
                    Institution.city.ilike(search_fmt),
                    Institution.state.ilike(search_fmt),
                    Institution.pin_code.ilike(search_fmt)
                )
            )

        if region and region != "ALL":
            query = query.filter(Institution.region == region)
        if state and state != "ALL":
            query = query.filter(Institution.state == state)
        if institution_type and institution_type != "ALL":
            query = query.filter(Institution.institution_type == institution_type)
        if approval_status and approval_status != "ALL":
            query = query.filter(Institution.approval_status == approval_status)

        total = query.count()

        # Sorting
        sort_col = getattr(Institution, sort_by, Institution.name)
        if sort_order.lower() == "desc":
            query = query.order_by(sort_col.desc())
        else:
            query = query.order_by(sort_col.asc())

        # Pagination if requested
        if page is not None and page_size is not None:
            offset = (page - 1) * page_size
            items = query.offset(offset).limit(page_size).all()
        else:
            items = query.all()

        return items, total

    def soft_delete(self, institution: Institution) -> None:
        institution.is_deleted = True
        self.db.flush()
