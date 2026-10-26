from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.models.complaint import Complaint
from backend.app.models.institution import Institution
from backend.app.models.notification import Notification

ACTIVE_STATUSES = [
    "LODGED",
    "SCRUTINY_PENDING",
    "UNDER_INQUIRY",
    "SHOW_CAUSE_ISSUED",
    "HEARING_SCHEDULED",
    "TRANSFERRED",
    "ESCALATED"
]

def check_institution_conflict(db: Session, institution_id: int) -> Dict[str, Any]:
    """
    Checks if an institution has active cases across multiple AICTE bureaus/cells.
    Returns structured conflict metadata.
    """
    institution = db.query(Institution).filter(Institution.id == institution_id).first()
    if not institution:
        return {
            "has_conflict": False,
            "bureaus_involved": [],
            "active_cases_count": 0,
            "message": "Institution not found"
        }

    active_complaints = db.query(Complaint).filter(
        Complaint.institution_id == institution_id,
        Complaint.status.in_(ACTIVE_STATUSES)
    ).all()

    bureaus = list(set(c.bureau for c in active_complaints))
    has_conflict = len(bureaus) > 1

    message = "No cross-bureau conflict detected."
    if has_conflict:
        formatted_bureaus = ", ".join(b.replace("_", " ").title() for b in bureaus)
        message = (
            f"CROSS-BUREAU OVERLAP DETECTED: {len(bureaus)} bureaus ({formatted_bureaus}) "
            f"are concurrently investigating cases against {institution.name}."
        )

    return {
        "has_conflict": has_conflict,
        "bureaus_involved": bureaus,
        "active_cases_count": len(active_complaints),
        "institution_name": institution.name,
        "institution_aicte_id": institution.aicte_id,
        "message": message,
        "active_complaint_ids": [c.id for c in active_complaints]
    }

def get_all_cross_bureau_conflicts(db: Session) -> List[Dict[str, Any]]:
    """
    Scans the entire database to find all institutions currently experiencing
    concurrent multi-bureau actions. This powers the AICTE Master Conflict Radar.
    """
    active_complaints = db.query(Complaint).filter(
        Complaint.status.in_(ACTIVE_STATUSES)
    ).all()

    # Group by institution_id
    inst_map: Dict[int, List[Complaint]] = {}
    for c in active_complaints:
        inst_map.setdefault(c.institution_id, []).append(c)

    conflicts = []
    for inst_id, complaints in inst_map.items():
        bureaus = list(set(c.bureau for c in complaints))
        if len(bureaus) > 1:
            inst = db.query(Institution).filter(Institution.id == inst_id).first()
            if inst:
                conflicts.append({
                    "institution_id": inst.id,
                    "institution_name": inst.name,
                    "aicte_id": inst.aicte_id,
                    "state": inst.state,
                    "region": inst.region,
                    "bureaus_involved": bureaus,
                    "active_cases_count": len(complaints),
                    "cases": [
                        {
                            "id": c.id,
                            "complaint_no": c.complaint_no,
                            "bureau": c.bureau,
                            "subject": c.subject,
                            "status": c.status,
                            "priority": c.priority,
                            "created_at": c.created_at.isoformat()
                        }
                        for c in complaints
                    ]
                })

    return conflicts

def trigger_conflict_notifications(db: Session, complaint: Complaint):
    """
    If the current complaint causes a cross-bureau overlap, generate automated alerts
    for the heads of all involved bureaus.
    """
    conflict = check_institution_conflict(db, complaint.institution_id)
    if conflict["has_conflict"]:
        for bureau in conflict["bureaus_involved"]:
            # Check if alert already sent recently for this institution
            existing = db.query(Notification).filter(
                Notification.institution_id == complaint.institution_id,
                Notification.target_bureau == bureau,
                Notification.alert_type == "OVERLAP_ALERT",
                Notification.is_read == False
            ).first()
            
            if not existing:
                notif = Notification(
                    target_bureau=bureau,
                    complaint_id=complaint.id,
                    institution_id=complaint.institution_id,
                    alert_type="OVERLAP_ALERT",
                    title=f"Cross-Bureau Overlap: {conflict['institution_name']}",
                    message=(
                        f"Alert: {len(conflict['bureaus_involved'])} AICTE bureaus "
                        f"({', '.join(conflict['bureaus_involved'])}) now have active cases for this institution. "
                        f"Review file before issuing unilateral regulatory orders."
                    )
                )
                db.add(notif)
        db.commit()
