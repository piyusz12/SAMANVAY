import pytest
from backend.app.models.complaint import Complaint
from backend.app.models.institution import Institution
from backend.app.models.user import User
from backend.app.services.auth_service import create_access_token

@pytest.fixture
def auth_tokens(db_session):
    """Generates explicit JWT tokens for all key roles and bureaus."""
    def get_token(email):
        user = db_session.query(User).filter(User.email == email).first()
        assert user is not None, f"User {email} not found in seeded database"
        return create_access_token(subject=user.id)

    return {
        "super_admin": get_token("admin@samanvay.aicte.gov.in"),
        "rb_admin": get_token("head.rb@samanvay.aicte.gov.in"),
        "pgrc_admin": get_token("head.pgrc@samanvay.aicte.gov.in"),
        "rb_officer": get_token("officer.rb@samanvay.aicte.gov.in"),
        "pgrc_officer": get_token("officer.pgrc@samanvay.aicte.gov.in"),
        "auditor": get_token("auditor@samanvay.aicte.gov.in")
    }

# =========================================================================
# 1. READ PERMISSION MATRIX ACROSS BUREAUS
# =========================================================================

def test_super_admin_can_access_cases_across_all_bureaus(client, auth_tokens, db_session):
    """Super Admin has omniscient access to complaints from any bureau."""
    rb_case = db_session.query(Complaint).filter(Complaint.bureau == "REGULATION_BUREAU").first()
    pgrc_case = db_session.query(Complaint).filter(Complaint.bureau == "PGRC").first()
    assert rb_case and pgrc_case

    for case in [rb_case, pgrc_case]:
        resp = client.get(
            f"/api/v1/complaints/{case.id}",
            headers={"Authorization": f"Bearer {auth_tokens['super_admin']}"}
        )
        assert resp.status_code == 200
        assert resp.json()["id"] == case.id

def test_bureau_officer_cross_bureau_isolation(client, auth_tokens, db_session):
    """
    Regulation Bureau officer:
    - CAN access Regulation Bureau cases.
    - CANNOT access PGRC cases without linkage (returns 403 Forbidden).
    """
    rb_case = db_session.query(Complaint).filter(Complaint.bureau == "REGULATION_BUREAU").first()
    pgrc_case = db_session.query(Complaint).filter(Complaint.bureau == "PGRC").first()

    # Access own bureau -> 200
    resp_own = client.get(
        f"/api/v1/complaints/{rb_case.id}",
        headers={"Authorization": f"Bearer {auth_tokens['rb_officer']}"}
    )
    assert resp_own.status_code == 200

    # Access cross-bureau -> 403
    resp_cross = client.get(
        f"/api/v1/complaints/{pgrc_case.id}",
        headers={"Authorization": f"Bearer {auth_tokens['rb_officer']}"}
    )
    assert resp_cross.status_code == 403
    assert "cross-bureau access denied" in resp_cross.json()["detail"].lower()

# =========================================================================
# 2. MUTATION & STATE TRANSITION PERMISSION MATRIX
# =========================================================================

def test_cross_bureau_officer_cannot_record_case_movement(client, auth_tokens, db_session):
    """PGRC officer cannot record a case movement or note on a Regulation Bureau case."""
    rb_case = db_session.query(Complaint).filter(Complaint.bureau == "REGULATION_BUREAU").first()

    status_payload = {
        "status": "UNDER_INQUIRY",
        "action_taken": "Unauthorized status update attempt",
        "reason": "Security regression check"
    }

    resp = client.patch(
        f"/api/v1/complaints/{rb_case.id}/status",
        json=status_payload,
        headers={"Authorization": f"Bearer {auth_tokens['pgrc_officer']}"}
    )
    assert resp.status_code == 403

def test_auditor_is_strictly_read_only_and_cannot_mutate(client, auth_tokens, db_session):
    """
    Auditor has access to review audit logs and complaints, but is strictly
    forbidden from creating complaints, mutating cases, or triggering mutating jobs.
    """
    inst = db_session.query(Institution).first()

    # 1. Attempt to create complaint -> 403
    resp_create = client.post(
        "/api/v1/complaints",
        json={
            "institution_id": inst.id,
            "bureau": "PGRC",
            "subject": "Auditor lodging test",
            "description": "This should be rejected by RBAC.",
            "category": "FEE_EXTORTION",
            "priority": "LOW",
            "complainant_name": "Auditor Test Complainant",
            "complainant_category": "CITIZEN"
        },
        headers={"Authorization": f"Bearer {auth_tokens['auditor']}"}
    )
    assert resp_create.status_code == 403

    # 2. Attempt to trigger scheduler -> 403
    resp_sched = client.post(
        "/api/v1/alerts/run-scheduler",
        headers={"Authorization": f"Bearer {auth_tokens['auditor']}"}
    )
    assert resp_sched.status_code == 403

    # 3. Attempt to create backup -> 403
    resp_backup = client.post(
        "/api/v1/admin/backups/create",
        headers={"Authorization": f"Bearer {auth_tokens['auditor']}"}
    )
    assert resp_backup.status_code == 403

# =========================================================================
# 3. ADMINISTRATIVE WORKFLOW & BACKUP ACCESS MATRIX
# =========================================================================

def test_backup_and_retention_role_boundaries(client, auth_tokens):
    """Only Super Admin can generate backups. Bureau Admin & Officers are blocked."""
    # Bureau Admin attempt -> 403
    resp_admin = client.post(
        "/api/v1/admin/backups/create",
        headers={"Authorization": f"Bearer {auth_tokens['rb_admin']}"}
    )
    assert resp_admin.status_code == 403

    # Officer attempt -> 403
    resp_officer = client.post(
        "/api/v1/admin/backups/create",
        headers={"Authorization": f"Bearer {auth_tokens['rb_officer']}"}
    )
    assert resp_officer.status_code == 403

    # Super Admin attempt -> 200
    resp_sa = client.post(
        "/api/v1/admin/backups/create",
        headers={"Authorization": f"Bearer {auth_tokens['super_admin']}"}
    )
    assert resp_sa.status_code == 200
