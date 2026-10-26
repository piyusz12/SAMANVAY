def test_list_complaints(client):
    response = client.get("/api/v1/complaints")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    assert len(data["items"]) > 0
    first_item = data["items"][0]
    assert "complaint_no" in first_item
    assert "sla_status" in first_item

def test_filter_complaints_by_bureau(client):
    response = client.get("/api/v1/complaints?bureau=PGRC")
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["bureau"] == "PGRC"

def test_create_complaint(client):
    # Fetch first institution
    inst_res = client.get("/api/v1/institutions")
    assert inst_res.status_code == 200
    inst_id = inst_res.json()[0]["id"]

    new_case = {
        "institution_id": inst_id,
        "bureau": "PGRC",
        "complainant_name": "Test Complainant",
        "complainant_category": "STUDENT",
        "complainant_email": "test@student.in",
        "subject": "Arbitrary exam cancellation fee",
        "description": "The administration is charging extra examination fees without prior notification or approval from the academic board.",
        "category": "FEE_EXTORTION",
        "priority": "HIGH",
        "sla_deadline_days": 30
    }
    response = client.post("/api/v1/complaints", json=new_case)
    assert response.status_code == 201
    created = response.json()
    assert created["complaint_no"].startswith("AICTE/PGRC/")
    assert created["status"] == "LODGED"
    assert created["days_open"] == 0

def test_status_transition(client, officer_token):
    # Get a complaint to update
    list_res = client.get("/api/v1/complaints")
    complaint_id = list_res.json()["items"][0]["id"]

    update_payload = {
        "status": "UNDER_INQUIRY",
        "notes": "Preliminary investigation underway by desk officer."
    }
    response = client.patch(
        f"/api/v1/complaints/{complaint_id}/status",
        json=update_payload,
        headers={"Authorization": f"Bearer {officer_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "UNDER_INQUIRY"
