def test_explainable_similarity_check(client):
    inst_res = client.get("/api/v1/institutions")
    inst = inst_res.json()[0]

    payload = {
        "institution_id": inst["id"],
        "subject": "Withholding B.Tech certificate and charging excessive illegal deposit",
        "description": "Graduating batch not given degree certificate and marksheet due to capitation fees.",
        "category": "FEE_EXTORTION"
    }

    res = client.post("/api/v1/similarity/check", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data["matches"]) > 0
    top_match = data["matches"][0]
    assert "explanation" in top_match
    explanation = top_match["explanation"]
    assert "overall_score" in explanation
    assert "rationale" in explanation
    assert "category_match" in explanation
    assert "institution_match" in explanation
    assert explanation["institution_match"] is True

def test_linkage_workflow(client, officer_token):
    # Propose/create a linkage
    complaints = client.get("/api/v1/complaints").json()["items"]
    c1, c2 = complaints[0], complaints[1]

    link_payload = {
        "source_complaint_id": c1["id"],
        "target_complaint_id": c2["id"],
        "link_type": "CROSS_BUREAU_OVERLAP",
        "similarity_score": 0.85,
        "explanation": {"rationale": "High overlap in faculty salary grievances."},
        "notes": "Linked for joint regulatory review."
    }
    create_res = client.post(
        "/api/v1/similarity/link",
        json=link_payload,
        headers={"Authorization": f"Bearer {officer_token}"}
    )
    assert create_res.status_code == 201
    linkage = create_res.json()
    assert linkage["status"] == "CONFIRMED_BY_OFFICER"

    # Human review
    review_res = client.patch(
        f"/api/v1/similarity/linkages/{linkage['id']}",
        json={"status": "CONFIRMED_BY_OFFICER", "verification_notes": "Reviewed and verified."},
        headers={"Authorization": f"Bearer {officer_token}"}
    )
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "CONFIRMED_BY_OFFICER"
