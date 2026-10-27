from datetime import datetime, timedelta
from backend.app.core.datetime_util import utc_now
from backend.app.models.complaint import Complaint
from backend.app.models.institution import Institution

def test_dashboard_analytics_overview(client):
    res = client.get("/api/v1/analytics/overview")
    assert res.status_code == 200
    data = res.json()

    # 1. Non-Overlapping Primary Volume Partitions (No double counting)
    assert data["total_complaints_received"] > 0
    assert data["total_complaints_received"] == (
        data["open_pending_complaints"] +
        data["complaints_under_process"] +
        data["disposed_complaints"] +
        data["transferred_complaints"]
    )
    assert data["active_complaints"] == data["open_pending_complaints"] + data["complaints_under_process"]

    # 2. Entity Count Distinction (Cases vs Institutions vs Related-Case Linkages)
    assert data["total_institutions_count"] > 0
    assert data["conflicting_institutions_count"] >= 1
    assert data["potential_overlaps_awaiting_review"] >= 0
    assert data["confirmed_related_groups_count"] >= 0

    # 3. Ageing Distribution
    ageing = data["ageing_distribution"]
    assert len(ageing) == 5
    bucket_names = [b["bucket"] for b in ageing]
    assert "0-15 Days" in bucket_names
    assert "16-30 Days" in bucket_names
    assert "31-60 Days" in bucket_names
    assert "61-90 Days" in bucket_names
    assert "90+ Days" in bucket_names
    total_ageing_count = sum(b["count"] for b in ageing)
    assert total_ageing_count == data["active_complaints"]

    # 4. Bureau-wise Workload Matrix
    assert len(data["bureau_metrics"]) == 6
    first_bureau = data["bureau_metrics"][0]
    assert "bureau" in first_bureau
    assert "bureau_name" in first_bureau
    assert "total_cases" in first_bureau
    assert "active_cases" in first_bureau
    assert "open_pending" in first_bureau
    assert "under_process" in first_bureau
    assert "avg_resolution_days" in first_bureau
    assert "sla_compliance_percent" in first_bureau

    # 5. Longitudinal Trends & Velocity
    assert len(data["monthly_trends"]) > 0
    assert "period" in data["monthly_trends"][0]
    assert "received" in data["monthly_trends"][0]
    assert "disposed" in data["monthly_trends"][0]

    assert len(data["quarterly_trends"]) > 0
    assert "quarter" in data["quarterly_trends"][0]

    # 6. Resolution Metrics
    res_m = data["resolution_metrics"]
    assert "average_resolution_days" in res_m
    assert "median_resolution_days" in res_m
    assert "sla_compliance_rate_percent" in res_m
    assert res_m["total_disposed"] == data["disposed_complaints"]

    # 7. Institution Summaries
    assert len(data["institution_summaries"]) > 0
    first_inst = data["institution_summaries"][0]
    assert "aicte_id" in first_inst
    assert "name" in first_inst
    assert "total_cases" in first_inst
    assert "active_cases" in first_inst
    assert "is_conflicting" in first_inst
    assert "confirmed_links_count" in first_inst


def test_dashboard_filters_bureau_and_region(client):
    # Filter by specific bureau
    res_rb = client.get("/api/v1/analytics/overview?bureau=REGULATION_BUREAU")
    assert res_rb.status_code == 200
    rb_data = res_rb.json()
    assert rb_data["total_complaints_received"] > 0
    for inst in rb_data["institution_summaries"]:
        assert inst["bureaus_involved"] == ["REGULATION_BUREAU"]

    # Filter by specific region
    res_reg = client.get("/api/v1/analytics/overview?region=Western")
    assert res_reg.status_code == 200
    reg_data = res_reg.json()
    for inst in reg_data["institution_summaries"]:
        assert inst["region"] == "Western"

    # Filter by status
    res_status = client.get("/api/v1/analytics/overview?status=SHOW_CAUSE_ISSUED")
    assert res_status.status_code == 200
    st_data = res_status.json()
    assert st_data["total_complaints_received"] > 0
    assert st_data["complaints_under_process"] == st_data["total_complaints_received"]
    assert st_data["open_pending_complaints"] == 0

    # Filter by date range
    today_str = utc_now().strftime("%Y-%m-%d")
    past_str = (utc_now() - timedelta(days=90)).strftime("%Y-%m-%d")
    res_dates = client.get(f"/api/v1/analytics/overview?date_from={past_str}&date_to={today_str}")
    assert res_dates.status_code == 200
    assert res_dates.json()["total_complaints_received"] > 0


def test_dashboard_bureau_scoped_rbac(client, pgrc_admin_token, rb_officer_token, admin_token, auditor_token):
    # 1. Bureau Officer / Head gets scoped overview automatically
    res = client.get(
        "/api/v1/analytics/overview",
        headers={"Authorization": f"Bearer {pgrc_admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["user_scope_bureau"] == "PGRC"
    # Bureau metrics only contains their bureau
    assert len(data["bureau_metrics"]) == 1
    assert data["bureau_metrics"][0]["bureau"] == "PGRC"

    # 2. Attempting to query an unauthorized bureau returns HTTP 403 Forbidden
    res_unauth = client.get(
        "/api/v1/analytics/overview?bureau=REGULATION_BUREAU",
        headers={"Authorization": f"Bearer {pgrc_admin_token}"}
    )
    assert res_unauth.status_code == 403
    assert "Access denied" in res_unauth.json()["detail"]

    # 3. Super Admin can query any bureau or cross-bureau overview
    res_admin = client.get(
        "/api/v1/analytics/overview?bureau=REGULATION_BUREAU",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_admin.status_code == 200
    assert res_admin.json()["user_role"] == "SUPER_ADMIN"

    # 4. Auditor has full read-only cross-bureau visibility
    res_auditor = client.get(
        "/api/v1/analytics/overview",
        headers={"Authorization": f"Bearer {auditor_token}"}
    )
    assert res_auditor.status_code == 200
    assert len(res_auditor.json()["bureau_metrics"]) == 6


def test_dashboard_live_updates_when_case_changes(client, admin_token, db_session):
    # Initial count
    res1 = client.get("/api/v1/analytics/overview", headers={"Authorization": f"Bearer {admin_token}"})
    assert res1.status_code == 200
    initial_total = res1.json()["total_complaints_received"]
    initial_open = res1.json()["open_pending_complaints"]

    # Lodge a new complaint
    new_payload = {
        "institution_id": 1,
        "bureau": "PGRC",
        "category": "FEE_EXTORTION",
        "subject": "Extortionate laboratory deposit penalty [TEST]",
        "description": "Institute demanding Rs 25000 non-refundable chemical lab fee from civil students.",
        "complainant_name": "Test Student Complainant",
        "complainant_category": "STUDENT",
        "complainant_email": "test.student@example.org",
        "priority": "MEDIUM",
        "sla_deadline_days": 30
    }
    lodge_res = client.post(
        "/api/v1/complaints",
        json=new_payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert lodge_res.status_code in (200, 201)

    # Re-query dashboard: total and open_pending should have incremented by exactly 1
    res2 = client.get("/api/v1/analytics/overview", headers={"Authorization": f"Bearer {admin_token}"})
    assert res2.status_code == 200
    updated = res2.json()
    assert updated["total_complaints_received"] == initial_total + 1
    assert updated["open_pending_complaints"] == initial_open + 1


def test_audit_logs_query(client, admin_token):
    res = client.get("/api/v1/audit/logs?limit=10", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    logs = res.json()
    assert len(logs) > 0
    first_log = logs[0]
    assert "action_type" in first_log
    assert "actor_name" in first_log
    assert "timestamp" in first_log
