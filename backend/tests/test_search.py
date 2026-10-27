import pytest
from datetime import datetime, timedelta
from backend.app.core.datetime_util import utc_now

def test_unified_search_exact_identifier(client, admin_token):
    # Search by exact AICTE ID
    res = client.get(
        "/api/v1/search/unified?q=1-10293847",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_matches"] > 0
    assert data["institutions_count"] >= 1
    # Check that matched institution has AICTE ID 1-10293847
    inst = next((i for i in data["institutions"] if i["aicte_id"] == "1-10293847"), None)
    assert inst is not None
    assert "Apex Institute" in inst["name"]

    # Search by Complaint Number
    res_c = client.get(
        "/api/v1/search/unified?q=AICTE/RB/2026/0002",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_c.status_code == 200
    data_c = res_c.json()
    assert data_c["complaints_count"] >= 1
    complaint = data_c["complaints"][0]
    assert complaint["complaint_no"] == "AICTE/RB/2026/0002"
    assert complaint["bureau"] == "REGULATION_BUREAU"


def test_search_complaints_multi_filters_and_pagination(client, admin_token):
    # Multi-filter search: bureau, category, status
    res = client.get(
        "/api/v1/search/complaints?bureau=REGULATION_BUREAU&status=SHOW_CAUSE_ISSUED&page=1&page_size=5",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    assert data["page"] == 1
    assert data["page_size"] == 5
    for item in data["items"]:
        assert item["bureau"] == "REGULATION_BUREAU"
        assert item["status"] == "SHOW_CAUSE_ISSUED"

    # Search by region and keyword (matching seeded Apex Institute complaint)
    res_reg = client.get(
        "/api/v1/search/complaints?region=Western&q=faculty",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_reg.status_code == 200
    data_reg = res_reg.json()
    assert data_reg["total"] >= 1
    assert data_reg["items"][0]["region"] == "Western"


def test_search_complaints_bureau_scoped_rbac(client, pgrc_admin_token, rb_officer_token, admin_token):
    # 1. Bureau Head gets scoped results only
    res = client.get(
        "/api/v1/search/complaints",
        headers={"Authorization": f"Bearer {pgrc_admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total"] > 0
    for item in data["items"]:
        assert item["bureau"] == "PGRC"

    # 2. Bureau Head cannot search another bureau
    res_unauth = client.get(
        "/api/v1/search/complaints?bureau=REGULATION_BUREAU",
        headers={"Authorization": f"Bearer {pgrc_admin_token}"}
    )
    assert res_unauth.status_code == 403
    assert "Access denied" in res_unauth.json()["detail"]

    # 3. Super Admin can search any bureau
    res_admin = client.get(
        "/api/v1/search/complaints?bureau=REGULATION_BUREAU",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_admin.status_code == 200
    assert all(i["bureau"] == "REGULATION_BUREAU" for i in res_admin.json()["items"])


def test_search_sql_injection_and_invalid_param_safety(client, admin_token):
    # SQL injection attempt in query string
    sqli_query = "' OR '1'='1' -- ; DROP TABLE complaints;"
    res = client.get(
        f"/api/v1/search/complaints?q={sqli_query}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    # Should safely return 200 with 0 or literal matches (no 500 error, no DB corruption)
    assert res.status_code == 200
    assert res.json()["total"] == 0

    # Invalid date format should be rejected safely with 422
    res_invalid_date = client.get(
        "/api/v1/search/complaints?date_from=INVALID_DATE_FORMAT",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_invalid_date.status_code == 422

    # Unrecognized sort_by column safely falls back to created_at
    res_sort = client.get(
        "/api/v1/search/complaints?sort_by=non_existent_column_injection_test",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_sort.status_code == 200
    assert res_sort.json()["applied_filters"]["sort_by"] == "created_at"


def test_search_institutions_filters_and_pagination(client, admin_token):
    # Search by institution name and region
    res = client.get(
        "/api/v1/search/institutions?q=Apex&region=Western",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    first_inst = data["items"][0]
    assert "Apex" in first_inst["name"]
    assert first_inst["region"] == "Western"
    assert first_inst["total_complaints_count"] > 0
