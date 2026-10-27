from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.models.complaint import Complaint
from backend.app.models.institution import Institution
from backend.app.models.user import User
from backend.app.core.datetime_util import utc_now
from backend.app.services.overlap_engine import (
    run_staged_overlap_evaluation,
    check_linkage_status_and_reevaluation,
    compute_text_hash,
    DEFAULT_THRESHOLDS
)

def calculate_explainable_similarity(
    db: Session,
    subject: str,
    description: str,
    institution_id: int,
    category: str,
    exclude_complaint_id: Optional[int] = None,
    bureau: Optional[str] = None,
    threshold: Optional[float] = None,
    current_user: Optional[User] = None
) -> Dict[str, Any]:
    """
    Computes explainable 4-stage overlap detection for a query complaint against all repository records.
    Strictly follows AICTE human-in-the-loop governance: outputs explainable scoring breakdown,
    confidence tiers, and human-readable reasons without performing any automated merge or decision.
    """
    query = db.query(Complaint).filter(Complaint.is_deleted == False)
    if exclude_complaint_id:
        query = query.filter(Complaint.id != exclude_complaint_id)

    candidates = query.all()
    if not candidates:
        return {
            "matches": [],
            "highest_score": 0.0,
            "duplicate_suspected": False,
            "cross_bureau_overlap_suspected": False,
            "total_evaluated_candidates": 0
        }

    source_inst = db.query(Institution).filter(
        Institution.id == institution_id,
        Institution.is_deleted == False
    ).first()

    # Synthetic complaint representation for evaluation
    source_complaint = Complaint(
        id=exclude_complaint_id or 0,
        complaint_no="QUERY_CASE",
        institution_id=institution_id,
        bureau=bureau or "PGRC",
        category=category,
        subject=subject,
        description=description,
        created_at=utc_now()
    )

    src_hash = compute_text_hash(f"{subject} {description}")
    effective_thresh = DEFAULT_THRESHOLDS.copy()
    if threshold is not None:
        effective_thresh["low"] = threshold

    matches = []
    highest_score = 0.0
    duplicate_suspected = False
    cross_bureau_overlap_suspected = False

    for candidate in candidates:
        target_inst = candidate.institution
        eval_result = run_staged_overlap_evaluation(
            source=source_complaint,
            target=candidate,
            source_inst=source_inst,
            target_inst=target_inst,
            thresholds=effective_thresh
        )

        score = eval_result["candidate_score"]
        confidence = eval_result["confidence"]
        reasons = eval_result["reasons"]
        breakdown = eval_result["breakdown"]

        # Check existing linkage or re-evaluation requirement
        tgt_hash = compute_text_hash(f"{candidate.subject} {candidate.description}")
        linkage, requires_reeval, linkage_status = check_linkage_status_and_reevaluation(
            db=db,
            source_id=source_complaint.id,
            target_id=candidate.id,
            source_hash=src_hash,
            target_hash=tgt_hash
        )

        # Apply threshold filter
        if score >= effective_thresh.get("low", 0.35):
            inst_name = target_inst.name if target_inst else "Unknown Institution"

            if score > highest_score:
                highest_score = score

            if score >= 0.75 and breakdown["stage1_exact_identifier_matched"]:
                duplicate_suspected = True

            if breakdown["stage3_cross_bureau"] and candidate.status not in ["DISPOSED", "RESOLVED"]:
                cross_bureau_overlap_suspected = True

            rationale_text = " | ".join(reasons) if reasons else "Composite semantic correspondence."

            breakdown_dict = dict(breakdown)
            breakdown_dict["stage_1_exact_id_match"] = breakdown.get("stage1_exact_identifier_matched")
            breakdown_dict["stage_2_name_similarity"] = breakdown.get("stage2_normalized_name_score")
            breakdown_dict["stage_3_metadata_similarity"] = breakdown.get("stage3_metadata_score")
            breakdown_dict["stage_4_semantic_similarity"] = breakdown.get("stage4_semantic_score")

            matches.append({
                "complaint_id": candidate.id,
                "complaint_no": candidate.complaint_no,
                "institution_id": candidate.institution_id,
                "institution_name": inst_name,
                "bureau": candidate.bureau,
                "status": candidate.status,
                "subject": candidate.subject,
                "category": candidate.category,
                "similarity_score": score,
                "confidence_tier": confidence,
                "reasons": reasons,
                "breakdown": breakdown_dict,
                "staged_breakdown": breakdown_dict,
                "linkage_status": linkage_status,
                "linkage_id": linkage.id if linkage else None,
                "explanation": {
                    "overall_score": score,
                    "text_similarity_score": breakdown["stage4_semantic_score"],
                    "category_match": breakdown["stage3_category_relationship"] == "EXACT",
                    "institution_match": breakdown["stage1_exact_identifier_matched"] or breakdown["stage2_alias_matched"],
                    "shared_keywords": breakdown["stage3_shared_keywords"],
                    "rationale": rationale_text
                }
            })

    # Sort matches by score descending
    matches.sort(key=lambda m: m["similarity_score"], reverse=True)

    return {
        "matches": matches[:15],
        "highest_score": round(highest_score, 3),
        "duplicate_suspected": duplicate_suspected,
        "cross_bureau_overlap_suspected": cross_bureau_overlap_suspected,
        "total_evaluated_candidates": len(candidates)
    }
