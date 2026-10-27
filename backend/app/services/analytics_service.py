import statistics
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Set
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_

from backend.app.models.complaint import Complaint
from backend.app.models.institution import Institution
from backend.app.models.case_movement import CaseMovement
from backend.app.models.case_linkage import CaseLinkage
from backend.app.models.user import User
from backend.app.core.datetime_util import utc_now

ROLE_ALIASES = {
    "BUREAU_HEAD": "BUREAU_ADMIN",
    "VIEWER": "AUDITOR"
}

def normalize_role(role: Optional[str]) -> str:
    if not role:
        return "SUPER_ADMIN"
    return ROLE_ALIASES.get(role, role)

AICTE_BUREAUS = [
    "REGULATION_BUREAU",
    "PGRC",
    "APPROVAL_BUREAU",
    "LEGAL_CELL",
    "VIGILANCE_CELL",
    "POLICY_BUREAU"
]

AICTE_REGIONS = [
    "Northern",
    "North-West",
    "Eastern",
    "Western",
    "Southern",
    "South-West",
    "Central"
]

OPEN_PENDING_STATUSES: Set[str] = {
    "LODGED",
    "SCRUTINY_PENDING",
    "AWAITING_DOCUMENTS"
}

UNDER_PROCESS_STATUSES: Set[str] = {
    "UNDER_INQUIRY",
    "SHOW_CAUSE_ISSUED",
    "HEARING_SCHEDULED",
    "COMMITTEE_REVIEW"
}

DISPOSED_STATUSES: Set[str] = {
    "RESOLVED",
    "DISPOSED",
    "REJECTED"
}

TRANSFERRED_STATUSES: Set[str] = {
    "TRANSFERRED"
}

ACTIVE_STATUSES: Set[str] = OPEN_PENDING_STATUSES | UNDER_PROCESS_STATUSES

def parse_iso_datetime(dt_str: Optional[str]) -> Optional[datetime]:
    if not dt_str:
        return None
    try:
        clean = dt_str.replace("Z", "+00:00")
        if len(clean) == 10:
            return datetime.fromisoformat(clean + "T00:00:00")
        return datetime.fromisoformat(clean)
    except Exception:
        return None

def get_dashboard_overview(
    db: Session,
    current_user: Optional[User] = None,
    bureau: Optional[str] = None,
    region: Optional[str] = None,
    status_filter: Optional[str] = None,
    category: Optional[str] = None,
    assigned_officer_id: Optional[int] = None,
    institution_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Computes comprehensive, role-aware dashboard metrics for SAMANVAY.
    Enforces bureau-scoped data isolation, precise entity separation,
    non-overlapping status partitions, and multi-dimensional filtering.
    """
    user_role = normalize_role(current_user.role) if current_user else "SUPER_ADMIN"
    user_bureau = current_user.bureau if current_user else None

    # 1. Enforce Bureau-Scoped Authorization
    effective_bureau: Optional[str] = None
    if user_role not in ("SUPER_ADMIN", "AUDITOR"):
        # Bureau officers are strictly scoped to their assigned bureau
        if bureau and bureau not in ("ALL", user_bureau):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Officers assigned to '{user_bureau}' cannot access metrics for bureau '{bureau}'."
            )
        effective_bureau = user_bureau
    else:
        if bureau and bureau != "ALL":
            effective_bureau = bureau

    # 2. Build Base Complaint Query with Authorized Filters
    query = db.query(Complaint).filter(Complaint.is_deleted == False)

    if effective_bureau:
        query = query.filter(Complaint.bureau == effective_bureau)

    if status_filter and status_filter != "ALL":
        query = query.filter(Complaint.status == status_filter)

    if category and category != "ALL":
        query = query.filter(Complaint.category == category)

    if assigned_officer_id:
        query = query.filter(Complaint.assigned_officer_id == assigned_officer_id)

    if institution_id:
        query = query.filter(Complaint.institution_id == institution_id)

    if region and region != "ALL":
        query = query.join(Institution, Complaint.institution_id == Institution.id).filter(
            Institution.region == region,
            Institution.is_deleted == False
        )

    dt_from = parse_iso_datetime(date_from)
    if dt_from:
        query = query.filter(Complaint.created_at >= dt_from)

    dt_to = parse_iso_datetime(date_to)
    if dt_to:
        if len(date_to) == 10:
            dt_to = dt_to + timedelta(days=1, microseconds=-1)
        query = query.filter(Complaint.created_at <= dt_to)

    filtered_complaints: List[Complaint] = query.all()
    now = utc_now()

    # 3. Non-Overlapping Primary Volume Partitions
    total_complaints_received = len(filtered_complaints)
    open_pending_complaints = sum(1 for c in filtered_complaints if c.status in OPEN_PENDING_STATUSES)
    complaints_under_process = sum(1 for c in filtered_complaints if c.status in UNDER_PROCESS_STATUSES)
    disposed_complaints = sum(1 for c in filtered_complaints if c.status in DISPOSED_STATUSES)
    transferred_complaints = sum(1 for c in filtered_complaints if c.status in TRANSFERRED_STATUSES)
    active_complaints_count = open_pending_complaints + complaints_under_process

    # Active complaints list for SLA & ageing computation
    active_complaints_list = [c for c in filtered_complaints if c.status in ACTIVE_STATUSES]
    overdue_complaints = sum(
        1 for c in active_complaints_list
        if (now - c.created_at).days > c.sla_deadline_days
    )

    # 4. Ageing Distribution (0-15d, 16-30d, 31-60d, 61-90d, 90+d)
    age_buckets = {
        "0-15 Days": 0,
        "16-30 Days": 0,
        "31-60 Days": 0,
        "61-90 Days": 0,
        "90+ Days": 0
    }
    for c in active_complaints_list:
        age_days = max(0, (now - c.created_at).days)
        if age_days <= 15:
            age_buckets["0-15 Days"] += 1
        elif age_days <= 30:
            age_buckets["16-30 Days"] += 1
        elif age_days <= 60:
            age_buckets["31-60 Days"] += 1
        elif age_days <= 90:
            age_buckets["61-90 Days"] += 1
        else:
            age_buckets["90+ Days"] += 1

    total_active_for_ageing = len(active_complaints_list)
    ageing_distribution = [
        {
            "bucket": b_name,
            "count": b_count,
            "percentage": round((b_count / total_active_for_ageing) * 100, 1) if total_active_for_ageing > 0 else 0.0
        }
        for b_name, b_count in age_buckets.items()
    ]

    # 5. Entity Distinction (Cases vs Institutions vs Related-Case Groups)
    inst_active_map: Dict[int, Set[str]] = {}
    for c in active_complaints_list:
        inst_active_map.setdefault(c.institution_id, set()).add(c.bureau)

    conflicting_institutions_count = sum(1 for bureaus in inst_active_map.values() if len(bureaus) > 1)

    # Distinct institution counts matching current query scope
    if filtered_complaints:
        matching_inst_ids = set(c.institution_id for c in filtered_complaints)
        total_institutions_count = len(matching_inst_ids)
    else:
        total_institutions_count = 0

    if not effective_bureau and not region and not status_filter and not category and not institution_id and not date_from:
        total_institutions_count = db.query(Institution).filter(Institution.is_deleted == False).count()

    # Linkage queries scoped to user permissions
    linkage_query = db.query(CaseLinkage).filter(CaseLinkage.is_active == True)
    if user_role not in ("SUPER_ADMIN", "AUDITOR"):
        linkage_query = linkage_query.join(
            Complaint,
            or_(
                CaseLinkage.source_complaint_id == Complaint.id,
                CaseLinkage.target_complaint_id == Complaint.id
            )
        ).filter(Complaint.bureau == user_bureau)

    scoped_linkages = linkage_query.all()
    potential_overlaps_awaiting_review = sum(
        1 for l in scoped_linkages if l.status in ("PROPOSED_BY_AI", "PENDING_REVIEW")
    )
    confirmed_related_groups_count = sum(
        1 for l in scoped_linkages if l.status == "CONFIRMED_RELATED"
    )

    # 6. Longitudinal Monthly & Quarterly Trends
    monthly_received: Dict[str, int] = {}
    monthly_disposed: Dict[str, int] = {}
    quarterly_received: Dict[str, int] = {}
    quarterly_disposed: Dict[str, int] = {}

    for c in filtered_complaints:
        m_rec_key = c.created_at.strftime("%Y-%m")
        q_rec_key = f"{c.created_at.year}-Q{(c.created_at.month - 1) // 3 + 1}"
        monthly_received[m_rec_key] = monthly_received.get(m_rec_key, 0) + 1
        quarterly_received[q_rec_key] = quarterly_received.get(q_rec_key, 0) + 1

        if c.status in DISPOSED_STATUSES:
            disp_dt = c.disposed_at or c.updated_at or c.created_at
            m_disp_key = disp_dt.strftime("%Y-%m")
            q_disp_key = f"{disp_dt.year}-Q{(disp_dt.month - 1) // 3 + 1}"
            monthly_disposed[m_disp_key] = monthly_disposed.get(m_disp_key, 0) + 1
            quarterly_disposed[q_disp_key] = quarterly_disposed.get(q_disp_key, 0) + 1

    all_months = sorted(set(monthly_received.keys()) | set(monthly_disposed.keys()))
    monthly_trends = [
        {
            "period": m,
            "received": monthly_received.get(m, 0),
            "disposed": monthly_disposed.get(m, 0)
        }
        for m in all_months
    ]

    all_quarters = sorted(set(quarterly_received.keys()) | set(quarterly_disposed.keys()))
    quarterly_trends = [
        {
            "quarter": q,
            "received": quarterly_received.get(q, 0),
            "disposed": quarterly_disposed.get(q, 0)
        }
        for q in all_quarters
    ]

    # 7. Resolution & Disposal Metrics
    disposed_cases = [c for c in filtered_complaints if c.status in DISPOSED_STATUSES]
    resolved_count = sum(1 for c in disposed_cases if c.status == "RESOLVED")
    disposed_count = sum(1 for c in disposed_cases if c.status == "DISPOSED")
    rejected_count = sum(1 for c in disposed_cases if c.status == "REJECTED")

    resolution_durations: List[int] = []
    adhered_sla_count = 0
    for c in disposed_cases:
        disp_time = c.disposed_at or c.updated_at or c.created_at
        dur = max(0, (disp_time - c.created_at).days)
        resolution_durations.append(dur)
        if dur <= c.sla_deadline_days:
            adhered_sla_count += 1

    if resolution_durations:
        avg_res_days = round(sum(resolution_durations) / len(resolution_durations), 1)
        med_res_days = float(statistics.median(resolution_durations))
        sla_comp_percent = round((adhered_sla_count / len(disposed_cases)) * 100, 1)
    else:
        avg_res_days = 0.0
        med_res_days = 0.0
        sla_comp_percent = 100.0

    resolution_metrics = {
        "average_resolution_days": avg_res_days,
        "median_resolution_days": med_res_days,
        "sla_compliance_rate_percent": sla_comp_percent,
        "total_disposed": len(disposed_cases),
        "resolved_count": resolved_count,
        "disposed_count": disposed_count,
        "rejected_count": rejected_count
    }

    # 8. Bureau-Wise Workload Matrix
    bureau_metrics: List[Dict[str, Any]] = []
    bureaus_to_include = (
        [effective_bureau]
        if (effective_bureau and user_role not in ("SUPER_ADMIN", "AUDITOR"))
        else AICTE_BUREAUS
    )

    for b_code in bureaus_to_include:
        b_cases = [c for c in filtered_complaints if c.bureau == b_code]
        tot_b = len(b_cases)
        op_b = sum(1 for c in b_cases if c.status in OPEN_PENDING_STATUSES)
        up_b = sum(1 for c in b_cases if c.status in UNDER_PROCESS_STATUSES)
        act_b = op_b + up_b
        res_b = sum(1 for c in b_cases if c.status in DISPOSED_STATUSES)
        tr_b = sum(1 for c in b_cases if c.status in TRANSFERRED_STATUSES)
        ovd_b = sum(
            1 for c in b_cases
            if c.status in ACTIVE_STATUSES and (now - c.created_at).days > c.sla_deadline_days
        )

        b_disp = [c for c in b_cases if c.status in DISPOSED_STATUSES]
        b_durations = [max(0, ((c.disposed_at or c.updated_at or c.created_at) - c.created_at).days) for c in b_disp]
        b_avg = round(sum(b_durations) / len(b_durations), 1) if b_durations else 0.0
        b_ok = sum(1 for c, d in zip(b_disp, b_durations) if d <= c.sla_deadline_days)
        b_sla = round((b_ok / len(b_disp)) * 100, 1) if b_disp else 100.0

        bureau_metrics.append({
            "bureau": b_code,
            "bureau_name": b_code.replace("_", " ").title(),
            "total_cases": tot_b,
            "open_pending": op_b,
            "under_process": up_b,
            "active_cases": act_b,
            "resolved_cases": res_b,
            "overdue_cases": ovd_b,
            "transferred_cases": tr_b,
            "avg_resolution_days": b_avg,
            "sla_compliance_percent": b_sla
        })

    # 9. Regional Matrix
    region_metrics: List[Dict[str, Any]] = []
    institutions_cache = {inst.id: inst for inst in db.query(Institution).filter(Institution.is_deleted == False).all()}

    for reg in AICTE_REGIONS:
        reg_inst_ids = [i_id for i_id, inst in institutions_cache.items() if inst.region == reg]
        reg_complaints = [c for c in filtered_complaints if c.institution_id in reg_inst_ids]
        reg_active = sum(1 for c in reg_complaints if c.status in ACTIVE_STATUSES)

        reg_conflicts = 0
        for inst_id in reg_inst_ids:
            if inst_id in inst_active_map and len(inst_active_map[inst_id]) > 1:
                reg_conflicts += 1

        region_metrics.append({
            "region": reg,
            "total_cases": len(reg_complaints),
            "active_cases": reg_active,
            "conflicting_institutions": reg_conflicts
        })

    # 10. Category Distribution
    category_counts: Dict[str, int] = {}
    for c in filtered_complaints:
        category_counts[c.category] = category_counts.get(c.category, 0) + 1
    category_distribution = [{"category": cat, "count": cnt} for cat, cnt in sorted(category_counts.items(), key=lambda x: x[1], reverse=True)]

    # 11. Institution-Wise Complaint Summaries & Hotspot Radar
    inst_summaries: List[Dict[str, Any]] = []
    relevant_inst_ids = set(c.institution_id for c in filtered_complaints)

    for inst_id in relevant_inst_ids:
        inst = institutions_cache.get(inst_id)
        if not inst:
            continue
        inst_cases = [c for c in filtered_complaints if c.institution_id == inst_id]
        tot_i = len(inst_cases)
        act_i = sum(1 for c in inst_cases if c.status in ACTIVE_STATUSES)
        ovd_i = sum(1 for c in inst_cases if c.status in ACTIVE_STATUSES and (now - c.created_at).days > c.sla_deadline_days)
        disp_i = sum(1 for c in inst_cases if c.status in DISPOSED_STATUSES)
        burs_i = sorted(list(set(c.bureau for c in inst_cases)))
        is_conf = len(set(c.bureau for c in inst_cases if c.status in ACTIVE_STATUSES)) > 1

        conf_links = sum(
            1 for l in scoped_linkages
            if l.status == "CONFIRMED_RELATED" and (
                l.source_complaint.institution_id == inst_id or l.target_complaint.institution_id == inst_id
            )
        )

        inst_summaries.append({
            "institution_id": inst.id,
            "aicte_id": inst.aicte_id,
            "name": inst.name,
            "region": inst.region or "Central",
            "state": inst.state or "N/A",
            "total_cases": tot_i,
            "active_cases": act_i,
            "overdue_cases": ovd_i,
            "disposed_cases": disp_i,
            "bureaus_involved": burs_i,
            "is_conflicting": is_conf,
            "confirmed_links_count": conf_links
        })

    inst_summaries.sort(key=lambda s: (s["active_cases"], s["total_cases"]), reverse=True)

    # Hotspot institutions for backward compatibility
    hotspots = [
        {
            "institution_id": s["institution_id"],
            "aicte_id": s["aicte_id"],
            "name": s["name"],
            "state": s["state"],
            "active_cases": s["active_cases"],
            "bureaus_involved": s["bureaus_involved"],
            "is_conflicting": s["is_conflicting"]
        }
        for s in inst_summaries[:10]
    ]

    # Pending transfers
    pending_transfers_count = db.query(CaseMovement).filter(CaseMovement.status == "PENDING_APPROVAL").count()

    return {
        "user_scope_bureau": user_bureau if user_role not in ("SUPER_ADMIN", "AUDITOR") else None,
        "user_role": user_role,
        "total_complaints_received": total_complaints_received,
        "open_pending_complaints": open_pending_complaints,
        "complaints_under_process": complaints_under_process,
        "disposed_complaints": disposed_complaints,
        "transferred_complaints": transferred_complaints,
        "overdue_complaints": overdue_complaints,
        "total_institutions_count": total_institutions_count,
        "conflicting_institutions_count": conflicting_institutions_count,
        "potential_overlaps_awaiting_review": potential_overlaps_awaiting_review,
        "confirmed_related_groups_count": confirmed_related_groups_count,
        "ageing_distribution": ageing_distribution,
        "bureau_metrics": bureau_metrics,
        "region_metrics": region_metrics,
        "category_distribution": category_distribution,
        "monthly_trends": monthly_trends,
        "quarterly_trends": quarterly_trends,
        "resolution_metrics": resolution_metrics,
        "institution_summaries": inst_summaries,
        "hotspot_institutions": hotspots,
        # Backward compatibility aliases
        "total_institutions": total_institutions_count,
        "total_complaints": total_complaints_received,
        "active_complaints": active_complaints_count,
        "resolved_complaints": disposed_complaints,
        "pending_transfers_count": pending_transfers_count
    }
