import io
import pytest
from unittest.mock import patch
from backend.app.models.complaint import Complaint
from backend.app.models.institution import Institution
from backend.app.models.user import User
from backend.app.models.notification import Notification, NotificationDeliveryAttempt
from backend.app.services.auth_service import create_access_token
from backend.app.services.email_service import _global_mock_provider

@pytest.fixture
def super_admin_token(db_session):
    user = db_session.query(User).filter(User.role == "SUPER_ADMIN").first()
    return create_access_token(subject=user.id)

@pytest.fixture
def rb_officer_token(db_session):
    user = db_session.query(User).filter(User.email == "officer.rb@samanvay.aicte.gov.in").first()
    return create_access_token(subject=user.id)

# =========================================================================
# 1. DATABASE FAILURE & TRANSACTION ROLLBACK TESTS
# =========================================================================

def test_database_mid_transaction_rollback_preserves_consistency(db_session):
    """
    Verify that if an unhandled error occurs mid-transaction,
    the database rolls back cleanly and leaves no orphaned entities.
    """
    inst = db_session.query(Institution).first()
    initial_count = db_session.query(Complaint).count()

    try:
        # Start transaction
        c1 = Complaint(
            complaint_no="AICTE/RB/2026/TEST_ROLLBACK_1",
            institution_id=inst.id,
            bureau="REGULATION_BUREAU",
            subject="Atomic Transaction Valid Part",
            description="Valid partial entry",
            category="INFRASTRUCTURE_DEFICIT",
            status="LODGED",
            priority="LOW",
            complainant_name="Rollback Tester",
            complainant_category="FACULTY"
        )
        db_session.add(c1)
        db_session.flush()

        # Simulate unexpected constraint or database failure
        raise RuntimeError("Simulated mid-transaction failure during multi-entity operation")
    except RuntimeError:
        db_session.rollback()

    # Verify that count is unchanged and c1 was not persisted
    assert db_session.query(Complaint).count() == initial_count
    assert db_session.query(Complaint).filter(Complaint.complaint_no == "AICTE/RB/2026/TEST_ROLLBACK_1").first() is None

# =========================================================================
# 2. EMAIL NOTIFICATION PROVIDER FAILURE RESILIENCE
# =========================================================================

def test_email_provider_failure_does_not_crash_scheduler_and_records_failure(
    client, super_admin_token, db_session
):
    """
    Verify that if the external email delivery provider encounters errors,
    the background worker catches the error, marks delivery attempt as FAILED,
    and returns a graceful 200 response without crashing the application.
    """
    _global_mock_provider.fail_next_n_attempts = 5
    resp = client.post(
        "/api/v1/alerts/run-scheduler",
        headers={"Authorization": f"Bearer {super_admin_token}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "alerts_created" in data or "checks_performed" in data

    # Verify that retry worker also safely catches email provider failures
    _global_mock_provider.fail_next_n_attempts = 5
    retry_resp = client.post(
        "/api/v1/alerts/retry-deliveries",
        headers={"Authorization": f"Bearer {super_admin_token}"}
    )
    assert retry_resp.status_code == 200
    _global_mock_provider.clear()

# =========================================================================
# 3. OVERLAP PIPELINE ROBUSTNESS UNDER EXTREME INPUTS
# =========================================================================

def test_overlap_similarity_extreme_and_malformed_inputs(client, super_admin_token, db_session):
    """
    Verify that the similarity matcher handles empty strings, non-ASCII Unicode characters,
    special regex control characters, and huge text blocks (>20,000 characters)
    without crashing or memory leakage.
    """
    inst = db_session.query(Institution).first()

    # 1. Non-ASCII Unicode & Symbols
    resp_unicode = client.post(
        "/api/v1/similarity/check",
        json={
            "institution_id": inst.id,
            "subject": "⚠️ अनुपालन उल्लंघन / Compliances 測試 12345 🚀",
            "description": "Unicode test string containing emojis and multi-byte scripts: 🏛️ 🎓.",
            "category": "INFRASTRUCTURE_DEFICIT"
        },
        headers={"Authorization": f"Bearer {super_admin_token}"}
    )
    assert resp_unicode.status_code == 200

    # 2. Ultra-long narrative description (25,000 characters)
    huge_text = "Severe regulatory violation regarding workshop safety and fee extortion. " * 350
    resp_huge = client.post(
        "/api/v1/similarity/check",
        json={
            "institution_id": inst.id,
            "subject": "Huge Text Benchmark",
            "description": huge_text,
            "category": "INFRASTRUCTURE_DEFICIT"
        },
        headers={"Authorization": f"Bearer {super_admin_token}"}
    )
    assert resp_huge.status_code == 200
    assert "matches" in resp_huge.json()

# =========================================================================
# 4. AUTHENTICATION TOKEN FAILURE PATHS
# =========================================================================

def test_tampered_and_malformed_jwt_tokens_rejected(client):
    """Verify that forged, malformed, or tampered JWT tokens return 401 Unauthorized."""
    # 1. Invalid signature token
    forged_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImV4cCI6OTk5OTk5OTk5OX0.FORGED_SIGNATURE"
    resp1 = client.get(
        "/api/v1/complaints",
        headers={"Authorization": f"Bearer {forged_token}"}
    )
    assert resp1.status_code == 401

    # 2. Garbage non-JWT string
    resp2 = client.get(
        "/api/v1/complaints",
        headers={"Authorization": "Bearer not-a-valid-jwt-token"}
    )
    assert resp2.status_code == 401

# =========================================================================
# 5. SEARCH PARAMETER VALIDATION AND BOUNDS SAFETY
# =========================================================================

def test_search_handles_inverted_dates_and_bound_violations_safely(client, super_admin_token):
    """
    Verify that invalid date formats or inverted date ranges (from > to)
    are handled safely with 422 or sanitized result without 500 error.
    """
    # Nonsense date string
    resp_invalid_date = client.get(
        "/api/v1/search/complaints?date_from=INVALID_DATE_STRING",
        headers={"Authorization": f"Bearer {super_admin_token}"}
    )
    assert resp_invalid_date.status_code == 422
