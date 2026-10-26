def test_dashboard_analytics_overview(client):
    res = client.get("/api/v1/analytics/overview")
    assert res.status_code == 200
    data = res.json()
    assert data["total_institutions"] > 0
    assert data["total_complaints"] > 0
    assert data["active_complaints"] > 0
    assert data["conflicting_institutions_count"] >= 1
    assert len(data["bureau_metrics"]) == 6
    assert len(data["region_metrics"]) == 7
    assert len(data["hotspot_institutions"]) > 0

    # Verify bureau metrics structure
    first_bureau = data["bureau_metrics"][0]
    assert "bureau" in first_bureau
    assert "total_cases" in first_bureau
    assert "active_cases" in first_bureau
    assert "avg_resolution_days" in first_bureau

def test_audit_logs_query(client):
    res = client.get("/api/v1/audit/logs?limit=10")
    assert res.status_code == 200
    logs = res.json()
    assert len(logs) > 0
    first_log = logs[0]
    assert "action_type" in first_log
    assert "actor_name" in first_log
    assert "timestamp" in first_log
