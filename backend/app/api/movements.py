from typing import List, Optional
from datetime import datetime
from backend.app.core.datetime_util import utc_now
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.api.deps import get_db, get_current_user, require_roles
from backend.app.models.case_movement import CaseMovement
from backend.app.models.complaint import Complaint
from backend.app.models.user import User
from backend.app.schemas.case_movement import (
    TransferRequestSchema,
    TransferDecisionSchema,
    MovementOut
)
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/movements", tags=["Inter-Bureau File Movements"])

@router.get("", response_model=List[MovementOut])
def list_movements(
    status_filter: Optional[str] = Query(None, alias="status"),
    to_bureau: Optional[str] = Query(None),
    from_bureau: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """List inter-bureau case transfer and co-handling movements."""
    query = db.query(CaseMovement)
    if status_filter:
        query = query.filter(CaseMovement.status == status_filter)
    if to_bureau:
        query = query.filter(CaseMovement.to_bureau == to_bureau)
    if from_bureau:
        query = query.filter(CaseMovement.from_bureau == from_bureau)

    movements = query.order_by(desc(CaseMovement.created_at)).all()
    results = []
    for m in movements:
        results.append(
            MovementOut(
                id=m.id,
                complaint_id=m.complaint_id,
                complaint_no=m.complaint.complaint_no if m.complaint else None,
                from_bureau=m.from_bureau,
                to_bureau=m.to_bureau,
                movement_type=m.movement_type,
                reason=m.reason,
                status=m.status,
                requested_by_id=m.requested_by_id,
                requested_by_name=m.requested_by.full_name if m.requested_by else None,
                decided_by_id=m.decided_by_id,
                decided_by_name=m.decided_by.full_name if m.decided_by else None,
                decision_notes=m.decision_notes,
                created_at=m.created_at,
                decided_at=m.decided_at
            )
        )
    return results

@router.post("/complaint/{complaint_id}", response_model=MovementOut, status_code=status.HTTP_201_CREATED)
def request_bureau_transfer(
    complaint_id: int,
    payload: TransferRequestSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Initiate an inter-bureau transfer or co-handling request for a complaint file."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")

    if complaint.bureau == payload.to_bureau:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target bureau cannot be identical to current handling bureau."
        )

    movement = CaseMovement(
        complaint_id=complaint.id,
        from_bureau=complaint.bureau,
        to_bureau=payload.to_bureau,
        movement_type=payload.movement_type,
        reason=payload.reason,
        status="PENDING_APPROVAL",
        requested_by_id=current_user.id,
        created_at=utc_now()
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)

    log_audit_event(
        db=db,
        action_type="TRANSFER_REQUESTED",
        description=f"Transfer requested from {complaint.bureau} to {payload.to_bureau}. Reason: {payload.reason}",
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_bureau=current_user.bureau,
        complaint_id=complaint.id,
        institution_id=complaint.institution_id,
        commit=True
    )

    return MovementOut(
        id=movement.id,
        complaint_id=movement.complaint_id,
        complaint_no=complaint.complaint_no,
        from_bureau=movement.from_bureau,
        to_bureau=movement.to_bureau,
        movement_type=movement.movement_type,
        reason=movement.reason,
        status=movement.status,
        requested_by_id=current_user.id,
        requested_by_name=current_user.full_name,
        created_at=movement.created_at
    )

@router.patch("/{movement_id}/decide", response_model=MovementOut)
def decide_transfer_request(
    movement_id: int,
    payload: TransferDecisionSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["BUREAU_HEAD", "SUPER_ADMIN"]))
):
    """
    Accept or Reject inter-bureau transfer.
    If accepted, transfers case authority and updates handling bureau atomically.
    """
    movement = db.query(CaseMovement).filter(CaseMovement.id == movement_id).first()
    if not movement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movement request not found.")

    if movement.status != "PENDING_APPROVAL":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Request already {movement.status}.")

    movement.status = payload.decision
    movement.decided_by_id = current_user.id
    movement.decision_notes = payload.notes
    movement.decided_at = utc_now()

    complaint = movement.complaint
    old_bureau = complaint.bureau

    if payload.decision == "ACCEPTED":
        complaint.bureau = movement.to_bureau
        complaint.status = "TRANSFERRED"
        complaint.updated_at = utc_now()

    db.commit()
    db.refresh(movement)

    log_audit_event(
        db=db,
        action_type="TRANSFER_DECIDED",
        description=f"Transfer to {movement.to_bureau} was {payload.decision}. Notes: {payload.notes or 'None'}",
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_bureau=current_user.bureau,
        complaint_id=complaint.id,
        institution_id=complaint.institution_id,
        previous_state=old_bureau,
        new_state=complaint.bureau,
        commit=True
    )

    return MovementOut(
        id=movement.id,
        complaint_id=movement.complaint_id,
        complaint_no=complaint.complaint_no,
        from_bureau=movement.from_bureau,
        to_bureau=movement.to_bureau,
        movement_type=movement.movement_type,
        reason=movement.reason,
        status=movement.status,
        requested_by_id=movement.requested_by_id,
        requested_by_name=movement.requested_by.full_name if movement.requested_by else None,
        decided_by_id=current_user.id,
        decided_by_name=current_user.full_name,
        decision_notes=movement.decision_notes,
        created_at=movement.created_at,
        decided_at=movement.decided_at
    )
