"""
SAMANVAY (SIH PS 26264) — Phase 18: SIH Demonstration & Final Acceptance Automated Test

Executes the exact 10-step repeatable live demonstration scenario programmatically:
1. Log in as an authorized officer.
2. Locate or register an institution.
3. Create complaints across two different bureaus.
4. Show overlap engine identifying potential relationships with feature rationale.
5. Review and confirm or dismiss the relationship.
6. Assign a coordination action and deadline.
7. Demonstrate notification and escalation behavior using controlled virtual time.
8. Display updated dashboards and reports.
9. Demonstrate restricted access using different roles (Auditor read-only, cross-bureau boundaries).
10. Inspect the audit history and verify independent timelines of linked cases.
"""

import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.database import SessionLocal
from backend.app.models.complaint import Complaint
from backend.app.models.institution import Institution
from backend.app.models.user import User
from backend.app.services.auth_service import get_password_hash
from infrastructure.scripts.seed_demo_data import seed_demo_dataset

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def prepare_demo_db():
    """Seeds the clean SIH demonstration dataset before running the scenario."""
    db = SessionLocal()
    try:
        seed_demo_dataset(db, reset=True)
    finally:
        db.close()


def get_auth_token(email: str, password: str = "Demo@AICTE2026!") -> str:
    """Helper to authenticate and retrieve a valid Bearer token."""
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Authentication failed for {email}: {res.text}"
    return res.json()["access_token"]


def test_sih_demo_full_10_step_scenario():
    """Validates the complete 10-step SIH demonstration workflow end-to-end."""
    
    # =========================================================================
    # Step 1: Log in as an authorized officer
    # =========================================================================
    pgrc_officer_token = get_auth_token("officer.pgrc@samanvay.aicte.gov.in")
    headers_pgrc = {"Authorization": f"Bearer {pgrc_officer_token}"}

    res_me = client.get("/api/v1/auth/me", headers=headers_pgrc)
    assert res_me.status_code == 200
    user_info = res_me.json()
    assert user_info["email"] == "officer.pgrc@samanvay.aicte.gov.in"
    assert user_info["role"] == "CASE_OFFICER"
    assert user_info["bureau"] == "PGRC"

    # =========================================================================
    # Step 2: Register or locate an institution
    # =========================================================================
    res_inst = client.get("/api/v1/institutions?search=Delhi%20Institute", headers=headers_pgrc)
    assert res_inst.status_code == 200
    inst_results = res_inst.json()
    assert len(inst_results) >= 1
    target_inst = inst_results[0]
    assert target_inst["aicte_id"] == "1-99887766"
    assert "Delhi Institute of Technology & Management" in target_inst["name"]
    inst_id = target_inst["id"]

    # =========================================================================
    # Step 3: Create complaints in two different bureaus
    # =========================================================================
    # Case A: Created in APPROVAL_BUREAU
    app_officer_token = get_auth_token("officer.approval@samanvay.aicte.gov.in")
    headers_app = {"Authorization": f"Bearer {app_officer_token}"}

    payload_case_a = {
        "institution_id": inst_id,
        "bureau": "APPROVAL_BUREAU",
        "category": "UNAPPROVED_COURSES",
        "priority": "HIGH",
        "complainant_name": "State Technical Board [SYNTHETIC]",
        "complainant_category": "CITIZEN",
        "subject": "Illegal unapproved 60-seat B.Tech CSE expansion batch",
        "description": "Institution admitted 180 students against sanctioned limit of 120 in Computer Science engineering for AY 2026-27 without Extension of Approval.",
        "sla_deadline_days": 30
    }
    res_case_a = client.post("/api/v1/complaints/", json=payload_case_a, headers=headers_app)
    assert res_case_a.status_code == 201
    case_a = res_case_a.json()
    case_a_id = case_a["id"]
    case_a_no = case_a["complaint_no"]

    # Case B: Created in PGRC (Student/Parent grievance)
    payload_case_b = {
        "institution_id": inst_id,
        "bureau": "PGRC",
        "category": "FEE_EXTORTION",
        "priority": "HIGH",
        "complainant_name": "Ramesh Gupta [SYNTHETIC]",
        "complainant_category": "PARENT",
        "complainant_email": "ramesh.parent@synthetic.in",
        "subject": "Exorbitant cash capitation fee demanded for Computer Science branch seat",
        "description": "College management demanded additional unreceipted cash donation of Rs 3,00,000 for Computer Science seat in second shift batch.",
        "sla_deadline_days": 30
    }
    res_case_b = client.post("/api/v1/complaints/", json=payload_case_b, headers=headers_pgrc)
    assert res_case_b.status_code == 201
    case_b = res_case_b.json()
    case_b_id = case_b["id"]
    case_b_no = case_b["complaint_no"]

    # =========================================================================
    # Step 4: Overlap engine identifies potential relationship and explains why
    # =========================================================================
    res_overlap = client.post(
        "/api/v1/similarity/check",
        json={
            "subject": payload_case_b["subject"],
            "description": payload_case_b["description"],
            "institution_id": inst_id,
            "category": payload_case_b["category"],
            "exclude_complaint_id": case_b_id
        },
        headers=headers_pgrc
    )
    assert res_overlap.status_code == 200
    overlap_data = res_overlap.json()
    assert len(overlap_data["matches"]) >= 1

    # Check top candidate details and explainability breakdown
    top_match = overlap_data["matches"][0]
    assert top_match["similarity_score"] >= 0.70
    assert top_match["confidence_tier"] in ("HIGH", "MEDIUM")
    assert top_match["explanation"]["institution_match"] is True
    assert len(top_match["reasons"]) >= 1
    assert "rationale" in top_match["explanation"]
    assert top_match["explanation"]["rationale"] != ""

    # =========================================================================
    # Step 5: Review and confirm or dismiss the relationship
    # =========================================================================
    payload_link = {
        "source_complaint_id": case_a_id,
        "target_complaint_id": case_b_id,
        "link_type": "CROSS_BUREAU_OVERLAP",
        "similarity_score": top_match["similarity_score"],
        "explanation": top_match["explanation"],
        "rationale": "Officer confirmation: Concurrent active complaints across Approval Bureau and PGRC for Delhi Institute regarding unapproved CSE intake and capitation fees.",
        "notes": "Reviewed and confirmed during SIH evaluation demonstration."
    }
    res_link = client.post("/api/v1/similarity/link", json=payload_link, headers=headers_pgrc)
    assert res_link.status_code == 201
    linkage = res_link.json()
    linkage_id = linkage["id"]
    assert linkage["status"] == "CONFIRMED_RELATED"

    # =========================================================================
    # Step 6: Assign a coordination action and deadline
    # =========================================================================
    admin_token = get_auth_token("admin@samanvay.aicte.gov.in")
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    deadline_iso = (datetime.now(timezone.utc) + timedelta(days=10)).strftime("%Y-%m-%dT%H:%M:%SZ")
    payload_decision = {
        "coordination_decision": "JOINT_INQUIRY",
        "coordination_notes": "Approval Bureau and PGRC directed to conduct joint inquiry into unapproved intake and cash capitation before issuing final EoA sanction.",
        "lead_bureau": "APPROVAL_BUREAU",
        "coordination_deadline": deadline_iso
    }
    res_decision = client.post(
        f"/api/v1/coordination/workspaces/{linkage_id}/decision",
        json=payload_decision,
        headers=headers_admin
    )
    assert res_decision.status_code == 200
    workspace = res_decision.json()
    assert workspace["coordination_decision"] == "JOINT_INQUIRY"
    assert workspace["lead_bureau"] == "APPROVAL_BUREAU"

    # Assign coordination follow-up task
    payload_task = {
        "title": "Conduct joint on-site physical scrutiny of AY 2026 admissions [DEMO]",
        "description": "Joint team to inspect student attendance register, fee challans, and intake approvals.",
        "target_bureau": "APPROVAL_BUREAU",
        "priority": "HIGH",
        "deadline": deadline_iso
    }
    res_task = client.post(
        f"/api/v1/coordination/workspaces/{linkage_id}/tasks",
        json=payload_task,
        headers=headers_admin
    )
    assert res_task.status_code in (200, 201)
    task_out = res_task.json()
    assert task_out["title"] == payload_task["title"]

    # =========================================================================
    # Step 7: Demonstrate notification and escalation behavior using controlled test time
    # =========================================================================
    # Move simulated virtual clock 40 days into the future to trigger automated SLA breach escalations
    future_time_iso = (datetime.now(timezone.utc) + timedelta(days=40)).strftime("%Y-%m-%dT%H:%M:%SZ")
    res_scheduler = client.post(
        f"/api/v1/alerts/run-scheduler?simulated_time={future_time_iso}",
        headers=headers_admin
    )
    assert res_scheduler.status_code == 200
    scheduler_result = res_scheduler.json()
    assert "alerts_created" in scheduler_result
    assert "escalations_triggered" in scheduler_result
    assert scheduler_result["escalations_triggered"] >= 1

    # Verify notifications were created
    res_notifs = client.get("/api/v1/notifications", headers=headers_pgrc)
    assert res_notifs.status_code == 200
    notif_list = res_notifs.json()
    assert len(notif_list) >= 1

    # =========================================================================
    # Step 8: Display updated dashboards and reports
    # =========================================================================
    res_analytics = client.get("/api/v1/analytics/overview", headers=headers_admin)
    assert res_analytics.status_code == 200
    overview = res_analytics.json()
    assert overview["total_complaints_received"] >= 12
    assert overview["conflicting_institutions_count"] >= 1
    assert "bureau_metrics" in overview
    assert "ageing_distribution" in overview

    # Verify report generation endpoint
    res_report = client.get("/api/v1/reports/bureau", headers=headers_admin)
    assert res_report.status_code == 200
    report_data = res_report.json()
    assert "metadata" in report_data
    assert "report_title" in report_data["metadata"]
    assert "data" in report_data

    # =========================================================================
    # Step 9: Demonstrate restricted access using different roles
    # =========================================================================
    # 9a. Auditor is READ-ONLY: Attempt to lodge complaint must return 403 Forbidden
    auditor_token = get_auth_token("auditor@samanvay.aicte.gov.in")
    headers_auditor = {"Authorization": f"Bearer {auditor_token}"}
    res_auditor_lodge = client.post(
        "/api/v1/complaints/",
        json=payload_case_a,
        headers=headers_auditor
    )
    assert res_auditor_lodge.status_code == 403
    assert "Auditor" in res_auditor_lodge.text or "read-only" in res_auditor_lodge.text.lower()

    # 9b. Bureau Officer boundary: Officer from Regulation Bureau cannot link cases between PGRC & Approval Bureau
    rb_officer_token = get_auth_token("officer.rb@samanvay.aicte.gov.in")
    headers_rb = {"Authorization": f"Bearer {rb_officer_token}"}
    res_rb_link = client.post(
        "/api/v1/similarity/link",
        json=payload_link,
        headers=headers_rb
    )
    assert res_rb_link.status_code == 403
    assert "Access denied" in res_rb_link.text

    # =========================================================================
    # Step 10: Inspect audit history and verify independent timelines of linked cases
    # =========================================================================
    # Inspect Case A audit trail
    res_audit_a = client.get(f"/api/v1/audit/logs?complaint_id={case_a_id}", headers=headers_admin)
    assert res_audit_a.status_code == 200
    logs_a = res_audit_a.json()
    assert len(logs_a) >= 1
    # Verify events belong strictly to Case A
    for event in logs_a:
        assert event["complaint_id"] == case_a_id

    # Inspect Case B audit trail
    res_audit_b = client.get(f"/api/v1/audit/logs?complaint_id={case_b_id}", headers=headers_admin)
    assert res_audit_b.status_code == 200
    logs_b = res_audit_b.json()
    assert len(logs_b) >= 1
    # Verify events belong strictly to Case B
    for event in logs_b:
        assert event["complaint_id"] == case_b_id

    # Demonstrates that linking the cases did NOT merge their timelines or alter independent case numbers
    assert case_a_no != case_b_no
    assert case_a_id != case_b_id

    # Verify cryptographic hash chain integrity of the complete audit log
    res_integrity = client.get("/api/v1/audit/verify-integrity", headers=headers_admin)
    assert res_integrity.status_code == 200
    integrity_data = res_integrity.json()
    assert integrity_data["is_intact"] is True
    assert integrity_data["total_records"] >= 1
    assert "head_hash" in integrity_data
