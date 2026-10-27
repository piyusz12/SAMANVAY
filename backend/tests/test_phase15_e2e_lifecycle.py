import io
import pytest
from backend.app.models.complaint import Complaint
from backend.app.models.institution import Institution
from backend.app.models.user import User
from backend.app.services.auth_service import create_access_token

@pytest.fixture
def super_admin_token(db_session):
    user = db_session.query(User).filter(User.role == "SUPER_ADMIN").first()
    return create_access_token(subject=user.id)

@pytest.fixture
def rb_admin_token(db_session):
    user = db_session.query(User).filter(User.email == "head.rb@samanvay.aicte.gov.in").first()
    return create_access_token(subject=user.id)

@pytest.fixture
def pgrc_admin_token(db_session):
    user = db_session.query(User).filter(User.email == "head.pgrc@samanvay.aicte.gov.in").first()
    return create_access_token(subject=user.id)

@pytest.fixture
def rb_officer_token(db_session):
    user = db_session.query(User).filter(User.email == "officer.rb@samanvay.aicte.gov.in").first()
    return create_access_token(subject=user.id)

def test_full_complaint_lifecycle_e2e(
    client,
    super_admin_token,
    rb_admin_token,
    pgrc_admin_token,
    rb_officer_token,
    db_session
):
    """
    Comprehensive End-to-End Regulatory Complaint Lifecycle:
    Intake -> Overlap Detection -> Linkage & Workspace -> Assignment -> Notice ->
    Cross-Bureau Collaboration & Concurrence -> Deadline Alert -> Evidence -> Disposal -> Audit Hash Verification
    """
    inst = db_session.query(Institution).first()
    assert inst is not None

    # -------------------------------------------------------------------------
    # STEP 1: Lodge Complaint #1 in Regulation Bureau
    # -------------------------------------------------------------------------
    case1_payload = {
        "institution_id": inst.id,
        "bureau": "REGULATION_BUREAU",
        "subject": "Severe Lab Infrastructure Deficit and Unsafe Workshop Equipment",
        "description": "Mechanical engineering workshop lacks safety guards, ventilators, and calibrated testing machines.",
        "category": "INFRASTRUCTURE_DEFICIT",
        "priority": "HIGH",
        "complainant_name": "Faculty Welfare Association",
        "complainant_category": "FACULTY",
        "complainant_email": "faculty@aicte-inst.edu.in",
        "sla_deadline_days": 30
    }
    resp1 = client.post(
        "/api/v1/complaints",
        json=case1_payload,
        headers={"Authorization": f"Bearer {rb_admin_token}"}
    )
    assert resp1.status_code == 201
    case1 = resp1.json()
    case1_id = case1["id"]
    assert case1["complaint_no"].startswith("AICTE/RB/")

    # -------------------------------------------------------------------------
    # STEP 2: Lodge Complaint #2 in PGRC against SAME institution (Semantic Overlap)
    # -------------------------------------------------------------------------
    case2_payload = {
        "institution_id": inst.id,
        "bureau": "PGRC",
        "subject": "Defective Lab Machinery and Student Safety Hazards in Mechanical Workshop",
        "description": "Students forced to operate uncalibrated testing machines with broken safety guards in mechanical lab.",
        "category": "INFRASTRUCTURE_DEFICIT",
        "priority": "HIGH",
        "complainant_name": "Student Council President",
        "complainant_category": "STUDENT",
        "complainant_email": "students@aicte-inst.edu.in",
        "sla_deadline_days": 30
    }
    resp2 = client.post(
        "/api/v1/complaints",
        json=case2_payload,
        headers={"Authorization": f"Bearer {pgrc_admin_token}"}
    )
    assert resp2.status_code == 201
    case2 = resp2.json()
    case2_id = case2["id"]

    # -------------------------------------------------------------------------
    # STEP 3: Automated Overlap Detection Engine & Explainable Similarity
    # -------------------------------------------------------------------------
    sim_resp = client.post(
        "/api/v1/similarity/check",
        json={
            "institution_id": inst.id,
            "subject": case2_payload["subject"],
            "description": case2_payload["description"],
            "category": case2_payload["category"]
        },
        headers={"Authorization": f"Bearer {super_admin_token}"}
    )
    assert sim_resp.status_code == 200
    sim_data = sim_resp.json()
    assert len(sim_data["matches"]) > 0
    top_match = sim_data["matches"][0]
    assert top_match["similarity_score"] >= 0.5
    assert "explanation" in top_match

    # -------------------------------------------------------------------------
    # STEP 4: Link Overlapping Cases into a Joint Case Group
    # -------------------------------------------------------------------------
    link_resp = client.post(
        "/api/v1/similarity/link",
        json={
            "source_complaint_id": case1_id,
            "target_complaint_id": case2_id,
            "link_type": "RELATED_SERIES",
            "similarity_score": top_match["similarity_score"],
            "explanation": top_match["explanation"],
            "notes": "Verified joint inquiry needed for mechanical workshop infrastructure violations."
        },
        headers={"Authorization": f"Bearer {super_admin_token}"}
    )
    assert link_resp.status_code == 201
    linkage = link_resp.json()
    linkage_id = linkage["id"]

    # -------------------------------------------------------------------------
    # STEP 5: Assign Case Officer & Transition Case 1 to UNDER_INQUIRY
    # -------------------------------------------------------------------------
    rb_officer = db_session.query(User).filter(User.email == "officer.rb@samanvay.aicte.gov.in").first()
    mv_resp = client.patch(
        f"/api/v1/complaints/{case1_id}/status",
        json={
            "status": "UNDER_INQUIRY",
            "action_taken": f"Assigned to {rb_officer.full_name}. Inquiry Notice issued to Principal.",
            "reason": "Preliminary scrutiny revealed substantial compliance failure."
        },
        headers={"Authorization": f"Bearer {rb_admin_token}"}
    )
    assert mv_resp.status_code == 200
    assert mv_resp.json()["status"] == "UNDER_INQUIRY"

    # -------------------------------------------------------------------------
    # STEP 6: Coordination Workspace Task Creation & Concurrence Voting
    # -------------------------------------------------------------------------
    task_resp = client.post(
        f"/api/v1/coordination/workspaces/{linkage_id}/tasks",
        json={
            "title": "Conduct joint on-site physical inspection of mechanical labs",
            "assigned_bureau": "REGULATION_BUREAU",
            "assigned_officer_id": rb_officer.id,
            "priority": "HIGH",
            "deadline": "2026-11-15T18:00:00Z"
        },
        headers={"Authorization": f"Bearer {rb_admin_token}"}
    )
    assert task_resp.status_code == 201
    assert task_resp.json()["title"] == "Conduct joint on-site physical inspection of mechanical labs"

    # Joint coordination decision from PGRC
    decision_resp = client.post(
        f"/api/v1/coordination/workspaces/{linkage_id}/decision",
        json={
            "coordination_decision": "JOINT_INSPECTION",
            "lead_bureau": "REGULATION_BUREAU",
            "coordination_notes": "Both bureaus concurred on a joint physical inspection of mechanical labs."
        },
        headers={"Authorization": f"Bearer {pgrc_admin_token}"}
    )
    assert decision_resp.status_code == 200

    # -------------------------------------------------------------------------
    # STEP 7: Deadline Worker Check & Notification Verification
    # -------------------------------------------------------------------------
    sched_resp = client.post(
        "/api/v1/alerts/run-scheduler",
        headers={"Authorization": f"Bearer {rb_admin_token}"}
    )
    assert sched_resp.status_code == 200
    sched_data = sched_resp.json()
    assert "alerts_created" in sched_data or "checks_performed" in sched_data

    # Verify notifications center
    notif_resp = client.get(
        "/api/v1/notifications",
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert notif_resp.status_code == 200

    # -------------------------------------------------------------------------
    # STEP 8: Evidence Upload & Download Authorization Check
    # -------------------------------------------------------------------------
    mock_pdf = io.BytesIO(b"%PDF-1.4 Joint inspection report evidence content")
    upload_resp = client.post(
        f"/api/v1/complaints/{case1_id}/upload",
        files={"file": ("joint_inspection_report.pdf", mock_pdf, "application/pdf")},
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert upload_resp.status_code == 200
    att_data = upload_resp.json()
    assert att_data["sha256"] is not None
    att_id = att_data["attachment_id"]

    # Download by authorized officer -> 200
    dl_resp = client.get(
        f"/api/v1/evidence/{att_id}/download",
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert dl_resp.status_code == 200
    assert dl_resp.content == b"%PDF-1.4 Joint inspection report evidence content"

    # -------------------------------------------------------------------------
    # STEP 9: Final Resolution & Case Disposal
    # -------------------------------------------------------------------------
    resolve_resp = client.patch(
        f"/api/v1/complaints/{case1_id}/status",
        json={
            "status": "RESOLVED",
            "action_taken": "Institution rectified workshop machinery and submitted compliance affidavit.",
            "reason": "Council accepted compliance report and closed case.",
            "resolution_summary": "Full compliance achieved. All machinery guarded."
        },
        headers={"Authorization": f"Bearer {rb_admin_token}"}
    )
    assert resolve_resp.status_code == 200
    assert resolve_resp.json()["status"] == "RESOLVED"

    # -------------------------------------------------------------------------
    # STEP 10: Cryptographic Audit Trail Chaining Verification
    # -------------------------------------------------------------------------
    integrity_resp = client.get(
        "/api/v1/audit/verify-integrity",
        headers={"Authorization": f"Bearer {super_admin_token}"}
    )
    assert integrity_resp.status_code == 200
    integrity_data = integrity_resp.json()
    assert integrity_data["is_intact"] is True
    assert integrity_data["total_records"] > 0
    assert integrity_data["head_hash"] is not None
