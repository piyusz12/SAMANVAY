import io
import pytest
from datetime import datetime, timedelta
from sqlalchemy import desc
from backend.app.config import settings
from backend.app.models.complaint import Complaint
from backend.app.models.institution import Institution
from backend.app.models.user import User
from backend.app.models.audit_log import AuditLog
from backend.app.models.evidence_attachment import EvidenceAttachment
from backend.app.services.auth_service import create_access_token
from backend.app.services.audit_service import log_audit_event, verify_audit_trail_integrity
from backend.app.services.backup_service import BackupService
from backend.app.core.logging import scrub_sensitive_text
from backend.app.core.rate_limiter import ApiRateLimiter, global_api_rate_limiter

@pytest.fixture
def super_admin_token(db_session):
    user = db_session.query(User).filter(User.role == "SUPER_ADMIN").first()
    return create_access_token(subject=user.id)

@pytest.fixture
def rb_officer_token(db_session):
    user = db_session.query(User).filter(User.email == "officer.rb@samanvay.aicte.gov.in").first()
    return create_access_token(subject=user.id)

@pytest.fixture
def pgrc_officer_token(db_session):
    user = db_session.query(User).filter(User.email == "officer.pgrc@samanvay.aicte.gov.in").first()
    return create_access_token(subject=user.id)

@pytest.fixture
def auditor_token(db_session):
    user = db_session.query(User).filter(User.role == "AUDITOR").first()
    return create_access_token(subject=user.id)

# =========================================================================
# 1. BROKEN ACCESS CONTROL & CROSS-BUREAU DATA LEAKAGE TESTS
# =========================================================================

def test_cross_bureau_complaint_retrieval_blocked(client, rb_officer_token, db_session):
    """
    Verify that a Regulation Bureau officer cannot retrieve complaints
    belonging exclusively to PGRC without linkage or transfer authorization.
    """
    pgrc_case = db_session.query(Complaint).filter(Complaint.bureau == "PGRC").first()
    assert pgrc_case is not None

    resp = client.get(
        f"/api/v1/complaints/{pgrc_case.id}",
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert resp.status_code == 403
    assert "cross-bureau access denied" in resp.json()["detail"].lower()

def test_cross_bureau_complaint_listing_scoped_or_blocked(client, rb_officer_token):
    """
    Verify that an officer attempting to list complaints with an unauthorized
    bureau filter is rejected with 403 Forbidden.
    """
    resp = client.get(
        "/api/v1/complaints?bureau=PGRC",
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert resp.status_code == 403
    assert "access denied" in resp.json()["detail"].lower()

def test_whistleblower_pii_strictly_redacted_for_non_privileged_users(client, rb_officer_token, db_session):
    """
    Verify that anonymous/confidential whistleblower PII is strictly redacted
    for regular case officers, even within the same bureau.
    """
    inst = db_session.query(Institution).first()
    conf_case = Complaint(
        complaint_no="AICTE/RB/2026/CONF_PII_TEST",
        institution_id=inst.id,
        bureau="REGULATION_BUREAU",
        complainant_name="Prof. Confidential Informant",
        complainant_email="informant@university.ac.in",
        complainant_phone="+91 9988776655",
        complainant_category="FACULTY",
        is_anonymous_confidential=True,
        subject="Surprise Inspection Corruption",
        description="Fictitious laboratory equipment displayed during regulatory visit.",
        category="INADEQUATE_INFRASTRUCTURE",
        status="UNDER_INQUIRY",
        priority="HIGH"
    )
    db_session.add(conf_case)
    db_session.commit()

    resp = client.get(
        f"/api/v1/complaints/{conf_case.id}",
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["complainant_name"] == "[CONFIDENTIAL / ANONYMOUS]"
    assert body["complainant_email"] == "[REDACTED]"
    assert body["complainant_phone"] == "[REDACTED]"

# =========================================================================
# 2. AUDIT TRAIL TAMPER-DETECTION & HASH CHAINING TESTS
# =========================================================================

def test_audit_log_unauthenticated_access_denied(client):
    """Verify that unauthenticated callers cannot query audit logs."""
    resp = client.get("/api/v1/audit/logs")
    assert resp.status_code == 401

def test_audit_log_cross_bureau_inspection_blocked(client, rb_officer_token, db_session):
    """Verify that a bureau officer cannot inspect audit logs of a case from another bureau."""
    pgrc_case = db_session.query(Complaint).filter(Complaint.bureau == "PGRC").first()
    assert pgrc_case is not None

    resp = client.get(
        f"/api/v1/audit/logs?complaint_id={pgrc_case.id}",
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert resp.status_code == 403
    assert "access denied" in resp.json()["detail"].lower()

def test_cryptographic_audit_trail_chain_and_tamper_detection(client, super_admin_token, db_session):
    """
    Verify:
    1. Audit logs are generated with cryptographic SHA-256 hash chaining.
    2. Verification endpoint reports intact audit trail.
    3. Direct unauthorized modification of an audit record is immediately detected.
    """
    # 1. Log two fresh events
    e1 = log_audit_event(
        db=db_session,
        action_type="SECURITY_TEST_EVENT_1",
        description="Initial security baseline record.",
        actor_name="SecAdmin",
        actor_role="SUPER_ADMIN",
        commit=True
    )
    assert e1.entry_hash is not None
    assert e1.prev_hash is not None

    e2 = log_audit_event(
        db=db_session,
        action_type="SECURITY_TEST_EVENT_2",
        description="Follow-up chained security record.",
        actor_name="SecAdmin",
        actor_role="SUPER_ADMIN",
        commit=True
    )
    assert e2.prev_hash == e1.entry_hash

    # 2. Verify clean integrity check
    resp = client.get(
        "/api/v1/audit/verify-integrity",
        headers={"Authorization": f"Bearer {super_admin_token}"}
    )
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["is_intact"] is True

    # 3. Simulate privileged direct database tampering on e2 description
    e2.description = "MALICIOUSLY TAMPERED DESCRIPTION BY ROGUE ACTOR"
    db_session.commit()

    # 4. Verify that tamper-detection engine catches the modification
    tamper_result = verify_audit_trail_integrity(db_session)
    assert tamper_result["is_intact"] is False
    assert tamper_result["violation_type"] == "CONTENT_TAMPERED"
    assert tamper_result["tampered_entry_id"] == e2.id

# =========================================================================
# 3. HTTP SECURITY HEADERS & DEFENSE-IN-DEPTH
# =========================================================================

def test_hardened_http_security_headers_present(client):
    """Verify all defense-in-depth security headers are present on responses."""
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200

    headers = resp.headers
    assert headers.get("X-Frame-Options") == "DENY"
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-XSS-Protection") == "1; mode=block"
    assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "default-src 'self'" in headers.get("Content-Security-Policy", "")
    assert "frame-ancestors 'none'" in headers.get("Content-Security-Policy", "")
    assert "camera=()" in headers.get("Permissions-Policy", "")
    assert headers.get("Cross-Origin-Opener-Policy") == "same-origin"
    assert headers.get("Cross-Origin-Resource-Policy") == "same-origin"

# =========================================================================
# 4. CREDENTIAL SCRUBBING & SENSITIVE DATA IN LOGS
# =========================================================================

def test_sensitive_credential_scrubbing():
    """Verify that the sensitive data filter masks JWT tokens, passwords, and cookies."""
    raw_jwt_msg = "User authenticated with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy"
    scrubbed = scrub_sensitive_text(raw_jwt_msg)
    assert "Bearer [SCRUBBED_JWT]" in scrubbed
    assert "eyJ" not in scrubbed

    raw_pw_msg = 'Login payload received: {"email": "test@aicte.gov.in", "password": "SuperSecretPassword123!"}'
    scrubbed_pw = scrub_sensitive_text(raw_pw_msg)
    assert "[SCRUBBED_PASSWORD]" in scrubbed_pw
    assert "SuperSecretPassword123!" not in scrubbed_pw

    raw_cookie_msg = "Cookie header: access_token=somerandomcookietoken12345; path=/"
    scrubbed_cookie = scrub_sensitive_text(raw_cookie_msg)
    assert "access_token=[SCRUBBED_COOKIE]" in scrubbed_cookie

# =========================================================================
# 5. BACKUP ACCESS CONTROL & INTEGRITY VERIFICATION
# =========================================================================

def test_database_backup_access_control(client, rb_officer_token, super_admin_token):
    """Verify that non-super-admins cannot trigger database snapshots."""
    # Officer attempt -> 403
    resp = client.post(
        "/api/v1/admin/backups/create",
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert resp.status_code == 403

    # Super Admin attempt -> 200
    resp_admin = client.post(
        "/api/v1/admin/backups/create",
        headers={"Authorization": f"Bearer {super_admin_token}"}
    )
    assert resp_admin.status_code == 200
    backup_meta = resp_admin.json()
    assert backup_meta["status"] == "SUCCESS"
    assert backup_meta["sha256_checksum"] is not None

    # Verify backup on disk
    verify_resp = client.post(
        f"/api/v1/admin/backups/verify/{backup_meta['filename']}",
        headers={"Authorization": f"Bearer {super_admin_token}"}
    )
    assert verify_resp.status_code == 200
    assert verify_resp.json()["is_valid"] is True
    assert verify_resp.json()["verification_status"] == "INTEGRITY_VERIFIED"

def test_retention_compliance_evaluation(client, auditor_token):
    """Verify that auditors and super admins can evaluate retention compliance."""
    resp = client.get(
        "/api/v1/admin/retention/compliance",
        headers={"Authorization": f"Bearer {auditor_token}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "total_soft_deleted_cases" in data
    assert "active_legal_holds_count" in data
    assert "COMPLIANT" in data["compliance_verdict"]

# =========================================================================
# 6. BACKGROUND JOB RBAC HARDENING
# =========================================================================

def test_auditor_cannot_trigger_deadline_scheduler(client, auditor_token):
    """Verify that read-only Auditor role cannot trigger mutating background jobs."""
    resp = client.post(
        "/api/v1/alerts/run-scheduler",
        headers={"Authorization": f"Bearer {auditor_token}"}
    )
    assert resp.status_code == 403
    assert "read-only auditor" in resp.json()["detail"].lower()

def test_auditor_cannot_trigger_delivery_retries(client, auditor_token):
    """Verify that read-only Auditor role cannot trigger email delivery retries."""
    resp = client.post(
        "/api/v1/alerts/retry-deliveries",
        headers={"Authorization": f"Bearer {auditor_token}"}
    )
    assert resp.status_code == 403
