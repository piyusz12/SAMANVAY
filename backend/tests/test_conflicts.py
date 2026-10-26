def test_master_conflict_radar(client):
    response = client.get("/api/v1/conflicts/overlapping")
    assert response.status_code == 200
    conflicts = response.json()
    assert len(conflicts) > 0

    # Apex Institute has cases in multiple bureaus
    apex_conflict = next((c for c in conflicts if "Apex Institute" in c["institution_name"]), None)
    assert apex_conflict is not None
    assert len(apex_conflict["bureaus_involved"]) >= 2
    assert apex_conflict["active_cases_count"] >= 2

def test_institution_conflict_check(client):
    # Fetch an institution with conflict
    conflicts = client.get("/api/v1/conflicts/overlapping").json()
    inst_id = conflicts[0]["institution_id"]

    res = client.get(f"/api/v1/conflicts/institution/{inst_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["has_conflict"] is True
    assert len(data["bureaus_involved"]) >= 2
    assert "CROSS-BUREAU OVERLAP DETECTED" in data["message"]

def test_institution_dossier_includes_conflict(client):
    conflicts = client.get("/api/v1/conflicts/overlapping").json()
    inst_id = conflicts[0]["institution_id"]

    dossier_res = client.get(f"/api/v1/institutions/{inst_id}/dossier")
    assert dossier_res.status_code == 200
    dossier = dossier_res.json()
    assert dossier["conflict_alert"]["has_conflict"] is True
    assert len(dossier["bureaus_involved"]) >= 2
    assert len(dossier["recent_complaints"]) > 0
