import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import desc, or_, and_

from backend.app.core.datetime_util import utc_now
from backend.app.models.case_linkage import CaseLinkage
from backend.app.models.complaint import Complaint
from backend.app.models.institution import Institution
from backend.app.models.user import User
from backend.app.models.case_status_history import CaseStatusHistory
from backend.app.models.audit_log import AuditLog
from backend.app.models.follow_up_task import FollowUpTask
from backend.app.models.notification import Notification
from backend.app.schemas.coordination import (
    SideBySideComplaintOut,
    StatusHistoryItemOut,
    ActionHistoryItemOut,
    CoordinationWorkspaceItemOut,
    CoordinationWorkspaceDetailOut,
    CoordinationDecisionCreate,
    CoordinationTaskCreate,
    CoordinationTaskUpdate,
    CoordinationTaskOut,
    CoordinationUnlinkRequest
)
from backend.app.services.audit_service import log_audit_event
from backend.app.services.complaint_service import calculate_sla_details
from backend.app.api.deps import normalize_role

def parse_json_safely(val: Optional[str]) -> Any:
    if not val:
        return []
    try:
        return json.loads(val)
    except Exception:
        return []

def build_side_by_side_complaint_payload(db: Session, complaint: Complaint) -> SideBySideComplaintOut:
    """
    Constructs a comprehensive side-by-side view of a single complaint,
    including SLA details, institution identifiers, and independent action/status histories.
    """
    inst = db.query(Institution).filter(Institution.id == complaint.institution_id).first()
    officer = db.query(User).filter(User.id == complaint.assigned_officer_id).first() if complaint.assigned_officer_id else None

    days_open, is_ovd, sla_status = calculate_sla_details(complaint)
    sla_days = complaint.sla_deadline_days or 30
    days_rem = max(0, sla_days - days_open)
    days_ovd = max(0, days_open - sla_days) if is_ovd else 0

    # Separate status history for this complaint
    status_records = (
        db.query(CaseStatusHistory)
        .filter(CaseStatusHistory.complaint_id == complaint.id)
        .order_by(desc(CaseStatusHistory.created_at))
        .limit(15)
        .all()
    )
    status_history_items = []
    for sh in status_records:
        changer = db.query(User).filter(User.id == sh.changed_by_id).first() if sh.changed_by_id else None
        status_history_items.append(
            StatusHistoryItemOut(
                id=sh.id,
                from_status=sh.from_status,
                to_status=sh.to_status,
                reason=sh.remarks or sh.action_taken,
                changed_by_name=changer.full_name if changer else "System Action",
                created_at=sh.created_at
            )
        )

    # Separate chronological action history from AuditLog
    audit_records = (
        db.query(AuditLog)
        .filter(AuditLog.complaint_id == complaint.id)
        .order_by(desc(AuditLog.timestamp))
        .limit(20)
        .all()
    )
    action_history_items = []
    for ar in audit_records:
        action_history_items.append(
            ActionHistoryItemOut(
                id=ar.id,
                actor_name=ar.actor_name,
                actor_role=ar.actor_role,
                actor_bureau=ar.actor_bureau,
                action_type=ar.action_type,
                description=ar.description,
                created_at=ar.timestamp
            )
        )

    last_action = None
    last_action_date = None
    if action_history_items:
        last_action = action_history_items[0].description or action_history_items[0].action_type
        last_action_date = action_history_items[0].created_at

    return SideBySideComplaintOut(
        id=complaint.id,
        complaint_no=complaint.complaint_no,
        institution_id=complaint.institution_id,
        institution_name=inst.name if inst else "Unknown Institution",
        institution_aicte_id=inst.aicte_id if inst else None,
        institution_aishe_code=inst.aishe_code if inst else None,
        bureau=complaint.bureau,
        assigned_officer_id=complaint.assigned_officer_id,
        assigned_officer_name=officer.full_name if officer else complaint.assigned_officer_name,
        status=complaint.status,
        priority=complaint.priority,
        category=complaint.category,
        subject=complaint.subject,
        description=complaint.description,
        sla_due_date=complaint.sla_due_date,
        is_overdue=is_ovd,
        days_overdue=days_ovd,
        days_remaining=days_rem,
        created_at=complaint.created_at,
        updated_at=complaint.updated_at,
        last_action=last_action,
        last_action_date=last_action_date,
        status_history=status_history_items,
        action_history=action_history_items
    )

def check_bureau_coordination_access(current_user: User, src_bureau: str, tgt_bureau: str):
    """
    Validates that a non-admin officer belongs to at least one of the bureaus involved.
    Prevents unauthorized bureau intrusion into cross-bureau case coordination.
    """
    role = normalize_role(current_user.role)
    if role in ("SUPER_ADMIN", "AUDITOR"):
        return
    user_bureau = (current_user.bureau or "").strip()
    if user_bureau not in (src_bureau, tgt_bureau):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: You belong to {user_bureau} and cannot access coordination workspaces between {src_bureau} and {tgt_bureau}."
        )

def get_coordination_workspaces(
    db: Session,
    current_user: User,
    status_filter: Optional[str] = None,
    active_only: bool = True
) -> List[CoordinationWorkspaceItemOut]:
    """
    Lists coordination workspaces for related complaints across authorized bureaus.
    Optimized with eager relationships to prevent N+1 query overhead.
    """
    role = normalize_role(current_user.role)
    query = db.query(CaseLinkage).options(
        joinedload(CaseLinkage.source_complaint).joinedload(Complaint.institution),
        joinedload(CaseLinkage.source_complaint).joinedload(Complaint.assigned_officer),
        joinedload(CaseLinkage.target_complaint).joinedload(Complaint.institution),
        joinedload(CaseLinkage.target_complaint).joinedload(Complaint.assigned_officer),
        selectinload(CaseLinkage.follow_up_tasks)
    ).order_by(desc(CaseLinkage.updated_at))

    if active_only:
        query = query.filter(CaseLinkage.is_active == True)

    if status_filter:
        query = query.filter(CaseLinkage.status == status_filter.upper().strip())

    linkages = query.all()
    results: List[CoordinationWorkspaceItemOut] = []
    now = utc_now()
    now_dt = datetime.fromisoformat(now.isoformat()) if hasattr(now, "isoformat") else now

    for l in linkages:
        src = l.source_complaint
        tgt = l.target_complaint
        if not src or not tgt:
            continue

        # Bureau access control
        if role not in ("SUPER_ADMIN", "AUDITOR"):
            user_bureau = (current_user.bureau or "").strip()
            if user_bureau not in (src.bureau, tgt.bureau):
                continue

        inst = src.institution
        src_officer = src.assigned_officer
        tgt_officer = tgt.assigned_officer

        # Calculate outstanding / overdue follow-up tasks from preloaded collection
        tasks = [t for t in (l.follow_up_tasks or []) if t.status in ("PENDING", "IN_PROGRESS", "OVERDUE")]
        overdue_count = sum(1 for t in tasks if t.deadline and t.deadline < now_dt)

        reasons = parse_json_safely(l.reasons_json)

        results.append(
            CoordinationWorkspaceItemOut(
                linkage_id=l.id,
                status=l.status,
                is_active=l.is_active,
                link_type=l.link_type,
                similarity_score=l.similarity_score,
                confidence_tier=l.confidence_tier or "MEDIUM",
                reasons=reasons if isinstance(reasons, list) else [],
                institution_id=src.institution_id,
                institution_name=inst.name if inst else "Unknown Institution",
                institution_aicte_id=inst.aicte_id if inst else None,
                source_complaint_id=src.id,
                source_complaint_no=src.complaint_no,
                source_bureau=src.bureau,
                source_status=src.status,
                source_assigned_officer_name=src_officer.full_name if src_officer else src.assigned_officer_name,
                target_complaint_id=tgt.id,
                target_complaint_no=tgt.complaint_no,
                target_bureau=tgt.bureau,
                target_status=tgt.status,
                target_assigned_officer_name=tgt_officer.full_name if tgt_officer else tgt.assigned_officer_name,
                coordination_decision=l.coordination_decision,
                lead_bureau=l.lead_bureau,
                coordination_deadline=l.coordination_deadline,
                version=l.version or 1,
                outstanding_tasks_count=len(tasks),
                overdue_tasks_count=overdue_count,
                created_at=l.created_at,
                updated_at=l.updated_at
            )
        )

    return results

def get_coordination_workspace_detail(
    db: Session,
    linkage_id: int,
    current_user: User
) -> CoordinationWorkspaceDetailOut:
    """
    Fetches full side-by-side workspace details for a specific related complaint pair.
    """
    linkage = db.query(CaseLinkage).filter(CaseLinkage.id == linkage_id).first()
    if not linkage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coordination workspace not found.")

    src = db.query(Complaint).filter(Complaint.id == linkage.source_complaint_id).first()
    tgt = db.query(Complaint).filter(Complaint.id == linkage.target_complaint_id).first()
    if not src or not tgt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated complaints not found.")

    check_bureau_coordination_access(current_user, src.bureau, tgt.bureau)

    src_side = build_side_by_side_complaint_payload(db, src)
    tgt_side = build_side_by_side_complaint_payload(db, tgt)

    # Lead officer and reviewer details
    lead_off = db.query(User).filter(User.id == linkage.lead_officer_id).first() if linkage.lead_officer_id else None
    verifier = db.query(User).filter(User.id == linkage.verified_by_id).first() if linkage.verified_by_id else None
    unlinker = db.query(User).filter(User.id == linkage.unlinked_by_id).first() if linkage.unlinked_by_id else None

    # Follow-up tasks
    task_records = (
        db.query(FollowUpTask)
        .filter(FollowUpTask.linkage_id == linkage.id)
        .order_by(FollowUpTask.deadline.asc())
        .all()
    )
    now = utc_now()
    now_dt = datetime.fromisoformat(now.isoformat()) if hasattr(now, "isoformat") else now

    formatted_tasks: List[CoordinationTaskOut] = []
    overdue_count = 0
    outstanding_count = 0

    for t in task_records:
        assigned_user = db.query(User).filter(User.id == t.assigned_to_id).first() if t.assigned_to_id else None
        created_user = db.query(User).filter(User.id == t.created_by_id).first() if t.created_by_id else None
        is_ovd = (t.status in ["PENDING", "IN_PROGRESS", "OVERDUE"]) and (t.deadline < now_dt)
        if is_ovd:
            overdue_count += 1
        if t.status in ["PENDING", "IN_PROGRESS", "OVERDUE"]:
            outstanding_count += 1

        task_c = db.query(Complaint).filter(Complaint.id == t.complaint_id).first() if t.complaint_id else None

        formatted_tasks.append(
            CoordinationTaskOut(
                id=t.id,
                linkage_id=t.linkage_id,
                complaint_id=t.complaint_id,
                complaint_no=task_c.complaint_no if task_c else None,
                title=t.title,
                description=t.description,
                assigned_to_id=t.assigned_to_id,
                assigned_to_name=assigned_user.full_name if assigned_user else None,
                target_bureau=t.target_bureau,
                created_by_id=t.created_by_id,
                created_by_name=created_user.full_name if created_user else None,
                deadline=t.deadline,
                status="OVERDUE" if is_ovd and t.status != "COMPLETED" else t.status,
                priority=t.priority,
                is_overdue=is_ovd,
                completed_at=t.completed_at,
                completion_notes=t.completion_notes,
                created_at=t.created_at
            )
        )

    explanation = parse_json_safely(linkage.explanation_json)
    if not isinstance(explanation, dict):
        explanation = {}

    reasons = parse_json_safely(linkage.reasons_json)
    if not isinstance(reasons, list):
        reasons = []

    return CoordinationWorkspaceDetailOut(
        linkage_id=linkage.id,
        status=linkage.status,
        is_active=linkage.is_active,
        link_type=linkage.link_type,
        similarity_score=linkage.similarity_score,
        confidence_tier=linkage.confidence_tier or "MEDIUM",
        explanation=explanation,
        reasons=reasons,
        rationale=linkage.rationale,
        source_complaint=src_side,
        target_complaint=tgt_side,
        coordination_decision=linkage.coordination_decision,
        coordination_notes=linkage.coordination_notes,
        lead_bureau=linkage.lead_bureau,
        lead_officer_id=linkage.lead_officer_id,
        lead_officer_name=lead_off.full_name if lead_off else None,
        coordination_deadline=linkage.coordination_deadline,
        version=linkage.version or 1,
        follow_up_tasks=formatted_tasks,
        outstanding_tasks_count=outstanding_count,
        overdue_tasks_count=overdue_count,
        verified_by_id=linkage.verified_by_id,
        verified_by_name=verifier.full_name if verifier else None,
        verification_notes=linkage.verification_notes,
        reviewed_at=linkage.reviewed_at,
        unlinked_at=linkage.unlinked_at,
        unlinked_by_id=linkage.unlinked_by_id,
        unlinked_by_name=unlinker.full_name if unlinker else None,
        unlink_reason=linkage.unlink_reason,
        created_at=linkage.created_at,
        updated_at=linkage.updated_at
    )

def record_coordination_decision(
    db: Session,
    linkage_id: int,
    payload: CoordinationDecisionCreate,
    current_user: User
) -> CoordinationWorkspaceDetailOut:
    """
    Records a formal inter-bureau coordination decision and follow-up ownership.
    Provides optimistic concurrency locking to prevent concurrent overwrite conflicts.
    Does NOT transfer ownership or dispose of cases automatically (preserves separate case histories).
    """
    linkage = db.query(CaseLinkage).filter(CaseLinkage.id == linkage_id).first()
    if not linkage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coordination workspace not found.")

    src = db.query(Complaint).filter(Complaint.id == linkage.source_complaint_id).first()
    tgt = db.query(Complaint).filter(Complaint.id == linkage.target_complaint_id).first()
    if not src or not tgt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated complaints not found.")

    check_bureau_coordination_access(current_user, src.bureau, tgt.bureau)

    # Feature 9: Concurrent edit conflict check (Optimistic Concurrency Control)
    if payload.expected_version is not None and linkage.version != payload.expected_version:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Concurrent edit conflict detected: Another officer has modified this coordination workspace "
                f"(Server Version: {linkage.version}, Your Working Version: {payload.expected_version}). "
                f"Please refresh the workspace to review the latest changes before reapplying your decision."
            )
        )

    # Update decision attributes
    linkage.coordination_decision = payload.coordination_decision.upper().strip()
    linkage.lead_bureau = payload.lead_bureau.upper().strip() if payload.lead_bureau else linkage.lead_bureau
    linkage.lead_officer_id = payload.lead_officer_id or linkage.lead_officer_id
    linkage.coordination_notes = payload.coordination_notes or linkage.coordination_notes
    linkage.coordination_deadline = payload.coordination_deadline or linkage.coordination_deadline
    
    # Confirm relationship if pending review
    if linkage.status == "PENDING_REVIEW":
        linkage.status = "CONFIRMED_RELATED"

    linkage.verified_by_id = current_user.id
    linkage.reviewed_at = utc_now()
    linkage.version = (linkage.version or 1) + 1
    linkage.updated_at = utc_now()
    db.commit()
    db.refresh(linkage)

    # Immutable Audit Log Entry
    log_audit_event(
        db=db,
        action_type="COORDINATION_DECISION_RECORDED",
        description=(
            f"Cross-bureau coordination decision recorded: '{payload.coordination_decision}' "
            f"for complaints {src.complaint_no} ({src.bureau}) and {tgt.complaint_no} ({tgt.bureau}). "
            f"Lead Bureau: {linkage.lead_bureau or 'Joint'}. Version: {linkage.version}."
        ),
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_bureau=current_user.bureau,
        complaint_id=src.id,
        institution_id=src.institution_id,
        commit=True
    )

    # Notify counterpart bureau head
    other_bureau = tgt.bureau if current_user.bureau == src.bureau else src.bureau
    notif = Notification(
        target_bureau=other_bureau,
        complaint_id=src.id,
        institution_id=src.institution_id,
        alert_type="COORDINATION_DECISION",
        title=f"Coordination Decision: {payload.coordination_decision}",
        message=(
            f"{current_user.full_name} ({current_user.bureau}) recorded coordination decision '{payload.coordination_decision}' "
            f"on linked cases {src.complaint_no} and {tgt.complaint_no}."
        ),
        delivery_channel="IN_APP",
        delivery_status="DELIVERED"
    )
    db.add(notif)
    db.commit()

    return get_coordination_workspace_detail(db, linkage_id, current_user)

def unlink_coordination_cases(
    db: Session,
    linkage_id: int,
    payload: CoordinationUnlinkRequest,
    current_user: User
) -> CoordinationWorkspaceDetailOut:
    """
    Allows authorized users to unlink cases according to defined permissions and retention rules.
    Retains independent case histories and preserves an auditable unlink tombstone.
    """
    linkage = db.query(CaseLinkage).filter(CaseLinkage.id == linkage_id).first()
    if not linkage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coordination workspace not found.")

    src = db.query(Complaint).filter(Complaint.id == linkage.source_complaint_id).first()
    tgt = db.query(Complaint).filter(Complaint.id == linkage.target_complaint_id).first()
    if not src or not tgt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated complaints not found.")

    check_bureau_coordination_access(current_user, src.bureau, tgt.bureau)

    if payload.expected_version is not None and linkage.version != payload.expected_version:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Concurrent edit conflict: Linkage has been modified by another officer. Refresh before unlinking."
        )

    linkage.is_active = False
    linkage.status = "NOT_RELATED"
    linkage.unlinked_at = utc_now()
    linkage.unlinked_by_id = current_user.id
    linkage.unlink_reason = payload.unlink_reason
    linkage.version = (linkage.version or 1) + 1
    linkage.updated_at = utc_now()
    db.commit()
    db.refresh(linkage)

    log_audit_event(
        db=db,
        action_type="CASES_UNLINKED",
        description=(
            f"Complaints {src.complaint_no} and {tgt.complaint_no} unlinked by {current_user.full_name} ({current_user.bureau}). "
            f"Reason: {payload.unlink_reason}. Retention history preserved."
        ),
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_bureau=current_user.bureau,
        complaint_id=src.id,
        institution_id=src.institution_id,
        commit=True
    )

    return get_coordination_workspace_detail(db, linkage_id, current_user)

def create_coordination_follow_up_task(
    db: Session,
    linkage_id: int,
    payload: CoordinationTaskCreate,
    current_user: User
) -> CoordinationTaskOut:
    """
    Creates an inter-bureau follow-up task with defined deadline, priority, and assigned officer.
    """
    linkage = db.query(CaseLinkage).filter(CaseLinkage.id == linkage_id).first()
    if not linkage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coordination workspace not found.")

    src = db.query(Complaint).filter(Complaint.id == linkage.source_complaint_id).first()
    tgt = db.query(Complaint).filter(Complaint.id == linkage.target_complaint_id).first()
    if not src or not tgt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated complaints not found.")

    check_bureau_coordination_access(current_user, src.bureau, tgt.bureau)

    if payload.complaint_id and payload.complaint_id not in (src.id, tgt.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Follow-up task must be linked to either the source or target complaint of this workspace."
        )

    task_complaint_id = payload.complaint_id or src.id
    target_bureau = payload.target_bureau or linkage.lead_bureau or current_user.bureau

    task = FollowUpTask(
        linkage_id=linkage.id,
        complaint_id=task_complaint_id,
        title=payload.title,
        description=payload.description,
        assigned_to_id=payload.assigned_to_id,
        target_bureau=target_bureau,
        created_by_id=current_user.id,
        deadline=payload.deadline,
        status="PENDING",
        priority=payload.priority.upper().strip()
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    assigned_user = db.query(User).filter(User.id == task.assigned_to_id).first() if task.assigned_to_id else None

    log_audit_event(
        db=db,
        action_type="FOLLOW_UP_TASK_CREATED",
        description=(
            f"Follow-up task '{task.title}' created in coordination workspace {linkage.id} "
            f"assigned to {assigned_user.full_name if assigned_user else target_bureau} with deadline {task.deadline.strftime('%Y-%m-%d')}."
        ),
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_bureau=current_user.bureau,
        complaint_id=task_complaint_id,
        commit=True
    )

    now = utc_now()
    now_dt = datetime.fromisoformat(now.isoformat()) if hasattr(now, "isoformat") else now

    return CoordinationTaskOut(
        id=task.id,
        linkage_id=task.linkage_id,
        complaint_id=task.complaint_id,
        complaint_no=src.complaint_no if task.complaint_id == src.id else tgt.complaint_no,
        title=task.title,
        description=task.description,
        assigned_to_id=task.assigned_to_id,
        assigned_to_name=assigned_user.full_name if assigned_user else None,
        target_bureau=task.target_bureau,
        created_by_id=task.created_by_id,
        created_by_name=current_user.full_name,
        deadline=task.deadline,
        status=task.status,
        priority=task.priority,
        is_overdue=task.deadline < now_dt,
        completed_at=task.completed_at,
        completion_notes=task.completion_notes,
        created_at=task.created_at
    )

def update_coordination_task(
    db: Session,
    task_id: int,
    payload: CoordinationTaskUpdate,
    current_user: User
) -> CoordinationTaskOut:
    """
    Updates status, completion remarks, or deadline for a coordination follow-up task.
    """
    task = db.query(FollowUpTask).filter(FollowUpTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Follow-up task not found.")

    if task.linkage_id:
        linkage = db.query(CaseLinkage).filter(CaseLinkage.id == task.linkage_id).first()
        if linkage:
            src = db.query(Complaint).filter(Complaint.id == linkage.source_complaint_id).first()
            tgt = db.query(Complaint).filter(Complaint.id == linkage.target_complaint_id).first()
            if src and tgt:
                check_bureau_coordination_access(current_user, src.bureau, tgt.bureau)

    if payload.status:
        task.status = payload.status.upper().strip()
        if task.status == "COMPLETED":
            task.completed_at = utc_now()

    if payload.completion_notes:
        task.completion_notes = payload.completion_notes
    if payload.deadline:
        task.deadline = payload.deadline
    if payload.priority:
        task.priority = payload.priority.upper().strip()
    if payload.assigned_to_id:
        task.assigned_to_id = payload.assigned_to_id

    task.updated_at = utc_now()
    db.commit()
    db.refresh(task)

    assigned_user = db.query(User).filter(User.id == task.assigned_to_id).first() if task.assigned_to_id else None
    created_user = db.query(User).filter(User.id == task.created_by_id).first() if task.created_by_id else None

    log_audit_event(
        db=db,
        action_type="FOLLOW_UP_TASK_UPDATED",
        description=f"Task #{task.id} '{task.title}' updated to status '{task.status}'. Notes: {task.completion_notes or 'None'}",
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_bureau=current_user.bureau,
        complaint_id=task.complaint_id,
        commit=True
    )

    now = utc_now()
    now_dt = datetime.fromisoformat(now.isoformat()) if hasattr(now, "isoformat") else now

    return CoordinationTaskOut(
        id=task.id,
        linkage_id=task.linkage_id,
        complaint_id=task.complaint_id,
        complaint_no=None,
        title=task.title,
        description=task.description,
        assigned_to_id=task.assigned_to_id,
        assigned_to_name=assigned_user.full_name if assigned_user else None,
        target_bureau=task.target_bureau,
        created_by_id=task.created_by_id,
        created_by_name=created_user.full_name if created_user else None,
        deadline=task.deadline,
        status=task.status,
        priority=task.priority,
        is_overdue=task.deadline < now_dt and task.status != "COMPLETED",
        completed_at=task.completed_at,
        completion_notes=task.completion_notes,
        created_at=task.created_at
    )

def get_outstanding_coordination_tasks(
    db: Session,
    current_user: User,
    bureau_filter: Optional[str] = None,
    overdue_only: bool = False
) -> List[CoordinationTaskOut]:
    """
    Queries all outstanding coordination tasks and overdue follow-up actions
    respecting bureau authorization scopes.
    """
    role = normalize_role(current_user.role)
    query = db.query(FollowUpTask).filter(
        FollowUpTask.status.in_(["PENDING", "IN_PROGRESS", "OVERDUE"])
    ).order_by(FollowUpTask.deadline.asc())

    if bureau_filter:
        query = query.filter(FollowUpTask.target_bureau == bureau_filter.upper().strip())

    tasks = query.all()
    now = utc_now()
    now_dt = datetime.fromisoformat(now.isoformat()) if hasattr(now, "isoformat") else now
    results: List[CoordinationTaskOut] = []

    for t in tasks:
        # Bureau scoping
        if role not in ("SUPER_ADMIN", "AUDITOR"):
            if t.target_bureau and t.target_bureau != current_user.bureau:
                # Also check complaint bureau
                c = db.query(Complaint).filter(Complaint.id == t.complaint_id).first() if t.complaint_id else None
                if not c or c.bureau != current_user.bureau:
                    continue

        is_ovd = t.deadline < now_dt
        if overdue_only and not is_ovd:
            continue

        assigned_user = db.query(User).filter(User.id == t.assigned_to_id).first() if t.assigned_to_id else None
        created_user = db.query(User).filter(User.id == t.created_by_id).first() if t.created_by_id else None
        c_obj = db.query(Complaint).filter(Complaint.id == t.complaint_id).first() if t.complaint_id else None

        results.append(
            CoordinationTaskOut(
                id=t.id,
                linkage_id=t.linkage_id,
                complaint_id=t.complaint_id,
                complaint_no=c_obj.complaint_no if c_obj else None,
                title=t.title,
                description=t.description,
                assigned_to_id=t.assigned_to_id,
                assigned_to_name=assigned_user.full_name if assigned_user else None,
                target_bureau=t.target_bureau,
                created_by_id=t.created_by_id,
                created_by_name=created_user.full_name if created_user else None,
                deadline=t.deadline,
                status="OVERDUE" if is_ovd else t.status,
                priority=t.priority,
                is_overdue=is_ovd,
                completed_at=t.completed_at,
                completion_notes=t.completion_notes,
                created_at=t.created_at
            )
        )

    return results
