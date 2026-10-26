from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.api.deps import get_db
from backend.app.services.overlap_service import (
    get_all_cross_bureau_conflicts,
    check_institution_conflict
)

router = APIRouter(prefix="/conflicts", tags=["Conflict & Overlap Radar"])

@router.get("/overlapping", response_model=List[Dict[str, Any]])
def get_overlapping_institutions(db: Session = Depends(get_db)):
    """
    Master Conflict Radar:
    Identifies all institutions where multiple AICTE bureaus/cells are simultaneously taking
    regulatory or grievance actions. Prevents uncoordinated, overlapping or contradictory directives.
    """
    return get_all_cross_bureau_conflicts(db)

@router.get("/institution/{institution_id}", response_model=Dict[str, Any])
def get_institution_conflict_status(institution_id: int, db: Session = Depends(get_db)):
    """Check conflict status for a specific institution ID."""
    return check_institution_conflict(db, institution_id)
