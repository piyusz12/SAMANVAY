"""
Unified Case Activity Timeline Service
Aggregates chronological actions across status history, assignment history,
inter-bureau movements, evidence attachments, follow-up tasks, and audit logs.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.models.complaint import Complaint
from backend.app.models.case_status_history import CaseStatusHistory
from backend.app.models.case_assignment_history import CaseAssignmentHistory
from backend.app.models.case_movement import CaseMovement
from backend.app.models.evidence_attachment import EvidenceAttachment
from backend.app.models.follow_up_task import FollowUpTask
from backend.app.models.audit_log import AuditLog

def compile_case_timeline(db: Session, complaint_id: int) -> List[Dict[str, Any]]:
    """
    Compiles a comprehensive chronological activity timeline for a complaint.
    Returns events ordered newest first (descending timestamp).
    """
    events: List[Dict[str, Any]] = []

    # 1. Status History Events
    status_histories = db.query(CaseStatusHistory).filter(
        CaseStatusHistory.complaint_id == complaint_id
    ).all()
    for sh in status_histories:
        actor_name = sh.changed_by.full_name if sh.changed_by else "System"
        actor_role = sh.changed_by.role if sh.changed_by else "SYSTEM"
        actor_bureau = sh.changed_by.bureau if sh.changed_by else None
        
        events.append({
            "id": f"status_{sh.id}",
            "event_type": "STATUS_CHANGE",
            "timestamp": sh.created_at,
            "title": f"Status: {sh.to_status.replace('_', ' ')}",
            "description": sh.remarks or f"Transitioned from {sh.from_status or 'N/A'} to {sh.to_status}.",
            "action_taken": sh.action_taken,
            "actor_name": actor_name,
            "actor_role": actor_role,
            "actor_bureau": actor_bureau,
            "metadata": {
                "from_status": sh.from_status,
                "to_status": sh.to_status,
                "history_id": sh.id
            }
        })

    # 2. Assignment & Reassignment Events
    assignments = db.query(CaseAssignmentHistory).filter(
        CaseAssignmentHistory.complaint_id == complaint_id
    ).all()
    for ah in assignments:
        assigned_to_name = ah.assigned_officer.full_name if ah.assigned_officer else "Unassigned"
        previous_name = ah.previous_officer.full_name if ah.previous_officer else None
        assigned_by_name = ah.assigned_by.full_name if ah.assigned_by else "Administrator"
        assigned_by_role = ah.assigned_by.role if ah.assigned_by else "ADMIN"
        assigned_by_bureau = ah.assigned_by.bureau if ah.assigned_by else ah.bureau

        is_reassign = previous_name is not None
        title = f"Case Reassigned to {assigned_to_name}" if is_reassign else f"Officer Assigned: {assigned_to_name}"

        events.append({
            "id": f"assign_{ah.id}",
            "event_type": "ASSIGNMENT",
            "timestamp": ah.created_at,
            "title": title,
            "description": ah.assignment_notes or f"Assigned by {assigned_by_name}.",
            "action_taken": "REASSIGNMENT" if is_reassign else "INITIAL_ASSIGNMENT",
            "actor_name": assigned_by_name,
            "actor_role": assigned_by_role,
            "actor_bureau": assigned_by_bureau,
            "metadata": {
                "assigned_officer_id": ah.assigned_officer_id,
                "assigned_officer_name": assigned_to_name,
                "previous_officer_id": ah.previous_officer_id,
                "previous_officer_name": previous_name,
                "is_current": ah.is_current,
                "bureau": ah.bureau
            }
        })

    # 3. Inter-Bureau Movement Events
    movements = db.query(CaseMovement).filter(
        CaseMovement.complaint_id == complaint_id
    ).all()
    for mv in movements:
        req_by_name = mv.requested_by.full_name if mv.requested_by else "Bureau Officer"
        req_by_role = mv.requested_by.role if mv.requested_by else "OFFICER"
        req_by_bureau = mv.requested_by.bureau if mv.requested_by else mv.from_bureau

        events.append({
            "id": f"mov_req_{mv.id}",
            "event_type": "MOVEMENT_REQUESTED",
            "timestamp": mv.created_at,
            "title": f"Transfer Requested: {mv.from_bureau.replace('_', ' ')} → {mv.to_bureau.replace('_', ' ')}",
            "description": f"Reason: {mv.reason}",
            "action_taken": mv.movement_type,
            "actor_name": req_by_name,
            "actor_role": req_by_role,
            "actor_bureau": req_by_bureau,
            "metadata": {
                "from_bureau": mv.from_bureau,
                "to_bureau": mv.to_bureau,
                "movement_status": mv.status,
                "movement_id": mv.id
            }
        })

        if mv.decided_at:
            dec_by_name = mv.decided_by.full_name if mv.decided_by else "Bureau Head"
            dec_by_role = mv.decided_by.role if mv.decided_by else "BUREAU_ADMIN"
            dec_by_bureau = mv.decided_by.bureau if mv.decided_by else mv.to_bureau

            events.append({
                "id": f"mov_dec_{mv.id}",
                "event_type": f"MOVEMENT_{mv.status}",
                "timestamp": mv.decided_at,
                "title": f"Transfer {mv.status.title()}: {mv.to_bureau.replace('_', ' ')}",
                "description": mv.decision_notes or f"Decision rendered by {dec_by_name}.",
                "action_taken": f"TRANSFER_{mv.status}",
                "actor_name": dec_by_name,
                "actor_role": dec_by_role,
                "actor_bureau": dec_by_bureau,
                "metadata": {
                    "decision": mv.status,
                    "from_bureau": mv.from_bureau,
                    "to_bureau": mv.to_bureau,
                    "decision_notes": mv.decision_notes,
                    "movement_id": mv.id
                }
            })

    # 4. Evidence Attachment Events
    attachments = db.query(EvidenceAttachment).filter(
        EvidenceAttachment.complaint_id == complaint_id
    ).all()
    for att in attachments:
        uploader_name = att.uploaded_by.full_name if att.uploaded_by else "Authorized Officer"
        uploader_role = att.uploaded_by.role if att.uploaded_by else "OFFICER"
        uploader_bureau = att.uploaded_by.bureau if att.uploaded_by else "AICTE"

        events.append({
            "id": f"att_{att.id}",
            "event_type": "EVIDENCE_UPLOAD",
            "timestamp": att.created_at,
            "title": f"Evidence Attached: {att.original_file_name}",
            "description": f"File size: {round(att.file_size_bytes / 1024, 1)} KB • SHA256: {att.sha256_checksum[:12]}...",
            "action_taken": "EVIDENCE_ATTACHED",
            "actor_name": uploader_name,
            "actor_role": uploader_role,
            "actor_bureau": uploader_bureau,
            "metadata": {
                "file_name": att.file_name,
                "original_name": att.original_file_name,
                "mime_type": att.mime_type,
                "attachment_id": att.id
            }
        })

    # 5. Follow-Up Task Events
    tasks = db.query(FollowUpTask).filter(
        FollowUpTask.complaint_id == complaint_id
    ).all()
    for t in tasks:
        creator_name = t.assigned_to.full_name if t.assigned_to else "Officer"
        events.append({
            "id": f"task_{t.id}",
            "event_type": "TASK_CREATED",
            "timestamp": t.created_at,
            "title": f"Follow-Up Task: {t.title}",
            "description": t.description or f"Deadline: {t.deadline.strftime('%Y-%m-%d') if t.deadline else 'None'}",
            "action_taken": "TASK_ASSIGNED",
            "actor_name": creator_name,
            "actor_role": "TASK_OWNER",
            "actor_bureau": "BUREAU",
            "metadata": {
                "task_id": t.id,
                "status": t.status,
                "is_overdue": t.status == "OVERDUE" or (t.deadline and t.deadline < utc_now() and t.status not in ("COMPLETED", "CANCELLED"))
            }
        })

    # Sort all events chronologically (descending timestamp, newest first)
    events.sort(key=lambda x: x["timestamp"], reverse=True)

    return events
