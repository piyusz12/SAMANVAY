from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.api.deps import (
    get_db,
    get_current_user,
    require_not_auditor
)
from backend.app.models.user import User
from backend.app.schemas.coordination import (
    CoordinationWorkspaceItemOut,
    CoordinationWorkspaceDetailOut,
    CoordinationDecisionCreate,
    CoordinationUnlinkRequest,
    CoordinationTaskCreate,
    CoordinationTaskUpdate,
    CoordinationTaskOut
)
from backend.app.services.coordination_service import (
    get_coordination_workspaces,
    get_coordination_workspace_detail,
    record_coordination_decision,
    unlink_coordination_cases,
    create_coordination_follow_up_task,
    update_coordination_task,
    get_outstanding_coordination_tasks
)

router = APIRouter(prefix="/coordination", tags=["Case Coordination Workspace"])

@router.get("/workspaces", response_model=List[CoordinationWorkspaceItemOut])
def list_workspaces(
    status_filter: Optional[str] = Query(None, description="Optional status filter: PENDING_REVIEW, CONFIRMED_RELATED, NOT_RELATED"),
    active_only: bool = Query(True, description="Only show active linkages"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists coordination workspaces for related complaints across authorized bureaus.
    Enforces bureau-scoped visibility for non-admin users.
    """
    return get_coordination_workspaces(
        db=db,
        current_user=current_user,
        status_filter=status_filter,
        active_only=active_only
    )

@router.get("/workspaces/{linkage_id}", response_model=CoordinationWorkspaceDetailOut)
def get_workspace_detail(
    linkage_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches full side-by-side workspace details for a specific related complaint pair,
    including independent status & action histories, match reasons, and follow-up tasks.
    """
    return get_coordination_workspace_detail(
        db=db,
        linkage_id=linkage_id,
        current_user=current_user
    )

@router.post("/workspaces/{linkage_id}/decision", response_model=CoordinationWorkspaceDetailOut)
def submit_coordination_decision(
    linkage_id: int,
    payload: CoordinationDecisionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_not_auditor)
):
    """
    Records an official inter-bureau coordination decision and follow-up ownership.
    Provides optimistic concurrency locking to prevent conflicting overwrite errors.
    Does NOT automatically transfer ownership or dispose of cases.
    """
    return record_coordination_decision(
        db=db,
        linkage_id=linkage_id,
        payload=payload,
        current_user=current_user
    )

@router.post("/workspaces/{linkage_id}/unlink", response_model=CoordinationWorkspaceDetailOut)
def unlink_cases(
    linkage_id: int,
    payload: CoordinationUnlinkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_not_auditor)
):
    """
    Allows authorized users to unlink cases with recorded rationale and retention preservation.
    """
    return unlink_coordination_cases(
        db=db,
        linkage_id=linkage_id,
        payload=payload,
        current_user=current_user
    )

@router.post("/workspaces/{linkage_id}/tasks", response_model=CoordinationTaskOut, status_code=status.HTTP_201_CREATED)
def add_follow_up_task(
    linkage_id: int,
    payload: CoordinationTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_not_auditor)
):
    """
    Creates an inter-bureau follow-up task with assigned officer, target bureau, and deadline.
    """
    return create_coordination_follow_up_task(
        db=db,
        linkage_id=linkage_id,
        payload=payload,
        current_user=current_user
    )

@router.patch("/tasks/{task_id}", response_model=CoordinationTaskOut)
def update_task_status(
    task_id: int,
    payload: CoordinationTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_not_auditor)
):
    """
    Updates status, completion remarks, or deadline for a coordination task.
    """
    return update_coordination_task(
        db=db,
        task_id=task_id,
        payload=payload,
        current_user=current_user
    )

@router.get("/tasks/outstanding", response_model=List[CoordinationTaskOut])
def list_outstanding_tasks(
    bureau: Optional[str] = Query(None, description="Optional bureau filter"),
    overdue_only: bool = Query(False, description="Filter only overdue tasks"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns all outstanding coordination actions and overdue follow-ups
    across authorized bureaus.
    """
    return get_outstanding_coordination_tasks(
        db=db,
        current_user=current_user,
        bureau_filter=bureau,
        overdue_only=overdue_only
    )
