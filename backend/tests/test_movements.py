def test_inter_bureau_transfer_lifecycle(client, officer_token, admin_token):
    # Find a complaint to transfer
    complaint = client.get("/api/v1/complaints?bureau=PGRC").json()["items"][0]
    c_id = complaint["id"]

    transfer_req = {
        "to_bureau": "VIGILANCE_CELL",
        "movement_type": "TRANSFER_REQUEST",
        "reason": "Whistleblower provided evidence of payroll embezzlement."
    }
    req_res = client.post(
        f"/api/v1/movements/complaint/{c_id}",
        json=transfer_req,
        headers={"Authorization": f"Bearer {officer_token}"}
    )
    assert req_res.status_code == 201
    movement = req_res.json()
    assert movement["status"] == "PENDING_APPROVAL"
    assert movement["to_bureau"] == "VIGILANCE_CELL"

    # Accept transfer by Admin
    decide_res = client.patch(
        f"/api/v1/movements/{movement['id']}/decide",
        json={"decision": "ACCEPTED", "notes": "Approved for Vigilance inquiry."},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert decide_res.status_code == 200
    assert decide_res.json()["status"] == "ACCEPTED"

    # Verify complaint bureau updated
    updated_complaint = client.get(f"/api/v1/complaints/{c_id}").json()
    assert updated_complaint["bureau"] == "VIGILANCE_CELL"
    assert updated_complaint["status"] == "TRANSFERRED"
