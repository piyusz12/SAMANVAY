import pytest
from datetime import datetime, timedelta, timezone

from backend.app.core.datetime_util import utc_now
from backend.app.models.complaint import Complaint
from backend.app.models.institution import Institution
from backend.app.models.case_linkage import CaseLinkage
from backend.app.models.follow_up_task import FollowUpTask
from backend.app.models.notification import Notification, NotificationDeliveryAttempt
from backend.app.models.case_status_history import CaseStatusHistory
from backend.app.models.user import User
from backend.app.services.email_service import MockEmailProvider
from backend.app.services.deadline_service import (
    run_scheduled_deadline_checks,
    retry_failed_deliveries,
    create_durable_notification,
    get_alert_config,
    update_alert_config
)
from backend.app.schemas.notification import AlertConfigUpdate


def test_upcoming_deadlines_reminder_timing(client, admin_token, db_session):
    """
    Verifies that upcoming deadlines are identified at configured reminder intervals (e.g. 5, 3, 1 days)
    using a controllable clock.
    """
    mock_email = MockEmailProvider()
    base_time = datetime(2026, 10, 27, 10, 0, 0)

    inst = db_session.query(Institution).first()
    officer = db_session.query(User).filter(User.role == "CASE_OFFICER").first()

    # Create a test complaint due in exactly 3 days
    complaint = Complaint(
        complaint_no="AICTE/TEST/2026/DEADLINE-01",
        institution_id=inst.id,
        bureau="REGULATION_BUREAU",
        complainant_name="Test Citizen",
        complainant_category="CITIZEN",
        subject="Upcoming lab deficit inspection deadline",
        description="Detailed inquiry into technical campus facilities.",
        category="INFRASTRUCTURE_DEFICIT",
        status="UNDER_INQUIRY",
        priority="MEDIUM",
        sla_deadline_days=30,
        sla_due_date=base_time + timedelta(days=3),
        assigned_officer_id=officer.id,
        assigned_officer_name=officer.full_name,
        created_at=base_time - timedelta(days=27)
    )
    db_session.add(complaint)
    db_session.commit()

    # Run scheduler at base_time (exactly 3 days before deadline)
    result = run_scheduled_deadline_checks(db_session, current_time=base_time, email_provider=mock_email)
    
    assert result.alerts_created >= 1
    
    # Verify in-app notification record
    notif = db_session.query(Notification).filter(
        Notification.complaint_id == complaint.id,
        Notification.alert_type == "UPCOMING_DEADLINE"
    ).first()
    assert notif is not None
    assert "Upcoming SLA Deadline" in notif.title
    assert "3 days left" in notif.title
    assert notif.severity in ("INFO", "WARNING")
    assert notif.is_read == False

    # Verify email delivery was attempted
    assert len(mock_email.sent_emails) >= 1
    assert any("Upcoming SLA Deadline" in e["subject"] for e in mock_email.sent_emails)


def test_duplicate_prevention_via_idempotency_keys(client, admin_token, db_session):
    """
    Verifies that running the deadline scheduler multiple times on the same date/window
    does not create duplicate alerts or duplicate delivery attempts due to idempotency keys.
    """
    mock_email = MockEmailProvider()
    clock = datetime(2026, 10, 27, 14, 0, 0)

    # First run
    res1 = run_scheduled_deadline_checks(db_session, current_time=clock, email_provider=mock_email)
    count_run1 = db_session.query(Notification).count()
    emails_run1 = len(mock_email.sent_emails)

    # Second run at same clock time (or same day window)
    res2 = run_scheduled_deadline_checks(db_session, current_time=clock + timedelta(hours=1), email_provider=mock_email)
    count_run2 = db_session.query(Notification).count()
    emails_run2 = len(mock_email.sent_emails)

    # Duplicate notifications should NOT have been generated
    assert count_run1 == count_run2
    assert emails_run1 == emails_run2
    assert res2.alerts_created == 0


def test_overdue_escalation_rules_and_state_transition(client, admin_token, db_session):
    """
    Verifies that overdue cases past SLA deadline trigger progressive escalation:
    Level 2 warning -> Level 3 critical escalation with automatic state transition to ESCALATED.
    """
    mock_email = MockEmailProvider()
    base_time = datetime(2026, 11, 1, 10, 0, 0)

    inst = db_session.query(Institution).first()
    officer = db_session.query(User).filter(User.role == "CASE_OFFICER").first()

    # Create a critical priority complaint due on 2026-10-25 (7 days overdue on 2026-11-01)
    complaint = Complaint(
        complaint_no="AICTE/TEST/2026/ESCALATE-01",
        institution_id=inst.id,
        bureau="PGRC",
        complainant_name="Aarav Student",
        complainant_category="STUDENT",
        subject="Severe fee extortion and certificate withholding",
        description="Institution withholding student original certificates.",
        category="FEE_EXTORTION",
        status="UNDER_INQUIRY",
        priority="CRITICAL",
        sla_deadline_days=7,
        sla_due_date=datetime(2026, 10, 25, 10, 0, 0),
        assigned_officer_id=officer.id,
        assigned_officer_name=officer.full_name,
        created_at=datetime(2026, 10, 18, 10, 0, 0)
    )
    db_session.add(complaint)
    db_session.commit()

    # Trigger scheduler at base_time (7 days overdue)
    result = run_scheduled_deadline_checks(db_session, current_time=base_time, email_provider=mock_email)

    assert result.escalations_triggered >= 1

    # Reload complaint and verify status transition to ESCALATED
    db_session.refresh(complaint)
    assert complaint.status == "ESCALATED"

    # Verify CaseStatusHistory record was written
    history = db_session.query(CaseStatusHistory).filter(
        CaseStatusHistory.complaint_id == complaint.id,
        CaseStatusHistory.to_status == "ESCALATED"
    ).first()
    assert history is not None
    assert history.action_taken == "SLA_BREACH_ESCALATION"
    assert "Automated regulatory escalation" in history.remarks

    # Verify Level 3 alert created with CRITICAL severity
    esc_notif = db_session.query(Notification).filter(
        Notification.complaint_id == complaint.id,
        Notification.escalation_level == 3
    ).first()
    assert esc_notif is not None
    assert esc_notif.severity == "CRITICAL"
    assert "CRITICAL REGULATORY ESCALATION" in esc_notif.title


def test_unresolved_overlap_and_overdue_task_detection(client, admin_token, db_session):
    """
    Verifies that pending cross-bureau overlap reviews and overdue coordination tasks
    generate durable warnings.
    """
    now = datetime(2026, 10, 27, 12, 0, 0)

    # 1. Create an unresolved overlap review older than 5 days
    c1 = db_session.query(Complaint).first()
    c2 = db_session.query(Complaint).filter(Complaint.id != c1.id).first()
    
    import json
    linkage = CaseLinkage(
        source_complaint_id=c1.id,
        target_complaint_id=c2.id,
        similarity_score=0.88,
        explanation_json=json.dumps({"reasons": ["Same institution", "Cross-bureau overlap"]}),
        reasons_json=json.dumps(["Same institution", "Cross-bureau overlap"]),
        link_type="POTENTIAL_OVERLAP",
        status="PENDING_REVIEW",
        created_at=now - timedelta(days=6)  # Older than 5-day threshold
    )
    db_session.add(linkage)

    # 2. Create an overdue follow-up task
    task = FollowUpTask(
        complaint_id=c1.id,
        title="Conduct Joint Inspection with Regulation Bureau",
        target_bureau="REGULATION_BUREAU",
        status="PENDING",
        deadline=now - timedelta(days=2),  # 2 days overdue
        created_at=now - timedelta(days=5)
    )
    db_session.add(task)
    db_session.commit()

    # Run scheduler
    res = run_scheduled_deadline_checks(db_session, current_time=now)
    assert res.alerts_created >= 2

    # Verify overlap alert
    ol_notif = db_session.query(Notification).filter(
        Notification.linkage_id == linkage.id,
        Notification.alert_type == "UNRESOLVED_OVERLAP"
    ).first()
    assert ol_notif is not None
    assert "Pending Overlap Review" in ol_notif.title

    # Verify task alert
    tk_notif = db_session.query(Notification).filter(
        Notification.follow_up_task_id == task.id,
        Notification.alert_type == "OVERDUE_COORDINATION_TASK"
    ).first()
    assert tk_notif is not None
    assert "Overdue Coordination Task" in tk_notif.title


def test_email_delivery_and_retry_behavior(client, admin_token, db_session):
    """
    Verifies email dispatch failure handling, recording in delivery_attempts,
    and automated retry behavior.
    """
    mock_email = MockEmailProvider()
    # Configure mock to fail the first attempt
    mock_email.fail_next_n_attempts = 1

    now = datetime(2026, 10, 27, 15, 0, 0)
    inst = db_session.query(Institution).first()
    officer = db_session.query(User).filter(User.role == "CASE_OFFICER").first()

    complaint = Complaint(
        complaint_no="AICTE/TEST/2026/RETRY-01",
        institution_id=inst.id,
        bureau="PGRC",
        complainant_name="Citizen Tester",
        complainant_category="CITIZEN",
        subject="Retry verification complaint",
        description="Testing retry logic.",
        category="ADMISSION_FRAUD",
        status="UNDER_INQUIRY",
        priority="HIGH",
        sla_deadline_days=15,
        sla_due_date=now + timedelta(days=1),  # 1 day left
        assigned_officer_id=officer.id,
        assigned_officer_name=officer.full_name,
        created_at=now - timedelta(days=14)
    )
    db_session.add(complaint)
    db_session.commit()

    # 1. Create durable notification with mock email failure
    notif = create_durable_notification(
        db=db_session,
        title="Delivery Failure Test Notification",
        message="Testing retry queue execution.",
        alert_type="UPCOMING_DEADLINE",
        severity="WARNING",
        idempotency_key="TEST:RETRY:01",
        user_id=officer.id,
        target_bureau="PGRC",
        complaint_id=complaint.id,
        current_time=now,
        email_provider=mock_email,
        email_delivery_enabled=True
    )
    db_session.commit()

    assert notif is not None
    assert notif.delivery_status == "FAILED"

    attempts = db_session.query(NotificationDeliveryAttempt).filter(
        NotificationDeliveryAttempt.notification_id == notif.id,
        NotificationDeliveryAttempt.channel == "EMAIL"
    ).all()
    assert len(attempts) == 1
    assert attempts[0].status == "FAILED"
    assert "Simulated SMTP connection timeout" in attempts[0].error_message

    # 2. Trigger retry -> mock_email now has fail_next_n_attempts = 0, so retry succeeds!
    retried, succeeded, logs = retry_failed_deliveries(db_session, max_retries=3, email_provider=mock_email, current_time=now + timedelta(minutes=10))
    assert retried >= 1
    assert succeeded >= 1

    # Verify notification delivery_status updated to DELIVERED
    db_session.refresh(notif)
    assert notif.delivery_status == "DELIVERED"

    # Verify second attempt record was added with SUCCESS
    attempts_after = db_session.query(NotificationDeliveryAttempt).filter(
        NotificationDeliveryAttempt.notification_id == notif.id,
        NotificationDeliveryAttempt.channel == "EMAIL"
    ).order_by(NotificationDeliveryAttempt.attempt_number.asc()).all()
    assert len(attempts_after) == 2
    assert attempts_after[1].attempt_number == 2
    assert attempts_after[1].status == "SUCCESS"


def test_notification_center_endpoints_and_rbac(client, admin_token, pgrc_admin_token, rb_officer_token):
    """
    Verifies notification API endpoints: list, unread count, read marking, delivery attempts,
    scheduler trigger, config update, and role permissions.
    """
    # 1. Trigger scheduler endpoint with simulated clock
    sim_time = "2026-10-27T10:00:00"
    res_sched = client.post(
        f"/api/v1/alerts/run-scheduler?simulated_time={sim_time}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_sched.status_code == 200
    sched_data = res_sched.json()
    assert "timestamp_ist" in sched_data
    assert "checks_performed" in sched_data

    # 2. Unread Count endpoint
    res_count = client.get(
        "/api/v1/notifications/unread-count",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_count.status_code == 200
    assert "unread_count" in res_count.json()

    # 3. List notifications with filters
    res_list = client.get(
        "/api/v1/notifications?limit=20",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_list.status_code == 200
    items = res_list.json()
    assert isinstance(items, list)
    if len(items) > 0:
        first_id = items[0]["id"]

        # Mark single notification as read
        res_read = client.patch(
            f"/api/v1/notifications/{first_id}/read",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_read.status_code == 200
        assert res_read.json()["is_read"] == True

        # Inspect delivery attempts
        res_att = client.get(
            f"/api/v1/notifications/{first_id}/delivery-attempts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_att.status_code == 200
        assert isinstance(res_att.json(), list)

    # 4. Mark all as read
    res_mark_all = client.post(
        "/api/v1/notifications/mark-all-read",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_mark_all.status_code == 200
    assert "marked_read_count" in res_mark_all.json()

    # 5. Get Alert Configuration
    res_cfg = client.get(
        "/api/v1/alerts/config",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_cfg.status_code == 200
    cfg = res_cfg.json()
    assert "reminder_intervals_days" in cfg
    assert "escalation_level_3_days_overdue" in cfg

    # 6. Update Alert Configuration (Admin only)
    res_up_admin = client.put(
        "/api/v1/alerts/config",
        json={"overdue_reminder_frequency_days": 3, "escalation_level_3_days_overdue": 8},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_up_admin.status_code == 200
    assert res_up_admin.json()["overdue_reminder_frequency_days"] == 3
    assert res_up_admin.json()["escalation_level_3_days_overdue"] == 8

    # 7. Non-admin cannot update configuration
    res_up_officer = client.put(
        "/api/v1/alerts/config",
        json={"overdue_reminder_frequency_days": 1},
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert res_up_officer.status_code == 403
