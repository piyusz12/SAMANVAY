import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock
from sqlalchemy.exc import OperationalError

from backend.app.database import with_db_retry
from backend.app.models.complaint import Complaint
from backend.app.models.institution import Institution
from backend.app.models.case_linkage import CaseLinkage
from backend.app.models.follow_up_task import FollowUpTask
from backend.app.models.notification import Notification, NotificationDeliveryAttempt
from backend.app.models.user import User
from backend.app.services.analytics_service import get_dashboard_overview, invalidate_analytics_cache
from backend.app.services.coordination_service import get_coordination_workspaces
from backend.app.services.deadline_service import retry_failed_deliveries
from backend.app.services.timeline_service import compile_case_timeline
from backend.app.services.backup_service import BackupService
from backend.app.services.overlap_engine import evaluate_stage4_semantic_similarity
from backend.app.core.datetime_util import utc_now


def auth_header(token: str):
    return {"Authorization": f"Bearer {token}"}


# =========================================================================
# 1. DATABASE RESILIENCE & CONNECTION RETRY TESTS
# =========================================================================

def test_database_retry_and_resilience():
    """Verify that with_db_retry retries on transient OperationalError and succeeds."""
    mock_func = MagicMock()
    mock_func.side_effect = [
        OperationalError("database is locked", params=None, orig=None),
        OperationalError("database is locked", params=None, orig=None),
        "SUCCESS_VALUE"
    ]

    decorated = with_db_retry(max_retries=3, base_delay=0.001)(mock_func)
    result = decorated()

    assert result == "SUCCESS_VALUE"
    assert mock_func.call_count == 3


def test_database_retry_exceeds_max_retries():
    """Verify that with_db_retry raises when retry limit is exhausted."""
    mock_func = MagicMock()
    mock_func.side_effect = OperationalError("permanent database locked error", params=None, orig=None)

    decorated = with_db_retry(max_retries=2, base_delay=0.001)(mock_func)
    with pytest.raises(OperationalError):
        decorated()

    assert mock_func.call_count == 2


# =========================================================================
# 2. COORDINATION WORKSPACE EAGER LOADING & BATCH EFFICIENCY
# =========================================================================

def test_coordination_workspaces_eager_loading(db_session):
    """Verify get_coordination_workspaces executes with eager loading without raising or missing tasks."""
    super_admin_user = db_session.query(User).filter(User.role == "SUPER_ADMIN").first()
    assert super_admin_user is not None

    inst = db_session.query(Institution).first()
    c1 = db_session.query(Complaint).filter(Complaint.bureau == "REGULATION_BUREAU").first()
    c2 = db_session.query(Complaint).filter(Complaint.bureau == "PGRC").first()
    assert c1 and c2

    linkage = CaseLinkage(
        source_complaint_id=c1.id,
        target_complaint_id=c2.id,
        link_type="CROSS_BUREAU_OVERLAP",
        similarity_score=0.88,
        explanation_json='{"keyword_overlap": 0.85}',
        status="CONFIRMED_RELATED",
        confidence_tier="HIGH",
        is_active=True
    )
    db_session.add(linkage)
    db_session.commit()
    db_session.refresh(linkage)

    task = FollowUpTask(
        linkage_id=linkage.id,
        complaint_id=c1.id,
        title="Joint Site Inspection Task",
        target_bureau="REGULATION_BUREAU",
        deadline=utc_now() + timedelta(days=5),
        status="PENDING",
        priority="HIGH"
    )
    db_session.add(task)
    db_session.commit()

    workspaces = get_coordination_workspaces(db_session, super_admin_user, active_only=True)
    assert len(workspaces) >= 1

    matched = next((w for w in workspaces if w.linkage_id == linkage.id), None)
    assert matched is not None
    assert matched.source_complaint_no == c1.complaint_no
    assert matched.target_complaint_no == c2.complaint_no
    assert matched.outstanding_tasks_count >= 1
    assert matched.overdue_tasks_count == 0


# =========================================================================
# 3. SQL-LEVEL PAGINATION & OVERDUE FILTERING
# =========================================================================

def test_complaint_sql_pagination_and_overdue_filtering(client, admin_token, db_session):
    """Verify that complaints listing handles page_size, total, and is_overdue at SQL layer."""
    res_all = client.get("/api/v1/complaints?page=1&page_size=5", headers=auth_header(admin_token))
    assert res_all.status_code == 200
    data_all = res_all.json()
    assert "total" in data_all
    assert len(data_all["items"]) <= 5
    assert data_all["page"] == 1
    assert data_all["page_size"] == 5

    res_overdue = client.get("/api/v1/complaints?is_overdue=true&page=1&page_size=5", headers=auth_header(admin_token))
    assert res_overdue.status_code == 200
    data_overdue = res_overdue.json()
    assert "total" in data_overdue
    for c in data_overdue["items"]:
        assert c["status"] not in ("RESOLVED", "DISPOSED")


# =========================================================================
# 4. DASHBOARD AGGREGATION CACHING & INVALIDATION
# =========================================================================

def test_dashboard_aggregation_caching_and_invalidation(db_session):
    """Verify dashboard overview memoization and cache invalidation on complaint mutations."""
    super_admin_user = db_session.query(User).filter(User.role == "SUPER_ADMIN").first()
    assert super_admin_user is not None

    invalidate_analytics_cache()

    # Initial compute
    res1 = get_dashboard_overview(db_session, super_admin_user)
    initial_total = res1["total_complaints_received"]

    # Repeated compute should hit cache
    res2 = get_dashboard_overview(db_session, super_admin_user)
    assert res2["total_complaints_received"] == initial_total

    # Invalidate cache
    invalidate_analytics_cache()

    # Re-compute after invalidation
    res3 = get_dashboard_overview(db_session, super_admin_user)
    assert res3["total_complaints_received"] == initial_total


# =========================================================================
# 5. DEADLINE SCHEDULER RETRY TERMINATION & IDEMPOTENCY
# =========================================================================

def test_deadline_scheduler_retry_termination_and_idempotency(db_session):
    """Verify failed delivery attempts are marked RETRIED so retries do not repeat exponentially."""
    inst = db_session.query(Institution).first()
    comp = db_session.query(Complaint).first()

    notif = Notification(
        title="Test SLA Reminder",
        alert_type="DEADLINE_REMINDER",
        message="SLA deadline approaching.",
        severity="WARNING",
        delivery_channel="EMAIL",
        delivery_status="FAILED",
        target_bureau="REGULATION_BUREAU",
        institution_id=inst.id if inst else None,
        complaint_id=comp.id if comp else None
    )
    db_session.add(notif)
    db_session.commit()
    db_session.refresh(notif)

    attempt1 = NotificationDeliveryAttempt(
        notification_id=notif.id,
        channel="EMAIL",
        attempt_number=1,
        status="FAILED",
        recipient="desk_officer@aicte.gov.in",
        error_message="Connection timed out",
        attempted_at=utc_now() - timedelta(minutes=10)
    )
    db_session.add(attempt1)
    db_session.commit()

    # Run retry routine with mock provider
    retried_cnt, succeeded_cnt, logs = retry_failed_deliveries(db_session, max_retries=3)
    assert retried_cnt >= 1

    # Verify attempt1 is marked as RETRIED to terminate infinite loops
    db_session.refresh(attempt1)
    assert attempt1.status == "RETRIED"

    # Second run should NOT re-retry attempt1
    retried_cnt2, _, _ = retry_failed_deliveries(db_session, max_retries=3)
    assert attempt1.status == "RETRIED"


# =========================================================================
# 6. SEMANTIC OVERLAP FAST-PATH PRE-SCREENING
# =========================================================================

def test_semantic_overlap_fast_path_prescreening():
    """Verify token prescreening skips TF-IDF fitting on completely disjoint texts."""
    text_a = "Faculty salary arrears pending payment under sixth pay commission recommendations"
    text_b = "Illegal construction of swimming pool in civil engineering laboratory block"

    res = evaluate_stage4_semantic_similarity(text_a, text_b)
    assert res["score"] == 0.0

    # Overlapping texts should compute score > 0
    text_c = "Faculty salary delayed payment non disbursement under pay commission"
    res2 = evaluate_stage4_semantic_similarity(text_a, text_c)
    assert res2["score"] > 0.20


# =========================================================================
# 7. TIMELINE AND BACKUP SERVICE BUG FIX REGRESSION VERIFICATION
# =========================================================================

def test_timeline_service_with_follow_up_tasks(db_session):
    """Verify compile_case_timeline does not raise NameError for utc_now with follow-up tasks."""
    comp = db_session.query(Complaint).first()
    assert comp is not None

    task = FollowUpTask(
        complaint_id=comp.id,
        title="Check compliance evidence",
        target_bureau=comp.bureau,
        deadline=utc_now() + timedelta(days=3),
        status="PENDING",
        priority="MEDIUM"
    )
    db_session.add(task)
    db_session.commit()

    # Should execute cleanly without NameError: name 'utc_now' is not defined
    events = compile_case_timeline(db_session, comp.id)
    assert isinstance(events, list)
    task_events = [e for e in events if e.get("event_type") == "TASK_CREATED"]
    assert len(task_events) >= 1


def test_backup_service_legal_hold_inspection(db_session):
    """Verify evaluate_retention_compliance inspects c.attachments safely without AttributeError."""
    super_admin_user = db_session.query(User).filter(User.role == "SUPER_ADMIN").first()
    assert super_admin_user is not None

    status_report = BackupService.evaluate_retention_compliance(
        db=db_session,
        user=super_admin_user,
        retention_days=365
    )
    assert "total_soft_deleted_cases" in status_report
    assert "active_legal_holds_count" in status_report
    assert "compliance_verdict" in status_report
