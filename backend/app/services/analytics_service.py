from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from backend.app.models.complaint import Complaint
from backend.app.models.institution import Institution
from backend.app.models.case_movement import CaseMovement
from backend.app.services.overlap_service import check_institution_conflict, ACTIVE_STATUSES

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

def get_dashboard_overview(db: Session) -> Dict[str, Any]:
    total_institutions = db.query(Institution).count()
    total_complaints = db.query(Complaint).count()
    
    active_complaints = db.query(Complaint).filter(Complaint.status.in_(ACTIVE_STATUSES)).count()
    resolved_complaints = db.query(Complaint).filter(Complaint.status == "RESOLVED").count()
    disposed_complaints = db.query(Complaint).filter(Complaint.status == "DISPOSED").count()
    
    # Overdue count
    all_active = db.query(Complaint).filter(Complaint.status.in_(ACTIVE_STATUSES)).all()
    now = datetime.utcnow()
    overdue_complaints = sum(1 for c in all_active if (now - c.created_at).days > c.sla_deadline_days)
    
    # Pending transfers
    pending_transfers_count = db.query(CaseMovement).filter(CaseMovement.status == "PENDING_APPROVAL").count()

    # Conflicting institutions count
    inst_active_map: Dict[int, set] = {}
    for c in all_active:
        inst_active_map.setdefault(c.institution_id, set()).add(c.bureau)
    
    conflicting_institutions_count = sum(1 for bureaus in inst_active_map.values() if len(bureaus) > 1)

    # Bureau metrics
    bureau_metrics = []
    for bureau in AICTE_BUREAUS:
        cases = db.query(Complaint).filter(Complaint.bureau == bureau).all()
        total_b = len(cases)
        active_b = sum(1 for c in cases if c.status in ACTIVE_STATUSES)
        resolved_b = sum(1 for c in cases if c.status in ["RESOLVED", "DISPOSED"])
        overdue_b = sum(1 for c in cases if c.status in ACTIVE_STATUSES and (now - c.created_at).days > c.sla_deadline_days)
        
        # Average resolution days for resolved cases
        resolved_cases = [c for c in cases if c.disposed_at and c.status in ["RESOLVED", "DISPOSED"]]
        if resolved_cases:
            avg_days = sum((c.disposed_at - c.created_at).days for c in resolved_cases) / len(resolved_cases)
        else:
            avg_days = 0.0

        bureau_metrics.append({
            "bureau": bureau,
            "total_cases": total_b,
            "active_cases": active_b,
            "resolved_cases": resolved_b,
            "overdue_cases": overdue_b,
            "avg_resolution_days": round(avg_days, 1)
        })

    # Region metrics
    region_metrics = []
    for region in AICTE_REGIONS:
        inst_ids = [inst.id for inst in db.query(Institution).filter(Institution.region == region).all()]
        region_complaints = db.query(Complaint).filter(Complaint.institution_id.in_(inst_ids)).all() if inst_ids else []
        active_rc = sum(1 for c in region_complaints if c.status in ACTIVE_STATUSES)
        
        # Region conflicting count
        region_conflicts = 0
        for inst_id in inst_ids:
            if inst_id in inst_active_map and len(inst_active_map[inst_id]) > 1:
                region_conflicts += 1

        region_metrics.append({
            "region": region,
            "total_cases": len(region_complaints),
            "active_cases": active_rc,
            "conflicting_institutions": region_conflicts
        })

    # Category distribution
    categories_raw = db.query(Complaint.category, func.count(Complaint.id)).group_by(Complaint.category).all()
    category_distribution = [{"category": cat, "count": count} for cat, count in categories_raw]

    # Hotspot institutions
    hotspots = []
    institutions = db.query(Institution).all()
    for inst in institutions:
        inst_cases = [c for c in all_active if c.institution_id == inst.id]
        if inst_cases:
            bureaus_inv = list(set(c.bureau for c in inst_cases))
            hotspots.append({
                "institution_id": inst.id,
                "aicte_id": inst.aicte_id,
                "name": inst.name,
                "state": inst.state,
                "active_cases": len(inst_cases),
                "bureaus_involved": bureaus_inv,
                "is_conflicting": len(bureaus_inv) > 1
            })
    
    # Sort hotspots by active cases descending
    hotspots.sort(key=lambda h: (h["active_cases"], h["is_conflicting"]), reverse=True)

    return {
        "total_institutions": total_institutions,
        "total_complaints": total_complaints,
        "active_complaints": active_complaints,
        "resolved_complaints": resolved_complaints,
        "disposed_complaints": disposed_complaints,
        "overdue_complaints": overdue_complaints,
        "conflicting_institutions_count": conflicting_institutions_count,
        "pending_transfers_count": pending_transfers_count,
        "bureau_metrics": bureau_metrics,
        "region_metrics": region_metrics,
        "category_distribution": category_distribution,
        "hotspot_institutions": hotspots[:10]
    }
