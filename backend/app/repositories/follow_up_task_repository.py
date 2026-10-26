from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.models.follow_up_task import FollowUpTask
from backend.app.repositories.base import BaseRepository
from backend.app.core.datetime_util import utc_now

class FollowUpTaskRepository(BaseRepository[FollowUpTask]):
    def __init__(self, db: Session):
        super().__init__(FollowUpTask, db)

    def get_by_complaint(self, complaint_id: int) -> List[FollowUpTask]:
        return self.db.query(FollowUpTask).filter(
            FollowUpTask.complaint_id == complaint_id
        ).order_by(FollowUpTask.deadline.asc()).all()

    def get_overdue_tasks(self, as_of: Optional[datetime] = None) -> List[FollowUpTask]:
        target_time = as_of or utc_now()
        return self.db.query(FollowUpTask).filter(
            FollowUpTask.status.in_(["PENDING", "IN_PROGRESS"]),
            FollowUpTask.deadline < target_time
        ).all()

    def complete_task(
        self,
        task_id: int,
        completion_notes: Optional[str] = None
    ) -> Optional[FollowUpTask]:
        task = self.get_by_id(task_id)
        if not task:
            return None
        task.status = "COMPLETED"
        task.completed_at = utc_now()
        task.completion_notes = completion_notes
        task.updated_at = utc_now()
        self.db.flush()
        return task
