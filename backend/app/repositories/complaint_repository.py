from typing import Optional, List, Tuple
from datetime import timedelta
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.models.complaint import Complaint
from backend.app.models.case_status_history import CaseStatusHistory
from backend.app.models.case_assignment_history import CaseAssignmentHistory
from backend.app.repositories.base import BaseRepository
from backend.app.core.datetime_util import utc_now

class ComplaintRepository(BaseRepository[Complaint]):
    def __init__(self, db: Session):
        super().__init__(Complaint, db)

    def get_by_complaint_no(self, complaint_no: str) -> Optional[Complaint]:
        return self.db.query(Complaint).filter(
            Complaint.complaint_no == complaint_no.strip(),
            Complaint.is_deleted == False
        ).first()

    def get_active_by_id(self, complaint_id: int) -> Optional[Complaint]:
        return self.db.query(Complaint).filter(
            Complaint.id == complaint_id,
            Complaint.is_deleted == False
        ).first()

    def create_with_history(
        self,
        complaint: Complaint,
        created_by_id: Optional[int] = None
    ) -> Complaint:
        """Atomically persists complaint along with initial status and assignment history."""
        # Calculate SLA due date if not set
        if not complaint.sla_due_date:
            complaint.sla_due_date = utc_now() + timedelta(days=complaint.sla_deadline_days or 30)

        self.db.add(complaint)
        self.db.flush()

        # 1. Immutable initial status history
        initial_status = CaseStatusHistory(
            complaint_id=complaint.id,
            from_status=None,
            to_status=complaint.status,
            action_taken="LODGED",
            changed_by_id=created_by_id,
            remarks=f"Complaint lodged under category {complaint.category} for {complaint.bureau}.",
            created_at=utc_now()
        )
        self.db.add(initial_status)

        # 2. Immutable initial assignment history if assigned
        if complaint.assigned_officer_id:
            initial_assignment = CaseAssignmentHistory(
                complaint_id=complaint.id,
                assigned_officer_id=complaint.assigned_officer_id,
                previous_officer_id=None,
                assigned_by_id=created_by_id,
                bureau=complaint.bureau,
                assignment_notes="Initial case assignment upon registration.",
                is_current=True,
                created_at=utc_now()
            )
            self.db.add(initial_assignment)

        self.db.flush()
        return complaint

    def update_status_with_history(
        self,
        complaint: Complaint,
        new_status: str,
        action_taken: str,
        changed_by_id: Optional[int],
        remarks: Optional[str] = None,
        resolution_summary: Optional[str] = None
    ) -> Complaint:
        """Atomically transitions case status and appends immutable audit entry."""
        old_status = complaint.status
        complaint.status = new_status
        complaint.updated_at = utc_now()

        if resolution_summary:
            complaint.resolution_summary = resolution_summary

        if new_status in ("RESOLVED", "DISPOSED") and not complaint.disposed_at:
            complaint.disposed_at = utc_now()

        history_entry = CaseStatusHistory(
            complaint_id=complaint.id,
            from_status=old_status,
            to_status=new_status,
            action_taken=action_taken,
            changed_by_id=changed_by_id,
            remarks=remarks or f"Status transitioned from {old_status} to {new_status}.",
            created_at=utc_now()
        )
        self.db.add(history_entry)
        self.db.flush()
        return complaint

    def assign_officer_with_history(
        self,
        complaint: Complaint,
        officer_id: int,
        officer_name: str,
        assigned_by_id: Optional[int],
        notes: Optional[str] = None
    ) -> Complaint:
        """Atomically updates case officer and rotates assignment history records."""
        prev_officer_id = complaint.assigned_officer_id

        # Mark previous assignments as not current
        self.db.query(CaseAssignmentHistory).filter(
            CaseAssignmentHistory.complaint_id == complaint.id,
            CaseAssignmentHistory.is_current == True
        ).update({"is_current": False})

        complaint.assigned_officer_id = officer_id
        complaint.assigned_officer_name = officer_name
        complaint.updated_at = utc_now()

        new_assignment = CaseAssignmentHistory(
            complaint_id=complaint.id,
            assigned_officer_id=officer_id,
            previous_officer_id=prev_officer_id,
            assigned_by_id=assigned_by_id,
            bureau=complaint.bureau,
            assignment_notes=notes or f"Case assigned to {officer_name}.",
            is_current=True,
            created_at=utc_now()
        )
        self.db.add(new_assignment)
        self.db.flush()
        return complaint

    def soft_delete(self, complaint: Complaint) -> None:
        complaint.is_deleted = True
        complaint.updated_at = utc_now()
        self.db.flush()
