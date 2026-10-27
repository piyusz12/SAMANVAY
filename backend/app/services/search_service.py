import re
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple, Set
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from backend.app.models.complaint import Complaint
from backend.app.models.institution import Institution
from backend.app.models.user import User

ROLE_ALIASES = {
    "BUREAU_HEAD": "BUREAU_ADMIN",
    "VIEWER": "AUDITOR"
}

def normalize_role(role: Optional[str]) -> str:
    if not role:
        return "SUPER_ADMIN"
    return ROLE_ALIASES.get(role, role)
from backend.app.services.complaint_service import calculate_sla_details
from backend.app.schemas.search import (
    SearchComplaintItemOut,
    SearchInstitutionItemOut,
    UnifiedSearchResponse,
    ComplaintSearchResponse,
    InstitutionSearchResponse
)

ALLOWED_COMPLAINT_SORT_FIELDS = {
    "created_at": Complaint.created_at,
    "priority": Complaint.priority,
    "sla_due_date": Complaint.sla_due_date,
    "status": Complaint.status,
    "complaint_no": Complaint.complaint_no,
    "relevance": Complaint.created_at
}

ALLOWED_INSTITUTION_SORT_FIELDS = {
    "name": Institution.name,
    "aicte_id": Institution.aicte_id,
    "created_at": Institution.created_at,
    "region": Institution.region
}

def parse_iso_datetime(dt_str: Optional[str]) -> Optional[datetime]:
    if not dt_str:
        return None
    try:
        clean = dt_str.replace("Z", "+00:00")
        if len(clean) == 10:
            return datetime.fromisoformat(clean + "T00:00:00")
        return datetime.fromisoformat(clean)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid date format: '{dt_str}'. Use standard ISO format (e.g. YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)."
        )

STOP_WORDS: Set[str] = {
    "or", "and", "the", "in", "of", "to", "a", "is", "for", "on", "by", "at",
    "as", "an", "be", "this", "that", "with", "from", "table", "drop", "select",
    "insert", "update", "delete", "where", "union", "into", "values", "null", "all"
}

def normalize_search_query(q: Optional[str]) -> Tuple[str, List[str]]:
    """
    Normalizes search query while strictly preserving exact identifier patterns
    such as AICTE Permanent IDs ('1-10293847') and case numbers ('AICTE/RB/2026/0002').
    Extracts substantive search tokens (length >= 3, alphanumeric with hyphens/slashes, excluding stopwords).
    """
    if not q:
        return "", []

    raw = q.strip()
    # Strip dangerous non-printable/control characters
    cleaned = re.sub(r"[\x00-\x1f\x7f]", "", raw)
    
    # Tokenize words, stripping boundary punctuation while preserving internal hyphens/slashes
    tokens: List[str] = []
    for tok in re.split(r"[\s,;]+", cleaned):
        clean_tok = re.sub(r"^['\"`()\[\]{}]+|['\"`()\[\]{}]+$", "", tok).strip()
        # Must be at least 3 chars, alphanumeric plus identifier symbols (- /), not purely punctuation
        if (
            len(clean_tok) >= 3
            and re.match(r"^[a-zA-Z0-9/-]+$", clean_tok)
            and clean_tok.lower() not in STOP_WORDS
            and not re.match(r"^[-/]+$", clean_tok)
        ):
            tokens.append(clean_tok)
    return cleaned, tokens

def search_complaints(
    db: Session,
    q: Optional[str] = None,
    institution_name: Optional[str] = None,
    institution_identifier: Optional[str] = None,
    complaint_no: Optional[str] = None,
    bureau: Optional[str] = None,
    region: Optional[str] = None,
    category: Optional[str] = None,
    status_filter: Optional[str] = None,
    assigned_officer_id: Optional[int] = None,
    is_overdue: Optional[bool] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
    page: int = 1,
    page_size: int = 20,
    current_user: Optional[User] = None
) -> ComplaintSearchResponse:
    """
    High-performance typed search for complaint cases with server-side pagination,
    parameterized safety, validated sorting, and bureau-scoped permission enforcement.
    """
    user_role = normalize_role(current_user.role) if current_user else "SUPER_ADMIN"
    user_bureau = current_user.bureau if current_user else None

    # 1. Enforce Bureau-Scoped Permissions
    effective_bureau: Optional[str] = None
    if user_role not in ("SUPER_ADMIN", "AUDITOR"):
        if bureau and bureau not in ("ALL", user_bureau):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Officers assigned to '{user_bureau}' cannot search complaints for bureau '{bureau}'."
            )
        effective_bureau = user_bureau
    else:
        if bureau and bureau != "ALL":
            effective_bureau = bureau

    # 2. Build Query with Parameterized Expressions (SQL Injection Prevention)
    query = db.query(Complaint).join(Institution, Complaint.institution_id == Institution.id).filter(
        Complaint.is_deleted == False
    )

    if effective_bureau:
        query = query.filter(Complaint.bureau == effective_bureau)

    if status_filter and status_filter != "ALL":
        query = query.filter(Complaint.status == status_filter)

    if category and category != "ALL":
        query = query.filter(Complaint.category == category)

    if assigned_officer_id:
        query = query.filter(Complaint.assigned_officer_id == assigned_officer_id)

    if region and region != "ALL":
        query = query.filter(Institution.region == region)

    if institution_name:
        query = query.filter(Institution.name.ilike(f"%{institution_name.strip()}%"))

    if institution_identifier:
        ident = institution_identifier.strip()
        query = query.filter(or_(Institution.aicte_id == ident, Institution.aishe_code == ident))

    if complaint_no:
        c_no = complaint_no.strip()
        query = query.filter(Complaint.complaint_no.ilike(f"%{c_no}%"))

    # Free text / Unified Query
    cleaned_q, tokens = normalize_search_query(q)
    if cleaned_q:
        search_pattern = f"%{cleaned_q}%"
        query_conditions = [
            Complaint.complaint_no.ilike(search_pattern),
            Complaint.subject.ilike(search_pattern),
            Complaint.description.ilike(search_pattern),
            Complaint.complainant_name.ilike(search_pattern),
            Institution.name.ilike(search_pattern),
            Institution.aicte_id.ilike(search_pattern)
        ]

        # Multi-token matching for long descriptions:
        # Require all substantive tokens to be present (conjunction AND) in description or subject
        if len(tokens) > 1:
            query_conditions.append(and_(*[Complaint.description.ilike(f"%{tok}%") for tok in tokens[:6]]))
            query_conditions.append(and_(*[Complaint.subject.ilike(f"%{tok}%") for tok in tokens[:6]]))

        query = query.filter(or_(*query_conditions))

    # Date Range Filters
    dt_from = parse_iso_datetime(date_from)
    if dt_from:
        query = query.filter(Complaint.created_at >= dt_from)

    dt_to = parse_iso_datetime(date_to)
    if dt_to:
        if len(date_to) == 10:
            dt_to = dt_to + timedelta(days=1, microseconds=-1)
        query = query.filter(Complaint.created_at <= dt_to)

    # 3. Validated Sorting
    sort_key = sort_by.lower() if sort_by else "created_at"
    if sort_key not in ALLOWED_COMPLAINT_SORT_FIELDS:
        sort_key = "created_at"
    sort_col = ALLOWED_COMPLAINT_SORT_FIELDS[sort_key]

    if (sort_dir or "").lower() == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    # 4. Overdue SLA filtering
    if is_overdue is not None:
        all_matches = query.all()
        filtered = []
        for c in all_matches:
            _, overdue_flag, _ = calculate_sla_details(c)
            if overdue_flag == is_overdue:
                filtered.append(c)
        total = len(filtered)
        start_idx = (page - 1) * page_size
        paged_items = filtered[start_idx : start_idx + page_size]
    else:
        # Standard Server-Side Database Pagination
        total = query.count()
        start_idx = (page - 1) * page_size
        paged_items = query.offset(start_idx).limit(page_size).all()

    # 5. Transform Items & Highlight Matches
    items_out = []
    for c in paged_items:
        days_open, ovd, sla_status = calculate_sla_details(c)
        desc_snippet = (c.description[:180] + "...") if len(c.description) > 180 else c.description
        
        # Match Highlights
        highlights = []
        if cleaned_q:
            q_lower = cleaned_q.lower()
            if q_lower in c.complaint_no.lower():
                highlights.append(f"Case Reference: {c.complaint_no}")
            if c.institution and q_lower in c.institution.aicte_id.lower():
                highlights.append(f"AICTE Permanent ID: {c.institution.aicte_id}")
            if c.institution and q_lower in c.institution.name.lower():
                highlights.append(f"Institution: {c.institution.name}")
            if q_lower in c.subject.lower():
                highlights.append(f"Subject Match: '{c.subject}'")
            elif any(tok.lower() in c.description.lower() for tok in tokens):
                highlights.append("Matched in Case Description text")

        items_out.append(
            SearchComplaintItemOut(
                id=c.id,
                complaint_no=c.complaint_no,
                institution_id=c.institution_id,
                institution_name=c.institution.name if c.institution else "Unknown",
                institution_aicte_id=c.institution.aicte_id if c.institution else None,
                region=c.institution.region if c.institution else None,
                bureau=c.bureau,
                category=c.category,
                status=c.status,
                priority=c.priority,
                subject=c.subject,
                description_snippet=desc_snippet,
                assigned_officer_id=c.assigned_officer_id,
                assigned_officer_name=c.assigned_officer_name,
                sla_deadline_days=c.sla_deadline_days,
                sla_due_date=c.sla_due_date,
                days_open=days_open,
                is_overdue=ovd,
                created_at=c.created_at,
                updated_at=c.updated_at,
                match_highlights=highlights
            )
        )

    total_pages = max(1, (total + page_size - 1) // page_size) if total > 0 else 1

    return ComplaintSearchResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=items_out,
        applied_filters={
            "q": cleaned_q,
            "bureau": effective_bureau,
            "region": region,
            "category": category,
            "status": status_filter,
            "assigned_officer_id": assigned_officer_id,
            "is_overdue": is_overdue,
            "date_from": date_from,
            "date_to": date_to,
            "sort_by": sort_key,
            "sort_dir": sort_dir
        }
    )

def search_institutions(
    db: Session,
    q: Optional[str] = None,
    region: Optional[str] = None,
    state: Optional[str] = None,
    institution_type: Optional[str] = None,
    sort_by: str = "name",
    sort_dir: str = "asc",
    page: int = 1,
    page_size: int = 20,
    current_user: Optional[User] = None
) -> InstitutionSearchResponse:
    """
    Search institutional registry with server-side pagination, verified anti-injection
    parameterization, and cross-bureau active case statistics.
    """
    query = db.query(Institution).filter(Institution.is_deleted == False)

    cleaned_q, _ = normalize_search_query(q)
    if cleaned_q:
        search_pattern = f"%{cleaned_q}%"
        query = query.filter(
            or_(
                Institution.name.ilike(search_pattern),
                Institution.normalized_name.ilike(search_pattern),
                Institution.aicte_id.ilike(search_pattern),
                Institution.aishe_code.ilike(search_pattern),
                Institution.city.ilike(search_pattern),
                Institution.state.ilike(search_pattern)
            )
        )

    if region and region != "ALL":
        query = query.filter(Institution.region == region)

    if state and state != "ALL":
        query = query.filter(Institution.state == state)

    if institution_type and institution_type != "ALL":
        query = query.filter(Institution.institution_type == institution_type)

    # Validated Sorting
    sort_key = sort_by.lower() if sort_by else "name"
    if sort_key not in ALLOWED_INSTITUTION_SORT_FIELDS:
        sort_key = "name"
    sort_col = ALLOWED_INSTITUTION_SORT_FIELDS[sort_key]

    if (sort_dir or "").lower() == "desc":
        query = query.order_by(sort_col.desc())
    else:
        query = query.order_by(sort_col.asc())

    total = query.count()
    start_idx = (page - 1) * page_size
    paged_institutions = query.offset(start_idx).limit(page_size).all()

    # Preload active complaint counts
    inst_ids = [inst.id for inst in paged_institutions]
    active_complaints = db.query(Complaint).filter(
        Complaint.is_deleted == False,
        Complaint.institution_id.in_(inst_ids) if inst_ids else False
    ).all()

    inst_active_map: Dict[int, List[Complaint]] = {}
    for c in active_complaints:
        inst_active_map.setdefault(c.institution_id, []).append(c)

    items_out = []
    for inst in paged_institutions:
        cases = inst_active_map.get(inst.id, [])
        active_cases = [c for c in cases if c.status not in ("DISPOSED", "RESOLVED")]
        bureaus = set(c.bureau for c in active_cases)
        is_conflicting = len(bureaus) > 1

        highlights = []
        if cleaned_q:
            if cleaned_q.lower() in inst.aicte_id.lower():
                highlights.append(f"AICTE Permanent ID: {inst.aicte_id}")
            if cleaned_q.lower() in inst.name.lower():
                highlights.append(f"Name Match: {inst.name}")

        items_out.append(
            SearchInstitutionItemOut(
                id=inst.id,
                aicte_id=inst.aicte_id,
                aishe_code=inst.aishe_code,
                name=inst.name,
                region=inst.region or "Central",
                state=inst.state or "N/A",
                city=inst.city or "N/A",
                institution_type=inst.institution_type or "Engineering & Technology",
                approval_status=inst.approval_status or "APPROVED",
                total_complaints_count=len(cases),
                active_complaints_count=len(active_cases),
                is_conflicting=is_conflicting,
                created_at=inst.created_at,
                match_highlights=highlights
            )
        )

    total_pages = max(1, (total + page_size - 1) // page_size) if total > 0 else 1

    return InstitutionSearchResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=items_out,
        applied_filters={
            "q": cleaned_q,
            "region": region,
            "state": state,
            "institution_type": institution_type,
            "sort_by": sort_key,
            "sort_dir": sort_dir
        }
    )

def search_unified(
    db: Session,
    q: Optional[str] = None,
    bureau: Optional[str] = None,
    region: Optional[str] = None,
    category: Optional[str] = None,
    status_filter: Optional[str] = None,
    page: int = 1,
    page_size: int = 10,
    current_user: Optional[User] = None
) -> UnifiedSearchResponse:
    """
    Unified multi-entity search returning matched complaints and institutions
    with match highlights and pagination.
    """
    cleaned_q, _ = normalize_search_query(q)

    # Search complaints
    complaints_res = search_complaints(
        db=db,
        q=cleaned_q,
        bureau=bureau,
        region=region,
        category=category,
        status_filter=status_filter,
        page=page,
        page_size=page_size,
        current_user=current_user
    )

    # Search institutions
    institutions_res = search_institutions(
        db=db,
        q=cleaned_q,
        region=region,
        page=page,
        page_size=page_size,
        current_user=current_user
    )

    return UnifiedSearchResponse(
        query=q or "",
        normalized_query=cleaned_q,
        total_matches=complaints_res.total + institutions_res.total,
        complaints_count=complaints_res.total,
        institutions_count=institutions_res.total,
        page=page,
        page_size=page_size,
        complaints=complaints_res.items,
        institutions=institutions_res.items
    )
