import pytest
from datetime import datetime, timedelta, timezone
from backend.app.models.user import User

def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}

def test_workflow_statuses_endpoint(client, admin_token):
    """Verify workflow statuses endpoint returns all configurable statuses."""
    response = client.get("/api/v1/complaints/workflow/statuses")
    assert response.status_code == 200
    statuses = response.json()
    assert len(statuses) >= 7
    status_names = [s["status"] for s in statuses]
    assert "RECEIVED" in status_names
    assert "UNDER_REVIEW" in status_names
    assert "IN_PROGRESS" in status_names
    assert "AWAITING_INFORMATION" in status_names
    assert "TRANSFERRED" in status_names
    assert "ESCALATED" in status_names
    assert "DISPOSED" in status_names

def test_register_complaint_with_intake_metadata(client, admin_token):
    """Verify complaint creation with received date, SLA due date, and unique case reference."""
    now = datetime.now(timezone.utc)
    received = (now - timedelta(days=2)).isoformat()
    due = (now + timedelta(days=25)).isoformat()
    
    payload = {
        "institution_id": 1,
        "bureau": "REGULATION_BUREAU",
        "complainant_name": "Dr. Vivek Mehra",
        "complainant_category": "FACULTY",
        "complainant_email": "vivek.mehra@test-faculty.org",
        "subject": "Faculty Salary Non-Disbursement and Unlawful Deductions",
        "description": "Institution has not disbursed academic salaries for four consecutive months.",
        "category": "FACULTY_SALARY_WITHHELD",
        "priority": "HIGH",
        "sla_deadline_days": 25,
        "sla_due_date": due,
        "received_date": received,
        "internal_notes": "Initial complaint received via registered post."
    }
    
    response = client.post("/api/v1/complaints", json=payload, headers=auth_header(admin_token))
    assert response.status_code == 201
    data = response.json()
    assert data["complaint_no"].startswith("AICTE/RB/")
    assert data["status"] == "LODGED"
    assert data["priority"] == "HIGH"
    assert data["sla_deadline_days"] == 25
    assert data["received_date"] is not None

def test_valid_status_transitions_workflow(client, rb_admin_token, rb_officer_token):
    """Test standard progression through state machine: LODGED -> UNDER_REVIEW -> IN_PROGRESS -> SHOW_CAUSE_ISSUED -> RESOLVED -> DISPOSED."""
    # 1. Create a case
    payload = {
        "institution_id": 1,
        "bureau": "REGULATION_BUREAU",
        "complainant_name": "Pooja Sharma",
        "complainant_category": "STUDENT",
        "subject": "Excess Fee Extortion Test Workflow",
        "description": "Demanded unapproved capitation fee for engineering admission.",
        "category": "FEE_EXTORTION",
        "priority": "HIGH"
    }
    create_res = client.post("/api/v1/complaints", json=payload, headers=auth_header(rb_admin_token))
    assert create_res.status_code == 201
    c_id = create_res.json()["id"]

    # 2. Transition LODGED -> UNDER_REVIEW (allowed for officer)
    r1 = client.patch(
        f"/api/v1/complaints/{c_id}/status",
        json={"status": "UNDER_REVIEW", "notes": "Prima facie scrutiny initiated."},
        headers=auth_header(rb_officer_token)
    )
    assert r1.status_code == 200
    assert r1.json()["status"] == "UNDER_REVIEW"

    # 3. Transition UNDER_REVIEW -> IN_PROGRESS
    r2 = client.patch(
        f"/api/v1/complaints/{c_id}/status",
        json={"status": "IN_PROGRESS", "notes": "Formal inquiry opened and documents summoned."},
        headers=auth_header(rb_officer_token)
    )
    assert r2.status_code == 200
    assert r2.json()["status"] == "IN_PROGRESS"

    # 4. Transition IN_PROGRESS -> SHOW_CAUSE_ISSUED
    r3 = client.patch(
        f"/api/v1/complaints/{c_id}/status",
        json={"status": "SHOW_CAUSE_ISSUED", "notes": "Statutory SCN issued with 15-day compliance window."},
        headers=auth_header(rb_officer_token)
    )
    assert r3.status_code == 200
    assert r3.json()["status"] == "SHOW_CAUSE_ISSUED"

    # 5. Transition SHOW_CAUSE_ISSUED -> RESOLVED (Admin only, requires resolution summary)
    r4 = client.patch(
        f"/api/v1/complaints/{c_id}/status",
        json={
            "status": "RESOLVED",
            "resolution_summary": "Institution refunded excess fees to students and furnished compliance undertaking."
        },
        headers=auth_header(rb_admin_token)
    )
    assert r4.status_code == 200
    assert r4.json()["status"] == "RESOLVED"

    # 6. Transition RESOLVED -> DISPOSED (final closure)
    r5 = client.patch(
        f"/api/v1/complaints/{c_id}/status",
        json={
            "status": "DISPOSED",
            "resolution_summary": "Compliance verified by AICTE regional office. File closed."
        },
        headers=auth_header(rb_admin_token)
    )
    assert r5.status_code == 200
    assert r5.json()["status"] == "DISPOSED"
    assert r5.json()["disposed_at"] is not None

def test_invalid_status_transition_rejection(client, rb_officer_token):
    """Verify that jumping from LODGED directly to SHOW_CAUSE_ISSUED is rejected with 400 Bad Request."""
    # Create case
    payload = {
        "institution_id": 1,
        "bureau": "REGULATION_BUREAU",
        "complainant_name": "Test Student",
        "complainant_category": "STUDENT",
        "subject": "Testing Invalid Jump",
        "description": "Invalid transition test description.",
        "category": "INFRASTRUCTURE_DEFICIENCY"
    }
    c_res = client.post("/api/v1/complaints", json=payload, headers=auth_header(rb_officer_token))
    c_id = c_res.json()["id"]

    # Attempt illegal transition: LODGED -> SHOW_CAUSE_ISSUED
    res = client.patch(
        f"/api/v1/complaints/{c_id}/status",
        json={"status": "SHOW_CAUSE_ISSUED", "notes": "Attempting illegal direct transition."},
        headers=auth_header(rb_officer_token)
    )
    assert res.status_code == 400
    assert "Invalid status transition" in res.json()["detail"]
    assert "Permitted next statuses" in res.json()["detail"]

def test_mandatory_reason_enforcement(client, rb_admin_token):
    """Verify that transitions to ESCALATED or DISPOSED without justification are rejected."""
    payload = {
        "institution_id": 1,
        "bureau": "REGULATION_BUREAU",
        "complainant_name": "Whistleblower",
        "complainant_category": "FACULTY",
        "subject": "Missing Reason Enforcement Test",
        "description": "Testing missing reasons on critical status changes.",
        "category": "CORRUPTION_ALLEGATION"
    }
    c_res = client.post("/api/v1/complaints", json=payload, headers=auth_header(rb_admin_token))
    c_id = c_res.json()["id"]

    # Transition to UNDER_REVIEW first
    client.patch(
        f"/api/v1/complaints/{c_id}/status",
        json={"status": "UNDER_REVIEW", "notes": "Scrutiny"},
        headers=auth_header(rb_admin_token)
    )

    # Attempt transition to ESCALATED without notes/reason
    res_esc = client.patch(
        f"/api/v1/complaints/{c_id}/status",
        json={"status": "ESCALATED", "notes": ""},
        headers=auth_header(rb_admin_token)
    )
    assert res_esc.status_code == 400
    assert "strictly required" in res_esc.json()["detail"].lower()

    # Attempt transition to DISPOSED without resolution summary
    res_disp = client.patch(
        f"/api/v1/complaints/{c_id}/status",
        json={"status": "DISPOSED", "resolution_summary": ""},
        headers=auth_header(rb_admin_token)
    )
    assert res_disp.status_code == 400
    assert "resolution summary" in res_disp.json()["detail"].lower()

def test_case_officer_cannot_close_case(client, rb_officer_token, rb_admin_token):
    """Verify that a Case Officer cannot execute final case disposal (restricted to Bureau Admins)."""
    payload = {
        "institution_id": 1,
        "bureau": "REGULATION_BUREAU",
        "complainant_name": "Student A",
        "complainant_category": "STUDENT",
        "subject": "Officer Closure Prohibition Test",
        "description": "Case officer must not be able to close a case.",
        "category": "HARASSMENT"
    }
    c_res = client.post("/api/v1/complaints", json=payload, headers=auth_header(rb_admin_token))
    c_id = c_res.json()["id"]

    # Advance to UNDER_REVIEW
    client.patch(
        f"/api/v1/complaints/{c_id}/status",
        json={"status": "UNDER_REVIEW", "notes": "Scrutiny"},
        headers=auth_header(rb_officer_token)
    )

    # Attempt disposal by case officer
    res = client.patch(
        f"/api/v1/complaints/{c_id}/status",
        json={"status": "DISPOSED", "notes": "Officer attempting closure", "resolution_summary": "Done"},
        headers=auth_header(rb_officer_token)
    )
    assert res.status_code == 403
    assert "Bureau Administrator" in res.json()["detail"]

def test_officer_assignment_and_reassignment_history(client, rb_admin_token, db_session):
    """Verify assignment, reassignment tracking, separate current owner from history."""
    payload = {
        "institution_id": 1,
        "bureau": "REGULATION_BUREAU",
        "complainant_name": "Staff Grievance",
        "complainant_category": "FACULTY",
        "subject": "Reassignment Tracking Test",
        "description": "Checking assignment and reassignment audit trails.",
        "category": "UNAPPROVED_PROGRAM"
    }
    c_res = client.post("/api/v1/complaints", json=payload, headers=auth_header(rb_admin_token))
    c_id = c_res.json()["id"]

    officer1 = db_session.query(User).filter(User.email == "officer.rb@samanvay.aicte.gov.in").first()
    officer2 = db_session.query(User).filter(User.email == "bureau.officer.rb@samanvay.aicte.gov.in").first()

    # 1. Initial assignment to Sunil Verma
    assign_res = client.patch(
        f"/api/v1/complaints/{c_id}/assign",
        json={"officer_id": officer1.id, "assignment_notes": "Initial assignment for investigation."},
        headers=auth_header(rb_admin_token)
    )
    assert assign_res.status_code == 200
    assert assign_res.json()["assigned_officer_id"] == officer1.id

    # 2. Reassignment to Meera Swaminathan
    reassign_res = client.post(
        f"/api/v1/complaints/{c_id}/reassign",
        json={"officer_id": officer2.id, "reassignment_reason": "Reassigned due to workload redistribution."},
        headers=auth_header(rb_admin_token)
    )
    assert reassign_res.status_code == 200
    assert reassign_res.json()["assigned_officer_id"] == officer2.id

    # 3. Inspect detail with assignment history
    detail_res = client.get(f"/api/v1/complaints/{c_id}/detail", headers=auth_header(rb_admin_token))
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["assigned_officer_id"] == officer2.id
    
    # Verify assignment history records
    hist = detail["assignment_history"]
    assert len(hist) >= 2
    # Prior assignment is inactive
    prev_rec = next((h for h in hist if h["assigned_officer_id"] == officer1.id), None)
    assert prev_rec is not None
    assert prev_rec["is_current"] is False
    # Current assignment is active
    curr_rec = next((h for h in hist if h["assigned_officer_id"] == officer2.id), None)
    assert curr_rec is not None
    assert curr_rec["is_current"] is True
    assert curr_rec["previous_officer_id"] == officer1.id

def test_unified_activity_timeline_endpoint(client, rb_admin_token, rb_officer_token, db_session):
    """Verify that GET /complaints/{id}/timeline returns aggregated chronological actions."""
    payload = {
        "institution_id": 1,
        "bureau": "REGULATION_BUREAU",
        "complainant_name": "Test Timeline",
        "complainant_category": "STUDENT",
        "subject": "Activity Timeline Aggregation Test",
        "description": "Verifying status, assignment, and movement timeline compilation.",
        "category": "FEE_EXTORTION"
    }
    c_res = client.post("/api/v1/complaints", json=payload, headers=auth_header(rb_admin_token))
    c_id = c_res.json()["id"]

    officer1 = db_session.query(User).filter(User.email == "officer.rb@samanvay.aicte.gov.in").first()

    # Assign officer
    client.patch(
        f"/api/v1/complaints/{c_id}/assign",
        json={"officer_id": officer1.id, "assignment_notes": "Assigned to Sunil."},
        headers=auth_header(rb_admin_token)
    )

    # Status update
    client.patch(
        f"/api/v1/complaints/{c_id}/status",
        json={"status": "UNDER_REVIEW", "notes": "Under scrutiny by officer."},
        headers=auth_header(rb_officer_token)
    )

    # Query timeline endpoint
    timeline_res = client.get(f"/api/v1/complaints/{c_id}/timeline")
    assert timeline_res.status_code == 200
    events = timeline_res.json()
    assert len(events) >= 2
    event_types = [e["event_type"] for e in events]
    assert "STATUS_CHANGE" in event_types
    assert "ASSIGNMENT" in event_types

def test_allowed_transitions_endpoint_for_roles(client, rb_admin_token, rb_officer_token, auditor_token):
    """Verify that GET /complaints/{id}/allowed-transitions customizes transitions per role."""
    payload = {
        "institution_id": 1,
        "bureau": "REGULATION_BUREAU",
        "complainant_name": "Role Test",
        "complainant_category": "STUDENT",
        "subject": "Checking allowed transitions by role",
        "description": "Test allowed transitions API.",
        "category": "OTHER"
    }
    c_res = client.post("/api/v1/complaints", json=payload, headers=auth_header(rb_admin_token))
    c_id = c_res.json()["id"]

    # Case Officer query
    res_officer = client.get(f"/api/v1/complaints/{c_id}/allowed-transitions", headers=auth_header(rb_officer_token))
    assert res_officer.status_code == 200
    data_officer = res_officer.json()
    assert data_officer["can_close"] is False
    officer_targets = [t["status"] for t in data_officer["allowed_transitions"]]
    # Case officer cannot see DISPOSED / RESOLVED
    assert "DISPOSED" not in officer_targets
    assert "UNDER_REVIEW" in officer_targets

    # Bureau Admin query
    res_admin = client.get(f"/api/v1/complaints/{c_id}/allowed-transitions", headers=auth_header(rb_admin_token))
    assert res_admin.status_code == 200
    data_admin = res_admin.json()
    assert data_admin["can_close"] is True
    admin_targets = [t["status"] for t in data_admin["allowed_transitions"]]
    assert "DISPOSED" in admin_targets

    # Auditor query: allowed transitions is empty (read-only)
    res_auditor = client.get(f"/api/v1/complaints/{c_id}/allowed-transitions", headers=auth_header(auditor_token))
    assert res_auditor.status_code == 200
    assert len(res_auditor.json()["allowed_transitions"]) == 0

def test_complaints_list_filtering_and_sorting(client, admin_token, db_session):
    """Verify server-side sorting, pagination, and officer filtering."""
    officer1 = db_session.query(User).filter(User.email == "officer.rb@samanvay.aicte.gov.in").first()

    # Test sort by priority asc
    res_sort = client.get("/api/v1/complaints?sort_by=priority&sort_dir=asc&page=1&page_size=10")
    assert res_sort.status_code == 200
    assert len(res_sort.json()["items"]) > 0

    # Test filter by assigned officer
    res_officer = client.get(f"/api/v1/complaints?assigned_officer_id={officer1.id}&page=1&page_size=10")
    assert res_officer.status_code == 200
    for item in res_officer.json()["items"]:
        assert item["assigned_officer_id"] == officer1.id
