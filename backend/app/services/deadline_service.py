import json
import logging
from datetime import datetime, timedelta, date
from typing import Dict, Any, List, Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc

from backend.app.core.datetime_util import utc_now, format_ist
from backend.app.models.complaint import Complaint
from backend.app.models.institution import Institution
from backend.app.models.case_linkage import CaseLinkage
from backend.app.models.follow_up_task import FollowUpTask
from backend.app.models.case_status_history import CaseStatusHistory
from backend.app.models.audit_log import AuditLog
from backend.app.models.notification import Notification, NotificationDeliveryAttempt
from backend.app.models.system_config import SystemConfig
from backend.app.models.user import User
from backend.app.services.email_service import (
    get_email_provider,
    BaseEmailProvider,
    render_aicte_email_template
)
from backend.app.schemas.notification import AlertConfigOut, AlertConfigUpdate, SchedulerRunResult

logger = logging.getLogger("samanvay.deadlines")

# Default demonstration alert configuration
DEFAULT_CONFIG = {
    "reminder_intervals_days": [5, 3, 1],
    "overdue_reminder_frequency_days": 2,
    "unresolved_overlap_threshold_days": 5,
    "overdue_task_threshold_days": 1,
    "escalation_level_1_days_before": 3,
    "escalation_level_2_days_overdue": 1,
    "escalation_level_3_days_overdue": 7,
    "critical_priority_escalation_days": 2,
    "email_delivery_enabled": True,
    "email_provider_type": "MOCK"
}

def get_alert_config(db: Session) -> Dict[str, Any]:
    """Retrieves dynamic alert & deadline configuration, falling back to defaults."""
    cfg = dict(DEFAULT_CONFIG)
    try:
        rows = db.query(SystemConfig).filter(SystemConfig.category == "SLA").all()
        for r in rows:
            if r.config_key in cfg:
                if r.value_type == "JSON":
                    cfg[r.config_key] = json.loads(r.config_value)
                elif r.value_type == "INTEGER":
                    cfg[r.config_key] = int(r.config_value)
                elif r.value_type == "BOOLEAN":
                    cfg[r.config_key] = r.config_value.lower() in ("true", "1")
                else:
                    cfg[r.config_key] = r.config_value
    except Exception as e:
        logger.warning(f"Could not load dynamic system config from DB: {e}. Using defaults.")
    return cfg

def update_alert_config(db: Session, updates: AlertConfigUpdate, user_id: Optional[int] = None) -> Dict[str, Any]:
    """Persists updated deadline and escalation configuration to SystemConfig table."""
    now = utc_now()
    fields = updates.model_dump(exclude_unset=True)
    
    for key, val in fields.items():
        if val is None:
            continue
        v_type = "JSON" if isinstance(val, (list, dict)) else "INTEGER" if isinstance(val, int) else "BOOLEAN" if isinstance(val, bool) else "STRING"
        v_str = json.dumps(val) if isinstance(val, (list, dict)) else str(val)
        
        row = db.query(SystemConfig).filter(SystemConfig.config_key == key).first()
        if not row:
            row = SystemConfig(
                config_key=key,
                config_value=v_str,
                value_type=v_type,
                category="SLA",
                description=f"Configured deadline parameter {key}",
                is_editable=True,
                updated_by_id=user_id,
                updated_at=now
            )
            db.add(row)
        else:
            row.config_value = v_str
            row.value_type = v_type
            row.updated_by_id = user_id
            row.updated_at = now

    db.commit()
    return get_alert_config(db)


def create_durable_notification(
    db: Session,
    title: str,
    message: str,
    alert_type: str,
    severity: str,
    idempotency_key: str,
    user_id: Optional[int] = None,
    target_bureau: Optional[str] = None,
    target_role: Optional[str] = None,
    complaint_id: Optional[int] = None,
    institution_id: Optional[int] = None,
    follow_up_task_id: Optional[int] = None,
    linkage_id: Optional[int] = None,
    escalation_level: int = 0,
    current_time: Optional[datetime] = None,
    email_provider: Optional[BaseEmailProvider] = None,
    email_delivery_enabled: bool = True
) -> Optional[Notification]:
    """
    Creates an immutable, durable notification record with idempotency enforcement.
    Optionally dispatches email delivery and records the delivery attempt history.
    """
    now = current_time or utc_now()

    # 1. Idempotency Check: Prevent duplicate notifications
    existing = db.query(Notification).filter(Notification.idempotency_key == idempotency_key).first()
    if existing:
        logger.debug(f"Duplicate notification skipped for idempotency_key='{idempotency_key}'")
        return None

    # 2. Persist In-App Notification
    notif = Notification(
        user_id=user_id,
        target_bureau=target_bureau,
        target_role=target_role,
        complaint_id=complaint_id,
        institution_id=institution_id,
        follow_up_task_id=follow_up_task_id,
        linkage_id=linkage_id,
        alert_type=alert_type,
        severity=severity,
        title=title,
        message=message,
        delivery_channel="IN_APP",
        delivery_status="DELIVERED",
        is_read=False,
        escalation_level=escalation_level,
        idempotency_key=idempotency_key,
        created_at=now
    )
    db.add(notif)
    db.flush()

    # Record In-App Delivery Attempt
    in_app_attempt = NotificationDeliveryAttempt(
        notification_id=notif.id,
        channel="IN_APP",
        attempt_number=1,
        status="SUCCESS",
        recipient=f"user_id={user_id}" if user_id else f"bureau={target_bureau}",
        error_message=None,
        attempted_at=now
    )
    db.add(in_app_attempt)

    # 3. Handle Email Delivery if enabled
    if email_delivery_enabled:
        provider = email_provider or get_email_provider()
        recipient_emails: List[str] = []

        if user_id:
            u = db.query(User).filter(User.id == user_id).first()
            if u and u.email:
                recipient_emails.append(u.email)
        elif target_bureau:
            # Query bureau officers / head
            users = db.query(User).filter(
                User.bureau == target_bureau,
                User.is_active == True
            ).all()
            for u in users:
                if u.email and u.email not in recipient_emails:
                    recipient_emails.append(u.email)

        if not recipient_emails and notif.complaint_id:
            # Fallback to central admin for escalations
            c_admin = db.query(User).filter(User.role == "SUPER_ADMIN").first()
            if c_admin and c_admin.email:
                recipient_emails.append(c_admin.email)

        # Lookup complaint reference if available
        c_no = None
        if complaint_id:
            comp = db.query(Complaint).filter(Complaint.id == complaint_id).first()
            if comp:
                c_no = comp.complaint_no

        ist_str = format_ist(now)
        text_body, html_body = render_aicte_email_template(
            title=title,
            message=message,
            complaint_no=c_no,
            severity=severity,
            ist_time_str=ist_str
        )

        overall_email_success = True
        for email in recipient_emails:
            success, err_msg = provider.send_email(
                to_email=email,
                subject=f"[AICTE SAMANVAY {severity}] {title}",
                text_body=text_body,
                html_body=html_body
            )

            email_attempt = NotificationDeliveryAttempt(
                notification_id=notif.id,
                channel="EMAIL",
                attempt_number=1,
                status="SUCCESS" if success else "FAILED",
                recipient=email,
                error_message=err_msg,
                attempted_at=now
            )
            db.add(email_attempt)
            if not success:
                overall_email_success = False

        if not overall_email_success and recipient_emails:
            notif.delivery_status = "FAILED"

    return notif


def check_upcoming_deadlines(
    db: Session,
    current_time: datetime,
    config: Dict[str, Any],
    email_provider: Optional[BaseEmailProvider] = None
) -> Tuple[int, List[str]]:
    """
    Identifies cases approaching their SLA due date within configured reminder intervals (e.g. 5, 3, 1 days).
    Dispatches warnings to the assigned officer and bureau.
    """
    intervals = config.get("reminder_intervals_days", [5, 3, 1])
    max_days = max(intervals) if intervals else 5
    email_enabled = config.get("email_delivery_enabled", True)

    date_key = current_time.strftime("%Y-%m-%d")
    alerts_created = 0
    logs = []

    # Active complaints not yet resolved or disposed
    window_end = current_time + timedelta(days=max_days + 1)
    upcoming_cases = db.query(Complaint).filter(
        Complaint.is_deleted == False,
        Complaint.status.notin_(["RESOLVED", "DISPOSED"]),
        Complaint.sla_due_date != None,
        Complaint.sla_due_date > current_time,
        Complaint.sla_due_date <= window_end
    ).all()

    for c in upcoming_cases:
        diff = c.sla_due_date - current_time
        days_left = diff.days + (1 if diff.seconds > 0 else 0)

        for interval in intervals:
            # Check if case falls into this reminder bucket
            if days_left == interval:
                idempotency_key = f"UPCOMING:{c.id}:{interval}D:{date_key}"
                severity = "WARNING" if interval <= 2 else "INFO"
                due_ist = format_ist(c.sla_due_date)

                title = f"Upcoming SLA Deadline: {c.complaint_no} ({interval} day{'s' if interval > 1 else ''} left)"
                message = (
                    f"Case {c.complaint_no} ('{c.subject}') has an SLA deadline in {interval} day{'s' if interval > 1 else ''} "
                    f"on {due_ist}. Assigned Officer: {c.assigned_officer_name or 'Unassigned'}. "
                    f"Please expedite inquiry and evidence review to prevent regulatory breach."
                )

                notif = create_durable_notification(
                    db=db,
                    title=title,
                    message=message,
                    alert_type="UPCOMING_DEADLINE",
                    severity=severity,
                    idempotency_key=idempotency_key,
                    user_id=c.assigned_officer_id,
                    target_bureau=c.bureau,
                    complaint_id=c.id,
                    institution_id=c.institution_id,
                    escalation_level=1 if interval <= config.get("escalation_level_1_days_before", 3) else 0,
                    current_time=current_time,
                    email_provider=email_provider,
                    email_delivery_enabled=email_enabled
                )
                if notif:
                    alerts_created += 1
                    logs.append(f"Upcoming deadline alert created for {c.complaint_no} ({interval} days left)")

    return alerts_created, logs


def check_overdue_cases_and_escalate(
    db: Session,
    current_time: datetime,
    config: Dict[str, Any],
    email_provider: Optional[BaseEmailProvider] = None
) -> Tuple[int, int, List[str]]:
    """
    Identifies overdue cases past their SLA deadline.
    Applies multi-tiered escalation rules by status, priority, and bureau.
    Automatically transitions cases to 'ESCALATED' when thresholds are breached.
    """
    date_key = current_time.strftime("%Y-%m-%d")
    email_enabled = config.get("email_delivery_enabled", True)
    l2_overdue_days = config.get("escalation_level_2_days_overdue", 1)
    l3_overdue_days = config.get("escalation_level_3_days_overdue", 7)
    crit_escalation_days = config.get("critical_priority_escalation_days", 2)

    alerts_created = 0
    escalations_triggered = 0
    logs = []

    overdue_cases = db.query(Complaint).filter(
        Complaint.is_deleted == False,
        Complaint.status.notin_(["RESOLVED", "DISPOSED"]),
        Complaint.sla_due_date != None,
        Complaint.sla_due_date < current_time
    ).all()

    for c in overdue_cases:
        overdue_diff = current_time - c.sla_due_date
        days_overdue = overdue_diff.days

        # Check for Level 3 Critical Escalation
        is_critical_case = c.priority == "CRITICAL" or c.category == "RAGGING_HARASSMENT"
        trigger_l3 = (is_critical_case and days_overdue >= crit_escalation_days) or (days_overdue >= l3_overdue_days)

        if trigger_l3:
            # 1. State Machine Transition to ESCALATED if not already escalated
            old_status = c.status
            if c.status != "ESCALATED":
                c.status = "ESCALATED"
                c.updated_at = current_time
                escalations_triggered += 1

                # Record in CaseStatusHistory
                status_history = CaseStatusHistory(
                    complaint_id=c.id,
                    from_status=old_status,
                    to_status="ESCALATED",
                    action_taken="SLA_BREACH_ESCALATION",
                    remarks=(
                        f"Automated regulatory escalation triggered after {days_overdue} days overdue. "
                        f"SLA target due date was {format_ist(c.sla_due_date)}."
                    ),
                    created_at=current_time
                )
                db.add(status_history)

                # Record in AuditLog
                audit = AuditLog(
                    complaint_id=c.id,
                    institution_id=c.institution_id,
                    actor_name="System Deadline Worker [AUTOMATED]",
                    actor_role="SYSTEM_DAEMON",
                    actor_bureau="CENTRAL_ADMIN",
                    action_type="CASE_ESCALATED",
                    description=f"Case {c.complaint_no} escalated automatically due to {days_overdue} days SLA breach.",
                    previous_state=old_status,
                    new_state="ESCALATED",
                    timestamp=current_time
                )
                db.add(audit)
                logs.append(f"Auto-escalated {c.complaint_no} from {old_status} to ESCALATED ({days_overdue}d overdue)")

            # 2. Dispatch Level 3 Alert to Central Administration and Bureau Head
            idempotency_key = f"OVERDUE_L3:{c.id}:{date_key}"
            title = f"CRITICAL REGULATORY ESCALATION: Case {c.complaint_no} ({days_overdue} days overdue)"
            message = (
                f"Case {c.complaint_no} ('{c.subject}') handled by {c.bureau.replace('_', ' ')} is now {days_overdue} days overdue. "
                f"SLA target deadline was {format_ist(c.sla_due_date)}. Case status has been escalated to AICTE Central Administration. "
                f"Immediate intervention and council show-cause review required."
            )

            notif = create_durable_notification(
                db=db,
                title=title,
                message=message,
                alert_type="ESCALATION_TRIGGERED",
                severity="CRITICAL",
                idempotency_key=idempotency_key,
                target_bureau=c.bureau,
                complaint_id=c.id,
                institution_id=c.institution_id,
                escalation_level=3,
                current_time=current_time,
                email_provider=email_provider,
                email_delivery_enabled=email_enabled
            )
            if notif:
                alerts_created += 1
                logs.append(f"Level 3 Critical Escalation alert dispatched for {c.complaint_no}")

        elif days_overdue >= l2_overdue_days:
            # Level 2 Warning to Bureau Head
            idempotency_key = f"OVERDUE_L2:{c.id}:{date_key}"
            title = f"SLA Breach Notice: Case {c.complaint_no} ({days_overdue} day{'s' if days_overdue > 1 else ''} overdue)"
            message = (
                f"Case {c.complaint_no} ('{c.subject}') in {c.bureau.replace('_', ' ')} has breached its SLA deadline "
                f"({format_ist(c.sla_due_date)}) and is now {days_overdue} day{'s' if days_overdue > 1 else ''} overdue. "
                f"Assigned Officer: {c.assigned_officer_name or 'Unassigned'}. Bureau Administrator attention required."
            )

            notif = create_durable_notification(
                db=db,
                title=title,
                message=message,
                alert_type="SLA_BREACH",
                severity="WARNING",
                idempotency_key=idempotency_key,
                user_id=c.assigned_officer_id,
                target_bureau=c.bureau,
                complaint_id=c.id,
                institution_id=c.institution_id,
                escalation_level=2,
                current_time=current_time,
                email_provider=email_provider,
                email_delivery_enabled=email_enabled
            )
            if notif:
                alerts_created += 1
                logs.append(f"Level 2 Breach alert dispatched for {c.complaint_no} ({days_overdue}d overdue)")

    return alerts_created, escalations_triggered, logs


def check_unresolved_overlap_reviews(
    db: Session,
    current_time: datetime,
    config: Dict[str, Any],
    email_provider: Optional[BaseEmailProvider] = None
) -> Tuple[int, List[str]]:
    """
    Identifies unresolved cross-bureau overlap suggestions pending review beyond configured threshold.
    """
    threshold_days = config.get("unresolved_overlap_threshold_days", 5)
    cutoff = current_time - timedelta(days=threshold_days)
    date_key = current_time.strftime("%Y-%m-%d")
    email_enabled = config.get("email_delivery_enabled", True)

    alerts_created = 0
    logs = []

    pending_overlaps = db.query(CaseLinkage).filter(
        CaseLinkage.status == "PENDING_REVIEW",
        CaseLinkage.created_at <= cutoff
    ).all()

    for lk in pending_overlaps:
        days_pending = (current_time - lk.created_at).days
        idempotency_key = f"UNRESOLVED_OVERLAP:{lk.id}:{date_key}"

        comp_a = lk.source_complaint
        comp_b = lk.target_complaint
        ref_a = comp_a.complaint_no if comp_a else f"ID #{lk.source_complaint_id}"
        ref_b = comp_b.complaint_no if comp_b else f"ID #{lk.target_complaint_id}"

        title = f"Pending Overlap Review: {ref_a} & {ref_b} ({days_pending} days unresolved)"
        message = (
            f"Suggested cross-bureau linkage between {ref_a} ({comp_a.bureau if comp_a else 'N/A'}) "
            f"and {ref_b} ({comp_b.bureau if comp_b else 'N/A'}) has remained pending review for {days_pending} days. "
            f"Overlap score: {int(lk.similarity_score * 100)}%. Please review and confirm or dismiss in Case Coordination Workspace."
        )

        notif = create_durable_notification(
            db=db,
            title=title,
            message=message,
            alert_type="UNRESOLVED_OVERLAP",
            severity="WARNING",
            idempotency_key=idempotency_key,
            target_bureau=comp_a.bureau if comp_a else None,
            complaint_id=lk.source_complaint_id,
            linkage_id=lk.id,
            escalation_level=1,
            current_time=current_time,
            email_provider=email_provider,
            email_delivery_enabled=email_enabled
        )
        if notif:
            alerts_created += 1
            logs.append(f"Unresolved overlap alert created for linkage #{lk.id} ({days_pending}d pending)")

    return alerts_created, logs


def check_overdue_coordination_tasks(
    db: Session,
    current_time: datetime,
    config: Dict[str, Any],
    email_provider: Optional[BaseEmailProvider] = None
) -> Tuple[int, List[str]]:
    """
    Identifies overdue follow-up coordination tasks across bureaus.
    """
    date_key = current_time.strftime("%Y-%m-%d")
    email_enabled = config.get("email_delivery_enabled", True)

    alerts_created = 0
    logs = []

    overdue_tasks = db.query(FollowUpTask).filter(
        FollowUpTask.status.notin_(["COMPLETED", "CANCELLED"]),
        FollowUpTask.deadline != None,
        FollowUpTask.deadline < current_time
    ).all()

    for task in overdue_tasks:
        days_overdue = (current_time - task.deadline).days
        idempotency_key = f"OVERDUE_TASK:{task.id}:{date_key}"

        bureau_name = task.target_bureau or "Responsible Bureau"
        title = f"Overdue Coordination Task: {task.title} ({days_overdue} day{'s' if days_overdue > 1 else ''} overdue)"
        message = (
            f"Cross-bureau follow-up task '{task.title}' assigned to {bureau_name.replace('_', ' ')} "
            f"was due on {format_ist(task.deadline)} and is now {days_overdue} day{'s' if days_overdue > 1 else ''} overdue. "
            f"Please update task progress."
        )

        notif = create_durable_notification(
            db=db,
            title=title,
            message=message,
            alert_type="OVERDUE_COORDINATION_TASK",
            severity="WARNING",
            idempotency_key=idempotency_key,
            user_id=task.assigned_to_id,
            target_bureau=task.target_bureau,
            complaint_id=task.complaint_id,
            follow_up_task_id=task.id,
            escalation_level=1,
            current_time=current_time,
            email_provider=email_provider,
            email_delivery_enabled=email_enabled
        )
        if notif:
            alerts_created += 1
            logs.append(f"Overdue coordination task alert created for Task #{task.id}")

    return alerts_created, logs


def retry_failed_deliveries(
    db: Session,
    max_retries: int = 3,
    email_provider: Optional[BaseEmailProvider] = None,
    current_time: Optional[datetime] = None
) -> Tuple[int, int, List[str]]:
    """
    Retries failed email delivery attempts with durable audit logging.
    """
    now = current_time or utc_now()
    provider = email_provider or get_email_provider()

    retried_count = 0
    succeeded_count = 0
    logs = []

    failed_attempts = db.query(NotificationDeliveryAttempt).filter(
        NotificationDeliveryAttempt.channel == "EMAIL",
        NotificationDeliveryAttempt.status == "FAILED",
        NotificationDeliveryAttempt.attempt_number < max_retries
    ).all()

    for attempt in failed_attempts:
        retried_count += 1
        notif = attempt.notification
        if not notif or not attempt.recipient:
            continue

        c_no = None
        if notif.complaint_id:
            comp = db.query(Complaint).filter(Complaint.id == notif.complaint_id).first()
            if comp:
                c_no = comp.complaint_no

        ist_str = format_ist(now)
        text_body, html_body = render_aicte_email_template(
            title=notif.title,
            message=notif.message,
            complaint_no=c_no,
            severity=notif.severity,
            ist_time_str=ist_str
        )

        success, err_msg = provider.send_email(
            to_email=attempt.recipient,
            subject=f"[AICTE SAMANVAY {notif.severity}] (Retry #{attempt.attempt_number + 1}) {notif.title}",
            text_body=text_body,
            html_body=html_body
        )

        # Create new delivery attempt record for audit trail
        new_attempt = NotificationDeliveryAttempt(
            notification_id=notif.id,
            channel="EMAIL",
            attempt_number=attempt.attempt_number + 1,
            status="SUCCESS" if success else "FAILED",
            recipient=attempt.recipient,
            error_message=err_msg,
            attempted_at=now
        )
        db.add(new_attempt)

        if success:
            succeeded_count += 1
            notif.delivery_status = "DELIVERED"
            logs.append(f"Successfully delivered retry #{attempt.attempt_number + 1} to {attempt.recipient}")
        else:
            logs.append(f"Retry #{attempt.attempt_number + 1} failed for {attempt.recipient}: {err_msg}")

    db.commit()
    return retried_count, succeeded_count, logs


def run_scheduled_deadline_checks(
    db: Session,
    current_time: Optional[datetime] = None,
    email_provider: Optional[BaseEmailProvider] = None
) -> SchedulerRunResult:
    """
    Master scheduling routine that executes all deadline, reminder, overdue, and escalation checks.
    Accepts controllable clock 'current_time' for automated testing.
    """
    now = current_time or utc_now()
    cfg = get_alert_config(db)
    all_logs: List[str] = []

    # 1. Upcoming Deadlines
    up_alerts, up_logs = check_upcoming_deadlines(db, now, cfg, email_provider)
    all_logs.extend(up_logs)

    # 2. Overdue Cases & Auto-Escalation
    ov_alerts, escalations, ov_logs = check_overdue_cases_and_escalate(db, now, cfg, email_provider)
    all_logs.extend(ov_logs)

    # 3. Unresolved Overlaps
    ol_alerts, ol_logs = check_unresolved_overlap_reviews(db, now, cfg, email_provider)
    all_logs.extend(ol_logs)

    # 4. Overdue Follow-up Tasks
    tk_alerts, tk_logs = check_overdue_coordination_tasks(db, now, cfg, email_provider)
    all_logs.extend(tk_logs)

    # 5. Retry Failed Deliveries
    retries, retry_success, retry_logs = retry_failed_deliveries(db, 3, email_provider, now)
    all_logs.extend(retry_logs)

    db.commit()

    total_alerts = up_alerts + ov_alerts + ol_alerts + tk_alerts

    # Delivery statistics
    recent_attempts = db.query(NotificationDeliveryAttempt).filter(
        NotificationDeliveryAttempt.attempted_at == now
    ).all()
    deliveries_attempted = len(recent_attempts)
    deliveries_succeeded = sum(1 for a in recent_attempts if a.status == "SUCCESS")
    deliveries_failed = sum(1 for a in recent_attempts if a.status == "FAILED")

    return SchedulerRunResult(
        timestamp=now,
        timestamp_ist=format_ist(now),
        checks_performed={
            "upcoming_deadlines_checked": 1,
            "overdue_cases_checked": 1,
            "unresolved_overlaps_checked": 1,
            "overdue_tasks_checked": 1
        },
        alerts_created=total_alerts,
        escalations_triggered=escalations,
        deliveries_attempted=deliveries_attempted,
        deliveries_succeeded=deliveries_succeeded,
        deliveries_failed=deliveries_failed,
        retries_attempted=retries,
        details=all_logs
    )
