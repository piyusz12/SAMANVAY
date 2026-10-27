import pytest
from datetime import datetime, timedelta, timezone
from backend.app.core.datetime_util import utc_now
from backend.app.models.complaint import Complaint
from backend.app.models.case_linkage import CaseLinkage

def test_coordination_workspace_side_by_side(client, admin_token):
    """
    Features 1, 2, 3:
    Displays related cases side by side with institution details, case IDs, current bureau,
    assigned officer, status, last action, due dates, overlap score, and match reasons.
    """
    complaints = client.get("/api/v1/complaints").json()["items"]
    c1, c2 = complaints[0], complaints[1]

    # Propose/create a linkage
    link_res = client.post(
        "/api/v1/similarity/link",
        json={
            "source_complaint_id": c1["id"],
            "target_complaint_id": c2["id"],
            "link_type": "CROSS_BUREAU_OVERLAP",
            "similarity_score": 0.88,
            "explanation": {"rationale": "Overlapping allegations concerning degree withholding and fee charges."},
            "notes": "Initial linkage created for inter-bureau coordination."
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert link_res.status_code == 201
    linkage = link_res.json()

    # Fetch detailed side-by-side workspace
    detail_res = client.get(
        f"/api/v1/coordination/workspaces/{linkage['id']}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert detail_res.status_code == 200
    data = detail_res.json()

    # 1. Side by side complaint records
    assert "source_complaint" in data
    assert "target_complaint" in data
    src = data["source_complaint"]
    tgt = data["target_complaint"]

    # 2. Case IDs, bureaus, assigned officers, status, due dates
    assert src["complaint_no"] is not None
    assert tgt["complaint_no"] is not None
    assert src["bureau"] is not None
    assert tgt["bureau"] is not None
    assert "status" in src
    assert "status" in tgt
    assert "institution_name" in src
    assert "institution_aicte_id" in src
    assert "days_remaining" in src

    # 3. Overlap score and match reasons
    assert data["similarity_score"] == 0.88
    assert data["confidence_tier"] in ("HIGH", "MEDIUM")
    assert isinstance(data["reasons"], list)
    assert "version" in data


def test_coordination_decision_workflow_preserves_independent_records(client, admin_token, db_session):
    """
    Features 4, 6, 8, Acceptance Criteria:
    Two bureaus record a coordination decision, assign follow-up actions, and
    maintain separate status and action histories for each complaint.
    Does NOT automatically transfer ownership or dispose of cases.
    """
    complaints = client.get("/api/v1/complaints").json()["items"]
    c1, c2 = complaints[0], complaints[1]

    # Ensure c1 and c2 have distinct initial statuses
    initial_status_c1 = c1["status"]
    initial_bureau_c1 = c1["bureau"]
    initial_status_c2 = c2["status"]
    initial_bureau_c2 = c2["bureau"]

    link_res = client.post(
        "/api/v1/similarity/link",
        json={
            "source_complaint_id": c1["id"],
            "target_complaint_id": c2["id"],
            "link_type": "CROSS_BUREAU_OVERLAP",
            "similarity_score": 0.82,
            "explanation": {"rationale": "Concurrent review required across bureaus."},
            "notes": "Linking for coordination."
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    linkage = link_res.json()
    linkage_id = linkage["id"]

    # Record coordination decision
    coord_deadline = (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
    decision_res = client.post(
        f"/api/v1/coordination/workspaces/{linkage_id}/decision",
        json={
            "coordination_decision": "JOINT_INSPECTION",
            "lead_bureau": initial_bureau_c1,
            "coordination_notes": "Joint physical inspection team constituted under Section 10(p) of AICTE Act.",
            "coordination_deadline": coord_deadline,
            "expected_version": 1
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert decision_res.status_code == 200
    updated_ws = decision_res.json()
    assert updated_ws["coordination_decision"] == "JOINT_INSPECTION"
    assert updated_ws["lead_bureau"] == initial_bureau_c1
    assert updated_ws["status"] == "CONFIRMED_RELATED"
    assert updated_ws["version"] == 2  # Incremented version

    # Crucial Verification: Invariant check - NO automatic transfer or disposal
    fresh_c1 = client.get(f"/api/v1/complaints/{c1['id']}").json()
    fresh_c2 = client.get(f"/api/v1/complaints/{c2['id']}").json()

    assert fresh_c1["bureau"] == initial_bureau_c1
    assert fresh_c1["status"] == initial_status_c1
    assert fresh_c2["bureau"] == initial_bureau_c2
    assert fresh_c2["status"] == initial_status_c2


def test_follow_up_tasks_and_overdue_actions(client, admin_token):
    """
    Features 6, 7:
    Create coordination follow-up tasks, track deadlines, detect overdue items,
    and update task completion.
    """
    complaints = client.get("/api/v1/complaints").json()["items"]
    c1, c2 = complaints[0], complaints[1]

    link_res = client.post(
        "/api/v1/similarity/link",
        json={
            "source_complaint_id": c1["id"],
            "target_complaint_id": c2["id"],
            "link_type": "CROSS_BUREAU_OVERLAP",
            "similarity_score": 0.80,
            "explanation": {"rationale": "Follow-up coordination test."},
            "notes": "Linkage for tasks."
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    linkage_id = link_res.json()["id"]

    # 1. Create a future task
    future_deadline = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    t1_res = client.post(
        f"/api/v1/coordination/workspaces/{linkage_id}/tasks",
        json={
            "title": "Subpoena payroll records and student deposit receipts",
            "description": "Joint scrutiny of Hinjawadi campus bursar accounts.",
            "deadline": future_deadline,
            "priority": "HIGH",
            "target_bureau": c1["bureau"]
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert t1_res.status_code == 201
    task1 = t1_res.json()
    assert task1["title"] == "Subpoena payroll records and student deposit receipts"
    assert task1["status"] == "PENDING"
    assert task1["is_overdue"] is False

    # 2. Create an overdue task (past deadline)
    past_deadline = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
    t2_res = client.post(
        f"/api/v1/coordination/workspaces/{linkage_id}/tasks",
        json={
            "title": "Issue preliminary show cause notice",
            "description": "Overdue regulatory response.",
            "deadline": past_deadline,
            "priority": "URGENT",
            "target_bureau": c2["bureau"]
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert t2_res.status_code == 201
    task2 = t2_res.json()
    assert task2["is_overdue"] is True

    # 3. Query outstanding coordination tasks
    tasks_res = client.get(
        "/api/v1/coordination/tasks/outstanding",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert tasks_res.status_code == 200
    all_outstanding = tasks_res.json()
    assert len(all_outstanding) >= 2

    # Query only overdue tasks
    overdue_res = client.get(
        "/api/v1/coordination/tasks/outstanding?overdue_only=true",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert overdue_res.status_code == 200
    overdue_tasks = overdue_res.json()
    assert any(t["id"] == task2["id"] for t in overdue_tasks)

    # 4. Mark task as completed
    update_res = client.patch(
        f"/api/v1/coordination/tasks/{task1['id']}",
        json={
            "status": "COMPLETED",
            "completion_notes": "Payroll registers subpoenaed and verified by scrutiny team."
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "COMPLETED"
    assert update_res.json()["completion_notes"] is not None


def test_concurrent_edit_conflict_warning(client, admin_token):
    """
    Feature 9:
    Provides clear conflict warnings (HTTP 409 Conflict) when concurrent edits
    or conflicting actions occur between bureaus.
    """
    complaints = client.get("/api/v1/complaints").json()["items"]
    c1, c2 = complaints[0], complaints[1]

    link_res = client.post(
        "/api/v1/similarity/link",
        json={
            "source_complaint_id": c1["id"],
            "target_complaint_id": c2["id"],
            "link_type": "CROSS_BUREAU_OVERLAP",
            "similarity_score": 0.80,
            "explanation": {"rationale": "Concurrency test."},
            "notes": "Testing optimistic locking."
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    linkage_id = link_res.json()["id"]

    # First officer records decision (moves version from 1 -> 2)
    first_save = client.post(
        f"/api/v1/coordination/workspaces/{linkage_id}/decision",
        json={
            "coordination_decision": "HEARING_COORDINATED",
            "coordination_notes": "Officer A updated at version 1.",
            "expected_version": 1
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert first_save.status_code == 200
    assert first_save.json()["version"] == 2

    # Second officer tries to save with stale version (expected_version: 1)
    conflict_save = client.post(
        f"/api/v1/coordination/workspaces/{linkage_id}/decision",
        json={
            "coordination_decision": "LEGAL_REFERRAL",
            "coordination_notes": "Officer B conflicting update at stale version 1.",
            "expected_version": 1
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert conflict_save.status_code == 409
    assert "Concurrent edit conflict detected" in conflict_save.json()["detail"]


def test_link_and_unlink_with_retention_rules(client, admin_token):
    """
    Feature 5:
    Allow users to link or unlink cases according to defined permissions and retention rules.
    Unlinking marks is_active = False and records an auditable reason while retaining records.
    """
    complaints = client.get("/api/v1/complaints").json()["items"]
    c1, c2 = complaints[0], complaints[1]

    link_res = client.post(
        "/api/v1/similarity/link",
        json={
            "source_complaint_id": c1["id"],
            "target_complaint_id": c2["id"],
            "link_type": "CROSS_BUREAU_OVERLAP",
            "similarity_score": 0.85,
            "explanation": {"rationale": "Link and unlink test."},
            "notes": "Initially linked."
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    linkage_id = link_res.json()["id"]

    # Unlink with mandatory rationale
    unlink_res = client.post(
        f"/api/v1/coordination/workspaces/{linkage_id}/unlink",
        json={
            "unlink_reason": "Inquiry revealed distinct academic programs operated under separate sub-trusts.",
            "expected_version": 1
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert unlink_res.status_code == 200
    data = unlink_res.json()
    assert data["is_active"] is False
    assert data["status"] == "NOT_RELATED"
    assert data["unlink_reason"] is not None
    assert data["unlinked_at"] is not None

    # Verify both complaints are still alive and accessible
    assert client.get(f"/api/v1/complaints/{c1['id']}").status_code == 200
    assert client.get(f"/api/v1/complaints/{c2['id']}").status_code == 200


def test_bureau_scoped_permissions_enforced(client, admin_token, rb_officer_token, auditor_token):
    """
    Feature 10:
    Enforce bureau-scoped permissions on every operation:
    - Read-only auditors cannot submit decisions or tasks (403 Forbidden).
    - Officers cannot coordinate cases between bureaus they don't belong to.
    """
    complaints = client.get("/api/v1/complaints").json()["items"]
    c_pgrc = next((c for c in complaints if c.get("bureau") == "PGRC"), None)
    c_legal = next((c for c in complaints if c.get("bureau") == "LEGAL_CELL"), None)

    if c_pgrc and c_legal:
        adm_token = admin_token

        link_res = client.post(
            "/api/v1/similarity/link",
            json={
                "source_complaint_id": c_pgrc["id"],
                "target_complaint_id": c_legal["id"],
                "link_type": "CROSS_BUREAU_OVERLAP",
                "similarity_score": 0.80,
                "explanation": {"rationale": "Cross-bureau security boundary test."},
                "notes": "Setup for security checks."
            },
            headers={"Authorization": f"Bearer {adm_token}"}
        )
        linkage_id = link_res.json()["id"]

        # Regulation Bureau officer attempting to coordinate PGRC <-> LEGAL_CELL
        res_unauthorized = client.post(
            f"/api/v1/coordination/workspaces/{linkage_id}/decision",
            json={
                "coordination_decision": "JOINT_INSPECTION",
                "coordination_notes": "Unauthorized attempt."
            },
            headers={"Authorization": f"Bearer {rb_officer_token}"}
        )
        assert res_unauthorized.status_code == 403
        assert "cannot access coordination workspaces" in res_unauthorized.json()["detail"].lower()

        # Read-only auditor attempting to submit decision
        res_auditor = client.post(
            f"/api/v1/coordination/workspaces/{linkage_id}/decision",
            json={
                "coordination_decision": "NO_ACTION_REQUIRED",
                "coordination_notes": "Auditor attempt."
            },
            headers={"Authorization": f"Bearer {auditor_token}"}
        )
        assert res_auditor.status_code == 403
