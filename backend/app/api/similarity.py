import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.api.deps import get_db, get_current_user
from backend.app.models.case_linkage import CaseLinkage
from backend.app.models.complaint import Complaint
from backend.app.models.user import User
from backend.app.schemas.similarity import (
    SimilarityCheckRequest,
    SimilarityCheckResponse,
    LinkageCreateSchema,
    LinkageDecisionSchema,
    LinkageOut
)
from backend.app.services.similarity_service import calculate_explainable_similarity
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/similarity", tags=["Explainable AI Similarity & Linkage"])

@router.post("/check", response_model=SimilarityCheckResponse)
def check_similarity(
    payload: SimilarityCheckRequest,
    db: Session = Depends(get_db)
):
    """
    Evaluates explainable AI similarity for a new or existing complaint against all repository records.
    Outputs feature breakdown (keywords, text cosine score, category match, institution overlap)
    under human-in-the-loop governance.
    """
    result = calculate_explainable_similarity(
        db=db,
        subject=payload.subject,
        description=payload.description,
        institution_id=payload.institution_id,
        category=payload.category,
        exclude_complaint_id=payload.exclude_complaint_id
    )
    return result

@router.get("/linkages", response_model=List[LinkageOut])
def list_linkages(db: Session = Depends(get_db)):
    """List case linkages proposed by AI or verified by officers."""
    linkages = db.query(CaseLinkage).order_by(desc(CaseLinkage.created_at)).all()
    results = []
    for l in linkages:
        src = db.query(Complaint).filter(Complaint.id == l.source_complaint_id).first()
        tgt = db.query(Complaint).filter(Complaint.id == l.target_complaint_id).first()
        results.append(
            LinkageOut(
                id=l.id,
                source_complaint_id=l.source_complaint_id,
                source_complaint_no=src.complaint_no if src else None,
                target_complaint_id=l.target_complaint_id,
                target_complaint_no=tgt.complaint_no if tgt else None,
                link_type=l.link_type,
                similarity_score=l.similarity_score,
                explanation_json=l.explanation_json,
                status=l.status,
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
    current_user: User = Depends(get_current_user)
):
    """
    Officer or automated detector creates a linkage between two complaints.
    Requires human confirmation for final regulatory action.
    """
    src = db.query(Complaint).filter(Complaint.id == payload.source_complaint_id).first()
    tgt = db.query(Complaint).filter(Complaint.id == payload.target_complaint_id).first()
    if not src or not tgt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source or target complaint not found.")

    linkage = CaseLinkage(
        source_complaint_id=payload.source_complaint_id,
        target_complaint_id=payload.target_complaint_id,
        link_type=payload.link_type,
        similarity_score=payload.similarity_score,
        explanation_json=json.dumps(payload.explanation),
        status="CONFIRMED_BY_OFFICER",
        verified_by_id=current_user.id,
        verification_notes=payload.notes
    )
    db.add(linkage)
    db.commit()
    db.refresh(linkage)

    log_audit_event(
        db=db,
        action_type="LINK_CONFIRMED",
        description=f"Complaints {src.complaint_no} and {tgt.complaint_no} linked as {payload.link_type}. Notes: {payload.notes or 'None'}",
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_bureau=current_user.bureau,
        complaint_id=src.id,
        institution_id=src.institution_id,
        commit=True
    )

    return LinkageOut(
        id=linkage.id,
        source_complaint_id=linkage.source_complaint_id,
        source_complaint_no=src.complaint_no,
        target_complaint_id=linkage.target_complaint_id,
        target_complaint_no=tgt.complaint_no,
        link_type=linkage.link_type,
        similarity_score=linkage.similarity_score,
        explanation_json=linkage.explanation_json,
        status=linkage.status,
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
    current_user: User = Depends(get_current_user)
):
    """Human review decision for AI proposed linkages (Confirm or Dismiss)."""
    linkage = db.query(CaseLinkage).filter(CaseLinkage.id == linkage_id).first()
    if not linkage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Linkage not found.")

    linkage.status = payload.status
    linkage.verified_by_id = current_user.id
    linkage.verification_notes = payload.verification_notes
    db.commit()
    db.refresh(linkage)

    src = db.query(Complaint).filter(Complaint.id == linkage.source_complaint_id).first()
    tgt = db.query(Complaint).filter(Complaint.id == linkage.target_complaint_id).first()

    log_audit_event(
        db=db,
        action_type="LINK_REVIEWED",
        description=f"AI proposed linkage between {src.complaint_no if src else ''} and {tgt.complaint_no if tgt else ''} set to {payload.status}.",
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_bureau=current_user.bureau,
        complaint_id=linkage.source_complaint_id,
        commit=True
    )

    return LinkageOut(
        id=linkage.id,
        source_complaint_id=linkage.source_complaint_id,
        source_complaint_no=src.complaint_no if src else None,
        target_complaint_id=linkage.target_complaint_id,
        target_complaint_no=tgt.complaint_no if tgt else None,
        link_type=linkage.link_type,
        similarity_score=linkage.similarity_score,
        explanation_json=linkage.explanation_json,
        status=linkage.status,
        verified_by_id=linkage.verified_by_id,
        verification_notes=linkage.verification_notes,
        created_at=linkage.created_at,
        updated_at=linkage.updated_at
    )
