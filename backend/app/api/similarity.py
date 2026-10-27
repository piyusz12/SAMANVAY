import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from backend.app.api.deps import get_db, get_current_user, get_optional_current_user, normalize_role, require_not_auditor
from backend.app.models.case_linkage import CaseLinkage
from backend.app.models.complaint import Complaint
from backend.app.models.user import User
from backend.app.schemas.similarity import (
    SimilarityCheckRequest,
    SimilarityCheckResponse,
    LinkageCreateSchema,
    LinkageDecisionSchema,
    LinkageOut,
    BenchmarkEvaluationOut,
    OptimalThresholdsOut
)
from backend.app.services.similarity_service import calculate_explainable_similarity
from backend.app.services.overlap_engine import (
    evaluate_benchmark_dataset,
    find_optimal_thresholds,
    compute_text_hash,
    run_staged_overlap_evaluation
)
from backend.app.services.audit_service import log_audit_event
from backend.app.core.datetime_util import utc_now

router = APIRouter(prefix="/similarity", tags=["Explainable AI Similarity & Linkage"])

def canonical_status(status_str: str) -> str:
    """Normalizes review status across prompt requirements and legacy identifiers."""
    mapping = {
        "PROPOSED_BY_AI": "PENDING_REVIEW",
        "PENDING_REVIEW": "PENDING_REVIEW",
        "CONFIRMED_BY_OFFICER": "CONFIRMED_RELATED",
        "CONFIRMED_RELATED": "CONFIRMED_RELATED",
        "DISMISSED": "NOT_RELATED",
        "NOT_RELATED": "NOT_RELATED",
        "ALREADY_LINKED": "ALREADY_LINKED"
    }
    return mapping.get((status_str or "").upper().strip(), status_str)

@router.post("/check", response_model=SimilarityCheckResponse)
def check_similarity(
    payload: SimilarityCheckRequest,
    threshold: Optional[float] = Query(None, description="Optional custom threshold override"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Evaluates explainable 4-stage overlap detection for a query complaint against all repository records.
    Outputs feature breakdown (exact identifiers, aliases, metadata/cross-bureau, semantic cosine score)
    under human-in-the-loop governance without performing automated mergers.
    """
    result = calculate_explainable_similarity(
        db=db,
        subject=payload.subject,
        description=payload.description,
        institution_id=payload.institution_id,
        category=payload.category,
        exclude_complaint_id=payload.exclude_complaint_id,
        threshold=threshold,
        current_user=current_user
    )
    return result

@router.get("/evaluate-benchmark", response_model=BenchmarkEvaluationOut)
def run_benchmark_dataset_evaluation(
    high_threshold: Optional[float] = Query(None, ge=0.0, le=1.0),
    medium_threshold: Optional[float] = Query(None, ge=0.0, le=1.0),
    low_threshold: Optional[float] = Query(None, ge=0.0, le=1.0),
    db: Session = Depends(get_db)
):
    """
    Runs the staged overlap detection pipeline over the labelled synthetic benchmark dataset.
    Reports empirical precision, recall, F1 score, accuracy, and full confusion matrix.
    Satisfies prompt requirement: thresholds must be tuned using a labelled synthetic evaluation dataset.
    """
    custom_thresh = None
    if low_threshold is not None:
        custom_thresh = {
            "high": high_threshold or 0.75,
            "medium": medium_threshold or 0.50,
            "low": low_threshold
        }
    return evaluate_benchmark_dataset(custom_thresh)

@router.get("/optimal-thresholds", response_model=OptimalThresholdsOut)
def get_optimal_tuned_thresholds():
    """
    Iterates candidate threshold cutoffs over the labelled benchmark dataset
    and returns the mathematically optimal F1 threshold operating parameters.
    """
    return find_optimal_thresholds()

@router.get("/linkages", response_model=List[LinkageOut])
def list_linkages(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists case linkages proposed by AI or verified by officers.
    Respects bureau-scoped access controls: non-Super Admins view linkages
    involving their assigned bureau.
    """
    user_role = normalize_role(current_user.role)
    query = db.query(CaseLinkage).order_by(desc(CaseLinkage.created_at))

    linkages = query.all()
    results = []
    for l in linkages:
        src = db.query(Complaint).filter(Complaint.id == l.source_complaint_id).first()
        tgt = db.query(Complaint).filter(Complaint.id == l.target_complaint_id).first()

        # Enforce bureau access control: Super Admin / Auditor see all, Bureau Officers see own bureau cases
        if user_role not in ("SUPER_ADMIN", "AUDITOR"):
            src_bureau = src.bureau if src else ""
            tgt_bureau = tgt.bureau if tgt else ""
            if current_user.bureau not in (src_bureau, tgt_bureau):
                continue

        # Parse reasons json if stored
        reasons_list = []
        if l.reasons_json:
            try:
                reasons_list = json.loads(l.reasons_json)
            except Exception:
                reasons_list = []

        results.append(
            LinkageOut(
                id=l.id,
                source_complaint_id=l.source_complaint_id,
                source_complaint_no=src.complaint_no if src else None,
                target_complaint_id=l.target_complaint_id,
                target_complaint_no=tgt.complaint_no if tgt else None,
                link_type=l.link_type,
                similarity_score=l.similarity_score,
                confidence_tier=l.confidence_tier or "MEDIUM",
                explanation_json=l.explanation_json,
                reasons=reasons_list,
                rationale=l.rationale,
                status=canonical_status(l.status),
                verified_by_id=l.verified_by_id,
                verification_notes=l.verification_notes,
                created_at=l.created_at,
                updated_at=l.updated_at
            )
        )
    return results

@router.post("/link", response_model=LinkageOut, status_code=status.HTTP_201_CREATED)
def create_linkage(
    payload: LinkageCreateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_not_auditor)
):
    """
    Officer or automated detector creates a linkage between two complaints.
    Prevents duplicate alert pairs through canonical pair ordering (min, max).
    Requires human confirmation for final regulatory action.
    """
    src = db.query(Complaint).filter(Complaint.id == payload.source_complaint_id, Complaint.is_deleted == False).first()
    tgt = db.query(Complaint).filter(Complaint.id == payload.target_complaint_id, Complaint.is_deleted == False).first()
    if not src or not tgt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source or target complaint not found.")

    user_role = normalize_role(current_user.role)
    if user_role != "SUPER_ADMIN" and current_user.bureau not in (src.bureau, tgt.bureau):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: You belong to {current_user.bureau} and cannot link cases outside your bureau."
        )

    # Canonical symmetrical ordering
    min_id, max_id = min(src.id, tgt.id), max(src.id, tgt.id)
    src_complaint = src if src.id == min_id else tgt
    tgt_complaint = tgt if tgt.id == max_id else src

    src_hash = compute_text_hash(f"{src_complaint.subject} {src_complaint.description}")
    tgt_hash = compute_text_hash(f"{tgt_complaint.subject} {tgt_complaint.description}")

    # Check existing linkage to avoid duplicate alerts
    existing = db.query(CaseLinkage).filter(
        CaseLinkage.source_complaint_id == min_id,
        CaseLinkage.target_complaint_id == max_id
    ).first()

    reasons = payload.explanation.get("reasons", []) if isinstance(payload.explanation, dict) else []

    if existing:
        existing.similarity_score = payload.similarity_score
        existing.link_type = payload.link_type
        existing.explanation_json = json.dumps(payload.explanation)
        existing.status = "CONFIRMED_RELATED"
        existing.verified_by_id = current_user.id
        existing.verification_notes = payload.notes
        existing.rationale = payload.rationale or payload.notes
        existing.reasons_json = json.dumps(reasons)
        existing.source_complaint_hash = src_hash
        existing.target_complaint_hash = tgt_hash
        existing.reviewed_at = utc_now()
        existing.updated_at = utc_now()
        db.commit()
        db.refresh(existing)
        linkage = existing
    else:
        linkage = CaseLinkage(
            source_complaint_id=min_id,
            target_complaint_id=max_id,
            link_type=payload.link_type,
            similarity_score=payload.similarity_score,
            confidence_tier="HIGH" if payload.similarity_score >= 0.75 else "MEDIUM",
            explanation_json=json.dumps(payload.explanation),
            reasons_json=json.dumps(reasons),
            rationale=payload.rationale or payload.notes,
            source_complaint_hash=src_hash,
            target_complaint_hash=tgt_hash,
            status="CONFIRMED_RELATED",
            verified_by_id=current_user.id,
            verification_notes=payload.notes,
            reviewed_at=utc_now()
        )
        db.add(linkage)
        db.commit()
        db.refresh(linkage)

    log_audit_event(
        db=db,
        action_type="LINK_CONFIRMED",
        description=f"Complaints {src_complaint.complaint_no} and {tgt_complaint.complaint_no} linked as {payload.link_type}. Rationale: {payload.rationale or payload.notes or 'None'}",
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_bureau=current_user.bureau,
        complaint_id=src_complaint.id,
        institution_id=src_complaint.institution_id,
        commit=True
    )

    return LinkageOut(
        id=linkage.id,
        source_complaint_id=linkage.source_complaint_id,
        source_complaint_no=src_complaint.complaint_no,
        target_complaint_id=linkage.target_complaint_id,
        target_complaint_no=tgt_complaint.complaint_no,
        link_type=linkage.link_type,
        similarity_score=linkage.similarity_score,
        confidence_tier=linkage.confidence_tier,
        explanation_json=linkage.explanation_json,
        reasons=reasons,
        rationale=linkage.rationale,
        status=canonical_status(linkage.status),
        verified_by_id=linkage.verified_by_id,
        verification_notes=linkage.verification_notes,
        created_at=linkage.created_at,
        updated_at=linkage.updated_at
    )

@router.patch("/linkages/{linkage_id}", response_model=LinkageOut)
def review_linkage(
    linkage_id: int,
    payload: LinkageDecisionSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_not_auditor)
):
    """
    Human review decision for AI proposed candidate linkages:
    Allows authorized officers to Confirm Related, Dismiss as Not Related, or Mark as Already Linked,
    recording review rationale.
    """
    linkage = db.query(CaseLinkage).filter(CaseLinkage.id == linkage_id).first()
    if not linkage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Linkage not found.")

    src = db.query(Complaint).filter(Complaint.id == linkage.source_complaint_id).first()
    tgt = db.query(Complaint).filter(Complaint.id == linkage.target_complaint_id).first()

    user_role = normalize_role(current_user.role)
    if user_role != "SUPER_ADMIN" and src and tgt and current_user.bureau not in (src.bureau, tgt.bureau):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: You belong to {current_user.bureau} and cannot review linkages between {src.bureau} and {tgt.bureau}."
        )

    norm_status = canonical_status(payload.status)
    if norm_status not in ("PENDING_REVIEW", "CONFIRMED_RELATED", "NOT_RELATED", "ALREADY_LINKED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid review decision status '{payload.status}'."
        )

    linkage.status = norm_status
    linkage.verified_by_id = current_user.id
    linkage.verification_notes = payload.verification_notes
    linkage.rationale = payload.rationale or payload.verification_notes
    linkage.reviewed_at = utc_now()
    linkage.updated_at = utc_now()
    db.commit()
    db.refresh(linkage)

    log_audit_event(
        db=db,
        action_type="LINK_REVIEWED",
        description=f"Linkage between {src.complaint_no if src else ''} and {tgt.complaint_no if tgt else ''} set to {norm_status}. Rationale: {payload.rationale or 'None'}",
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_bureau=current_user.bureau,
        complaint_id=linkage.source_complaint_id,
        commit=True
    )

    reasons_list = []
    if linkage.reasons_json:
        try:
            reasons_list = json.loads(linkage.reasons_json)
        except Exception:
            reasons_list = []

    return LinkageOut(
        id=linkage.id,
        source_complaint_id=linkage.source_complaint_id,
        source_complaint_no=src.complaint_no if src else None,
        target_complaint_id=linkage.target_complaint_id,
        target_complaint_no=tgt.complaint_no if tgt else None,
        link_type=linkage.link_type,
        similarity_score=linkage.similarity_score,
        confidence_tier=linkage.confidence_tier,
        explanation_json=linkage.explanation_json,
        reasons=reasons_list,
        rationale=linkage.rationale,
        status=canonical_status(linkage.status),
        verified_by_id=linkage.verified_by_id,
        verification_notes=linkage.verification_notes,
        created_at=linkage.created_at,
        updated_at=linkage.updated_at
    )
