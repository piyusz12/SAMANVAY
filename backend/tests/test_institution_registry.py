import pytest
from backend.app.models.institution import Institution
from backend.app.models.audit_log import AuditLog

def test_create_institution_success_and_audit(client, admin_token, db_session):
    """Verify authorized administrator can register a new institution with audit logging."""
    payload = {
        "aicte_id": "1-99887766",
        "aishe_code": "C-99881",
        "name": "Kalinga Institute of Advanced Technology [SYNTHETIC]",
        "state": "Odisha",
        "city": "Bhubaneswar",
        "pin_code": "751024",
        "region": "Eastern",
        "institution_type": "Private-Self-Financed",
        "approval_status": "APPROVED",
        "address": "Plot 101, InfoCity, Bhubaneswar",
        "contact_email": "registrar@kiat-synthetic.ac.in",
        "contact_phone": "+91 674 272 5000"
    }

    res = client.post(
        "/api/v1/institutions",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 201
    data = res.json()
    assert data["aicte_id"] == "1-99887766"
    assert data["normalized_name"] == "KALINGA INSTITUTE OF ADVANCED TECHNOLOGY SYNTHETIC"
    assert data["is_active"] is True

    # Verify audit log
    audit_entry = db_session.query(AuditLog).filter(
        AuditLog.institution_id == data["id"],
        AuditLog.action_type == "INSTITUTION_CREATED"
    ).first()
    assert audit_entry is not None
    assert "registered with AICTE ID 1-99887766" in audit_entry.description

def test_create_institution_rbac_rejection(client, rb_officer_token, auditor_token):
    """Verify Case Officers, Auditors, and unauthenticated users cannot create institutions."""
    payload = {
        "aicte_id": "1-11223344",
        "name": "Unauthorized College [SYNTHETIC]",
        "state": "Delhi",
        "city": "New Delhi",
        "region": "Northern",
        "institution_type": "Govt"
    }

    # Case officer -> 403
    res_officer = client.post(
        "/api/v1/institutions",
        json=payload,
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert res_officer.status_code == 403

    # Auditor -> 403
    res_auditor = client.post(
        "/api/v1/institutions",
        json=payload,
        headers={"Authorization": f"Bearer {auditor_token}"}
    )
    assert res_auditor.status_code == 403

    # Unauthenticated -> 401
    res_unauth = client.post("/api/v1/institutions", json=payload)
    assert res_unauth.status_code == 401

def test_create_institution_duplicate_rejection(client, admin_token):
    """Verify anti-duplicate rules reject AICTE ID, AISHE, and normalized name duplicates with 409 Conflict."""
    # 1. Existing AICTE ID duplicate
    dup_aicte = {
        "aicte_id": "1-10293847",  # Apex Institute AICTE ID in seed data
        "name": "Different Name Institute",
        "state": "Maharashtra",
        "city": "Pune",
        "region": "Western",
        "institution_type": "Govt"
    }
    res1 = client.post(
        "/api/v1/institutions",
        json=dup_aicte,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res1.status_code == 409
    assert "already registered with AICTE Permanent ID" in res1.json()["detail"]

    # 2. Existing AISHE code duplicate
    dup_aishe = {
        "aicte_id": "1-88888888",
        "aishe_code": "C-44120",  # Apex Institute AISHE code in seed data
        "name": "New Institute With Duplicate AISHE",
        "state": "Maharashtra",
        "city": "Pune",
        "region": "Western",
        "institution_type": "Govt"
    }
    res2 = client.post(
        "/api/v1/institutions",
        json=dup_aishe,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res2.status_code == 409
    assert "already registered with AISHE Code" in res2.json()["detail"]

    # 3. Normalized Name + City + State duplicate (fuzzy whitespace/case/punctuation)
    dup_fuzzy_name = {
        "aicte_id": "1-77777777",
        "aishe_code": "C-77777",
        "name": "  apex   institute of   engineering & technology [synthetic]  ",
        "state": "maharashtra",
        "city": "PUNE",
        "region": "Western",
        "institution_type": "Govt"
    }
    res3 = client.post(
        "/api/v1/institutions",
        json=dup_fuzzy_name,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res3.status_code == 409
    assert "already exists in" in res3.json()["detail"]

def test_institution_match_anti_duplicate_precheck(client):
    """Verify /match endpoint provides pre-submission duplicate detection with confidence scoring."""
    # Exact AICTE ID match
    res1 = client.post(
        "/api/v1/institutions/match",
        json={"aicte_id": "1-10293847"}
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["is_duplicate"] is True
    assert data1["match_strategy"] == "AICTE_ID_EXACT"
    assert data1["confidence_score"] == 1.0
    assert data1["matched_institution"]["aicte_id"] == "1-10293847"

    # Normalized Name + Location match
    res2 = client.post(
        "/api/v1/institutions/match",
        json={
            "name": "Apex Institute of Engineering & Technology [SYNTHETIC]",
            "city": "Pune",
            "state": "Maharashtra"
        }
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["is_duplicate"] is True
    assert data2["match_strategy"] == "NORMALIZED_NAME_CITY_STATE"
    assert data2["confidence_score"] >= 0.90

    # Clean unique query
    res3 = client.post(
        "/api/v1/institutions/match",
        json={
            "aicte_id": "1-00000000",
            "name": "Completely Novel Polytechnic",
            "city": "Ranchi",
            "state": "Jharkhand"
        }
    )
    assert res3.status_code == 200
    assert res3.json()["is_duplicate"] is False

def test_update_institution_success_and_audit(client, rb_admin_token, db_session):
    """Verify authorized Bureau Admin can update institution details with audit trail."""
    inst = db_session.query(Institution).filter(Institution.aicte_id == "1-10293847").first()
    inst_id = inst.id

    update_payload = {
        "approval_status": "WITHDRAWAL_OF_APPROVAL",
        "contact_email": "new.legal.contact@apex-synthetic.edu.in",
        "address": "Updated Campus Road, Hinjewadi Phase 2, Pune"
    }

    res = client.patch(
        f"/api/v1/institutions/{inst_id}",
        json=update_payload,
        headers={"Authorization": f"Bearer {rb_admin_token}"}
    )
    assert res.status_code == 200
    updated = res.json()
    assert updated["approval_status"] == "WITHDRAWAL_OF_APPROVAL"
    assert updated["contact_email"] == "new.legal.contact@apex-synthetic.edu.in"

    # Verify audit log recorded with before/after diff
    audit_entry = db_session.query(AuditLog).filter(
        AuditLog.institution_id == inst_id,
        AuditLog.action_type == "INSTITUTION_UPDATED"
    ).order_by(AuditLog.timestamp.desc()).first()
    assert audit_entry is not None
    assert "approval_status" in audit_entry.description or "approval_status" in (audit_entry.new_state or "")

def test_update_institution_duplicate_rejection(client, rb_admin_token, db_session):
    """Verify updating an institution's AISHE code to collide with another institution is blocked."""
    inst1 = db_session.query(Institution).first()
    inst2 = db_session.query(Institution).filter(Institution.id != inst1.id).first()

    # Attempt to change inst2's AISHE code to inst1's AISHE code
    res = client.patch(
        f"/api/v1/institutions/{inst2.id}",
        json={"aishe_code": inst1.aishe_code},
        headers={"Authorization": f"Bearer {rb_admin_token}"}
    )
    assert res.status_code == 409
    assert "Another institution is already registered with AISHE Code" in res.json()["detail"]

def test_list_institutions_pagination_search_and_filter(client):
    """Verify paginated listing, search by ID and normalized name, and filtering."""
    # 1. Search by exact AICTE ID
    res_search_id = client.get("/api/v1/institutions?search=1-10293847")
    assert res_search_id.status_code == 200
    items = res_search_id.json()
    assert len(items) == 1
    assert items[0]["aicte_id"] == "1-10293847"

    # 2. Search by normalized name fragment
    res_search_name = client.get("/api/v1/institutions?search=apex institute")
    assert res_search_name.status_code == 200
    assert len(res_search_name.json()) >= 1

    # 3. Filter by region
    res_region = client.get("/api/v1/institutions?region=Western")
    assert res_region.status_code == 200
    for inst in res_region.json():
        assert inst["region"] == "Western"

    # 4. Paginated format when page parameter is provided
    res_paged = client.get("/api/v1/institutions?page=1&page_size=3&sort_by=name&sort_order=asc")
    assert res_paged.status_code == 200
    paged_data = res_paged.json()
    assert "total" in paged_data
    assert paged_data["page"] == 1
    assert paged_data["page_size"] == 3
    assert len(paged_data["items"]) == 3
    assert paged_data["total"] >= 5

def test_institution_360_dossier_breakdown_counts(client, db_session):
    """Verify consolidated 360-degree dossier returns all required breakdown counts and links."""
    # Find Apex Institute which has multiple complaints
    inst = db_session.query(Institution).filter(Institution.aicte_id == "1-10293847").first()

    res = client.get(f"/api/v1/institutions/{inst.id}/dossier")
    assert res.status_code == 200
    dossier = res.json()

    # Validate schema fields
    assert "institution" in dossier
    assert dossier["institution"]["aicte_id"] == "1-10293847"

    # Breakdown counts
    assert "total_complaints" in dossier
    assert "open_complaints" in dossier
    assert "pending_complaints" in dossier
    assert "disposed_complaints" in dossier
    assert "overdue_complaints" in dossier
    assert "overlapping_complaints" in dossier
    assert dossier["total_complaints"] >= 3

    # Conflict radar alert
    assert "conflict_alert" in dossier
    assert dossier["conflict_alert"]["has_conflict"] is True
    assert len(dossier["bureaus_involved"]) >= 2

    # Recent complaints list with case links
    assert len(dossier["recent_complaints"]) >= 3
    first_case = dossier["recent_complaints"][0]
    assert "id" in first_case
    assert "complaint_no" in first_case
    assert "bureau" in first_case
    assert "status" in first_case
    assert "days_open" in first_case
    assert "sla_status" in first_case

    # Audit history included
    assert "audit_history" in dossier

def test_institution_audit_history_endpoint(client, db_session):
    """Verify dedicated audit history endpoint returns change logs for institution."""
    inst = db_session.query(Institution).first()
    res = client.get(f"/api/v1/institutions/{inst.id}/audit-history")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_import_synthetic_institutions_csv_dry_run_and_commit(client, admin_token):
    """Verify CSV dataset import: dry_run validation preview and commit mode."""
    # Sample synthetic CSV containing:
    # 1. Valid new institution
    # 2. Duplicate institution (AICTE ID collision)
    # 3. Format error (missing required state)
    csv_content = """aicte_id,name,state,city,region,institution_type,approval_status,address
1-99911100,Vanguard Institute of Technology [SYNTHETIC],Tamil Nadu,Chennai,Southern,Private-Self-Financed,APPROVED,OMR IT Corridor
1-10293847,Duplicate Apex Name,Maharashtra,Pune,Western,Govt,APPROVED,Old Road
1-99922200,Incomplete Institute,,Mumbai,Western,Govt,APPROVED,Sea Face Road
"""

    # 1. Dry run validation (does not write to DB)
    files = {"file": ("synthetic_institutions.csv", csv_content, "text/csv")}
    dry_res = client.post(
        "/api/v1/institutions/import-csv?dry_run=true",
        files=files,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert dry_res.status_code == 200
    dry_data = dry_res.json()
    assert dry_data["dry_run"] is True
    assert dry_data["total_rows"] == 3
    assert dry_data["imported_count"] == 1
    assert dry_data["skipped_duplicates_count"] == 1
    assert dry_data["error_count"] == 1

    # Verify dry run did not insert Vanguard Institute
    search_dry = client.get("/api/v1/institutions?search=1-99911100")
    assert len(search_dry.json()) == 0

    # 2. Commit mode (dry_run=false)
    files_commit = {"file": ("synthetic_institutions.csv", csv_content, "text/csv")}
    commit_res = client.post(
        "/api/v1/institutions/import-csv?dry_run=false",
        files=files_commit,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert commit_res.status_code == 200
    commit_data = commit_res.json()
    assert commit_data["dry_run"] is False
    assert commit_data["imported_count"] == 1

    # Verify Vanguard Institute was inserted into PostgreSQL/SQLite
    search_commit = client.get("/api/v1/institutions?search=1-99911100")
    assert len(search_commit.json()) == 1
    assert search_commit.json()[0]["name"] == "Vanguard Institute of Technology [SYNTHETIC]"
