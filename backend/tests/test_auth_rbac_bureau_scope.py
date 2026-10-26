from datetime import timedelta
import pytest
from fastapi.testclient import TestClient
from backend.app.services.auth_service import create_access_token
from backend.app.core.rate_limiter import login_rate_limiter
from backend.app.models.user import User
from backend.app.models.complaint import Complaint
from backend.app.models.audit_log import AuditLog
from backend.app.config import settings

def test_unauthenticated_requests_fail(client):
    """Verify that protected API endpoints reject requests without credentials with 401."""
    # Profile
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401
    assert "Authentication token is missing" in res.json()["detail"]

    # Complaint status mutation
    res = client.patch(
        "/api/v1/complaints/1/status",
        json={"status": "UNDER_INQUIRY", "notes": "Unauthenticated update attempt."}
    )
    assert res.status_code == 401
    assert "Authentication token is missing" in res.json()["detail"]

    # Case movement initiation
    res = client.post(
        "/api/v1/movements/complaint/1",
        json={"to_bureau": "PGRC", "reason": "Unauthenticated transfer."}
    )
    assert res.status_code == 401
    assert "Authentication token is missing" in res.json()["detail"]

    # Admin endpoints
    res = client.get("/api/v1/admin/users")
    assert res.status_code == 401
    assert "Authentication token is missing" in res.json()["detail"]

    res = client.get("/api/v1/admin/configs")
    assert res.status_code == 401
    assert "Authentication token is missing" in res.json()["detail"]

def test_expired_and_malformed_tokens_fail(client, db_session):
    """Verify that expired and invalid tokens are rejected with 401."""
    # Malformed token
    res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer definitely.not.a.valid.jwt.token"}
    )
    assert res.status_code == 401
    assert "Invalid or expired access token" in res.json()["detail"]

    # Expired token
    user = db_session.query(User).first()
    expired_token = create_access_token(
        subject=user.id,
        expires_delta=timedelta(minutes=-15)  # Expired 15 mins ago
    )
    res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"}
    )
    assert res.status_code == 401
    assert "Invalid or expired access token" in res.json()["detail"]

def test_login_rate_limiting_lockout(client):
    """Verify that failed login attempts trigger 429 Too Many Requests."""
    login_rate_limiter.reset_all()

    target_email = "victim.admin@samanvay.aicte.gov.in"
    bad_payload = {"email": target_email, "password": "WrongPassword123!"}

    # Attempts 1 through 4 fail with 401
    for i in range(4):
        res = client.post("/api/v1/auth/login", json=bad_payload)
        assert res.status_code == 401

    # Attempt 5 hits the limit and is locked out with 429
    res5 = client.post("/api/v1/auth/login", json=bad_payload)
    assert res5.status_code == 429
    assert "Maximum login attempts exceeded" in res5.json()["detail"] or "locked" in res5.json()["detail"].lower()
    assert "Retry-After" in res5.headers

    # Subsequent attempt 6 remains locked out with 429
    res6 = client.post("/api/v1/auth/login", json=bad_payload)
    assert res6.status_code == 429
    assert "Retry-After" in res6.headers

    login_rate_limiter.reset_all()

def test_auditor_role_strictly_read_only(client, auditor_token):
    """Verify that Read-Only Auditor has visibility with redacted PII and cannot mutate state."""
    # 1. Auditor can view complaints list
    list_res = client.get(
        "/api/v1/complaints",
        headers={"Authorization": f"Bearer {auditor_token}"}
    )
    assert list_res.status_code == 200
    items = list_res.json()["items"]
    assert len(items) > 0
    # Complainant email is redacted for auditor
    assert items[0]["complainant_email"] == "[REDACTED_FOR_AUDIT]"
    assert items[0]["complainant_phone"] == "[REDACTED_FOR_AUDIT]"

    # 2. Auditor CANNOT lodge a complaint
    inst_res = client.get("/api/v1/institutions")
    inst_id = inst_res.json()[0]["id"]
    new_case = {
        "institution_id": inst_id,
        "bureau": "PGRC",
        "complainant_name": "Auditor Complainant",
        "complainant_category": "FACULTY",
        "complainant_email": "auditor@test.org",
        "subject": "Auditor illegal lodge test",
        "description": "Auditor should not be allowed to file complaints.",
        "category": "FACULTY_SALARY_WITHHELD",
        "priority": "HIGH"
    }
    lodge_res = client.post(
        "/api/v1/complaints",
        json=new_case,
        headers={"Authorization": f"Bearer {auditor_token}"}
    )
    assert lodge_res.status_code == 403
    assert "auditor" in lodge_res.json()["detail"].lower()

    # 3. Auditor CANNOT update status
    target_case_id = items[0]["id"]
    status_res = client.patch(
        f"/api/v1/complaints/{target_case_id}/status",
        json={"status": "UNDER_INQUIRY", "notes": "Auditor illegal update."},
        headers={"Authorization": f"Bearer {auditor_token}"}
    )
    assert status_res.status_code == 403
    assert "auditor" in status_res.json()["detail"].lower()

    # 4. Auditor CANNOT assign officer
    assign_res = client.post(
        f"/api/v1/complaints/{target_case_id}/assign",
        json={"officer_id": 1, "notes": "Auditor illegal assign."},
        headers={"Authorization": f"Bearer {auditor_token}"}
    )
    assert assign_res.status_code == 403
    assert "auditor" in assign_res.json()["detail"].lower()

    # 5. Auditor CANNOT transfer case
    move_res = client.post(
        f"/api/v1/movements/complaint/{target_case_id}",
        json={"to_bureau": "LEGAL_CELL", "reason": "Auditor illegal transfer."},
        headers={"Authorization": f"Bearer {auditor_token}"}
    )
    assert move_res.status_code == 403
    assert "auditor" in move_res.json()["detail"].lower()

def test_cross_bureau_access_enforcement(client, rb_officer_token, pgrc_officer_token):
    """Verify that Case Officers cannot alter cases outside their assigned bureau."""
    # Find a PGRC case
    pgrc_case = client.get("/api/v1/complaints?bureau=PGRC").json()["items"][0]
    pgrc_id = pgrc_case["id"]

    # Find a Regulation Bureau case
    rb_case = client.get("/api/v1/complaints?bureau=REGULATION_BUREAU").json()["items"][0]
    rb_id = rb_case["id"]

    # 1. Regulation Bureau officer attempts to change status of PGRC case -> 403
    res1 = client.patch(
        f"/api/v1/complaints/{pgrc_id}/status",
        json={"status": "UNDER_INQUIRY", "notes": "RB officer poking into PGRC case."},
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert res1.status_code == 403
    assert "Cross-bureau access denied" in res1.json()["detail"]

    # 2. PGRC officer attempts to change status of RB case -> 403
    res2 = client.patch(
        f"/api/v1/complaints/{rb_id}/status",
        json={"status": "UNDER_INQUIRY", "notes": "PGRC officer poking into RB case."},
        headers={"Authorization": f"Bearer {pgrc_officer_token}"}
    )
    assert res2.status_code == 403
    assert "Cross-bureau access denied" in res2.json()["detail"]

    # 3. RB officer attempts to assign officer on PGRC case -> 403
    res3 = client.post(
        f"/api/v1/complaints/{pgrc_id}/assign",
        json={"officer_id": 1, "notes": "RB officer cross-assigning PGRC case."},
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert res3.status_code == 403
    assert "Cross-bureau access denied" in res3.json()["detail"] or "prohibited" in res3.json()["detail"].lower()

    # 4. RB officer attempts to initiate transfer of PGRC case -> 403
    res4 = client.post(
        f"/api/v1/movements/complaint/{pgrc_id}",
        json={"to_bureau": "LEGAL_CELL", "reason": "Unauthorized cross-bureau transfer request."},
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert res4.status_code == 403
    assert "cannot initiate transfer for a case managed by PGRC" in res4.json()["detail"]

def test_inter_bureau_transfer_decision_restricted_to_target_bureau(
    client, rb_officer_token, rb_admin_token, pgrc_admin_token
):
    """Verify that transfer decisions can only be made by the target receiving bureau administrator."""
    # Find an RB complaint and request transfer to PGRC
    rb_case = client.get("/api/v1/complaints?bureau=REGULATION_BUREAU").json()["items"][0]
    c_id = rb_case["id"]

    transfer_req = {
        "to_bureau": "PGRC",
        "movement_type": "TRANSFER_REQUEST",
        "reason": "Student grievance component requires PGRC handling."
    }
    req_res = client.post(
        f"/api/v1/movements/complaint/{c_id}",
        json=transfer_req,
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert req_res.status_code == 201
    movement_id = req_res.json()["id"]

    # Sending bureau (RB Admin) attempts to approve its own transfer -> 403 Forbidden!
    illegal_decide_res = client.patch(
        f"/api/v1/movements/{movement_id}/decide",
        json={"decision": "ACCEPTED", "notes": "RB Admin trying to self-approve transfer to PGRC."},
        headers={"Authorization": f"Bearer {rb_admin_token}"}
    )
    assert illegal_decide_res.status_code == 403
    assert "Transfer is addressed to PGRC" in illegal_decide_res.json()["detail"] or "receiving bureau" in illegal_decide_res.json()["detail"]

    # Receiving bureau (PGRC Admin) approves -> 200 OK!
    legal_decide_res = client.patch(
        f"/api/v1/movements/{movement_id}/decide",
        json={"decision": "ACCEPTED", "notes": "PGRC accepts case transfer."},
        headers={"Authorization": f"Bearer {pgrc_admin_token}"}
    )
    assert legal_decide_res.status_code == 200
    assert legal_decide_res.json()["status"] == "ACCEPTED"

def test_case_officer_cannot_close_or_dispose_case(client, rb_officer_token, rb_admin_token):
    """Verify that Case Officers cannot prematurely close or dispose cases without Bureau Admin authorization."""
    rb_case = client.get("/api/v1/complaints?bureau=REGULATION_BUREAU").json()["items"][0]
    c_id = rb_case["id"]

    # Case Officer attempts RESOLVED -> 403 Forbidden
    officer_close_res = client.patch(
        f"/api/v1/complaints/{c_id}/status",
        json={"status": "RESOLVED", "notes": "Officer trying to close case unilaterally."},
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert officer_close_res.status_code == 403
    assert "Final case closure" in officer_close_res.json()["detail"] or "Bureau Administrator" in officer_close_res.json()["detail"]

    # Bureau Admin CAN transition to RESOLVED -> 200 OK
    admin_close_res = client.patch(
        f"/api/v1/complaints/{c_id}/status",
        json={
            "status": "RESOLVED",
            "notes": "Bureau Head verified compliance and approved closure.",
            "resolution_summary": "Deficiency cured and compliance confirmed by scrutiny committee."
        },
        headers={"Authorization": f"Bearer {rb_admin_token}"}
    )
    assert admin_close_res.status_code == 200
    assert admin_close_res.json()["status"] == "RESOLVED"

def test_admin_endpoints_privilege_escalation_protection(
    client, rb_officer_token, rb_admin_token, auditor_token, admin_token, db_session
):
    """Verify that admin endpoints are restricted to Super Administrator and prevent self-demotion."""
    # 1. Non-admin roles rejected from GET /admin/users
    assert client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {rb_officer_token}"}).status_code == 403
    assert client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {rb_admin_token}"}).status_code == 403
    assert client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {auditor_token}"}).status_code == 403

    # 2. Super Admin succeeds
    admin_res = client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_res.status_code == 200
    assert len(admin_res.json()) >= 6

    # 3. Non-admin cannot promote anyone
    target_user = db_session.query(User).filter(User.role == "CASE_OFFICER").first()
    res_escalate = client.patch(
        f"/api/v1/admin/users/{target_user.id}/role",
        json={"role": "SUPER_ADMIN", "bureau": "CENTRAL_ADMIN"},
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert res_escalate.status_code == 403

    # 4. Super Admin cannot modify own role (self-demotion protection)
    super_admin = db_session.query(User).filter(User.role == "SUPER_ADMIN").first()
    res_self_demote = client.patch(
        f"/api/v1/admin/users/{super_admin.id}/role",
        json={"role": "AUDITOR", "bureau": "CENTRAL_ADMIN"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_self_demote.status_code == 400
    assert "Administrators cannot alter their own role" in res_self_demote.json()["detail"] or "Self-modification prohibited" in res_self_demote.json()["detail"]

def test_super_admin_cross_bureau_supervision(client, admin_token):
    """Verify that Super Administrator has global cross-bureau oversight and action permissions."""
    # Update status on PGRC case as Super Admin
    pgrc_case = client.get("/api/v1/complaints?bureau=PGRC").json()["items"][0]
    res1 = client.patch(
        f"/api/v1/complaints/{pgrc_case['id']}/status",
        json={"status": "UNDER_INQUIRY", "notes": "Super Admin apex direct inquiry order."},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res1.status_code == 200
    assert res1.json()["status"] == "UNDER_INQUIRY"

    # Update status on Regulation Bureau case as Super Admin
    rb_case = client.get("/api/v1/complaints?bureau=REGULATION_BUREAU").json()["items"][0]
    res2 = client.patch(
        f"/api/v1/complaints/{rb_case['id']}/status",
        json={"status": "ESCALATED", "notes": "Super Admin escalated case to council."},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res2.status_code == 200
    assert res2.json()["status"] == "ESCALATED"

def test_cookie_session_and_csrf_protection(client, rb_admin_token):
    """Verify HTTP-only cookie session authentication and CSRF token enforcement."""
    # 1. Login and observe cookies
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "head.rb@samanvay.aicte.gov.in", "password": "Demo@AICTE2026!"}
    )
    assert login_res.status_code == 200
    cookies = login_res.cookies
    assert "access_token" in cookies
    assert "csrf_token" in cookies
    csrf_val = cookies["csrf_token"]

    # 2. Attempt mutating request using cookie authentication WITHOUT CSRF token -> 403
    client.cookies.set("access_token", cookies["access_token"])
    client.cookies.set("csrf_token", csrf_val)

    rb_case = client.get("/api/v1/complaints?bureau=REGULATION_BUREAU").json()["items"][0]
    c_id = rb_case["id"]

    # No X-CSRF-Token header
    res_no_csrf = client.patch(
        f"/api/v1/complaints/{c_id}/status",
        json={"status": "UNDER_INQUIRY", "notes": "Attempt without CSRF header."}
    )
    assert res_no_csrf.status_code == 403
    assert "CSRF verification failed" in res_no_csrf.json()["detail"]

    # 3. Mutating request WITH valid X-CSRF-Token header -> 200 OK
    res_with_csrf = client.patch(
        f"/api/v1/complaints/{c_id}/status",
        json={"status": "UNDER_INQUIRY", "notes": "Authorized with CSRF header."},
        headers={"X-CSRF-Token": csrf_val}
    )
    assert res_with_csrf.status_code == 200
    assert res_with_csrf.json()["status"] == "UNDER_INQUIRY"

    # 4. Logout clears cookies (requires CSRF header when using cookie auth)
    logout_res = client.post("/api/v1/auth/logout", headers={"X-CSRF-Token": csrf_val})
    assert logout_res.status_code == 200
    client.cookies.clear()

def test_audit_trail_sanitization_no_sensitive_secrets(client, db_session):
    """Verify authentication and authorization events are audited without leaking passwords or tokens."""
    # Trigger a failed login
    client.post(
        "/api/v1/auth/login",
        json={"email": "test.probe@samanvay.aicte.gov.in", "password": "SuperSecretPassword123!"}
    )

    # Inspect audit logs in database
    logs = db_session.query(AuditLog).filter(AuditLog.action_type == "LOGIN_FAILED").all()
    assert len(logs) > 0
    latest_log = logs[-1]

    # Verify no passwords or secret tokens leaked into description or states
    assert "SuperSecretPassword123!" not in (latest_log.description or "")
    assert "SuperSecretPassword123!" not in (latest_log.new_state or "")
    assert "SuperSecretPassword123!" not in (latest_log.previous_state or "")

def test_setup_dev_admin_cli_safety(db_session, monkeypatch):
    """Verify dev admin setup script creates dev admin safely and aborts in production."""
    from backend.app.core.setup_dev_admin import create_development_admin

    # In test/dev environment, command succeeds
    dev_admin = create_development_admin(db_session)
    assert dev_admin.email == "dev.admin@samanvay.aicte.gov.in"
    assert dev_admin.role == "SUPER_ADMIN"

    # In production environment, command must raise RuntimeError
    monkeypatch.setattr(settings, "APP_ENV", "production")
    with pytest.raises(RuntimeError) as exc_info:
        create_development_admin(db_session)
    assert "CRITICAL SECURITY VIOLATION" in str(exc_info.value)
