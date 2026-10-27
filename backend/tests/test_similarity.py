import pytest
from backend.app.services.overlap_engine import (
    evaluate_benchmark_dataset,
    find_optimal_thresholds,
    evaluate_staged_overlap_pair,
    normalize_institution_name,
    LABELLED_BENCHMARK_PAIRS
)

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
    # Verify staged breakdown fields
    assert "staged_breakdown" in top_match
    staged = top_match["staged_breakdown"]
    assert "stage_1_exact_id_match" in staged
    assert "stage_2_name_similarity" in staged
    assert "stage_3_metadata_similarity" in staged
    assert "stage_4_semantic_similarity" in staged
    assert "reasons" in top_match
    assert len(top_match["reasons"]) > 0


def test_linkage_workflow(client, officer_token, admin_token):
    # Propose/create a linkage
    complaints = client.get("/api/v1/complaints").json()["items"]
    # Pick one complaint from REGULATION_BUREAU and one from another bureau to test cross-bureau overlap
    c_rb = next((c for c in complaints if c.get("bureau") == "REGULATION_BUREAU"), complaints[0])
    c_other = next((c for c in complaints if c.get("id") != c_rb["id"]), complaints[1])

    link_payload = {
        "source_complaint_id": c_rb["id"],
        "target_complaint_id": c_other["id"],
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
    assert linkage["status"] in ("CONFIRMED_RELATED", "CONFIRMED_BY_OFFICER")
    assert linkage["confidence_tier"] in ("HIGH", "MEDIUM")

    # Human review - confirm related with rationale
    review_res = client.patch(
        f"/api/v1/similarity/linkages/{linkage['id']}",
        json={"status": "CONFIRMED_RELATED", "verification_notes": "Reviewed and verified cross-bureau overlap."},
        headers={"Authorization": f"Bearer {officer_token}"}
    )
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "CONFIRMED_RELATED"

    # Human review - dismiss false positive as NOT_RELATED
    dismiss_res = client.patch(
        f"/api/v1/similarity/linkages/{linkage['id']}",
        json={"status": "NOT_RELATED", "verification_notes": "Different academic departments after inquiry."},
        headers={"Authorization": f"Bearer {officer_token}"}
    )
    assert dismiss_res.status_code == 200
    assert dismiss_res.json()["status"] == "NOT_RELATED"


def test_staged_overlap_matching_pipeline():
    """
    Tests the 4-stage matching pipeline:
    Stage 1: Exact matches using stable identifiers
    Stage 2: Normalized institution-name matching and aliases
    Stage 3: Categorical & metadata comparison
    Stage 4: Text semantic similarity
    """
    # 1. Exact match with same AICTE permanent ID & AISHE code
    eval_exact = evaluate_staged_overlap_pair(
        source_inst_id="1-10293847",
        source_inst_name="Apex Institute of Engineering & Technology",
        source_aishe="C-44120",
        source_category="FACULTY_SALARY_WITHHELD",
        source_subject="Faculty salary pending",
        source_desc="Assistant professors salary not credited for 3 months.",
        source_bureau="PGRC",
        target_inst_id="1-10293847",
        target_inst_name="Apex Institute of Engineering & Technology",
        target_aishe="C-44120",
        target_category="FACULTY_SALARY_WITHHELD",
        target_subject="Unpaid teaching staff compensation",
        target_desc="Professors in ECE branch have unpaid salaries since 90 days.",
        target_bureau="REGULATION_BUREAU"
    )
    assert eval_exact["stage_1_exact_id_match"] is True
    assert eval_exact["composite_score"] >= 0.75
    assert eval_exact["confidence_tier"] == "HIGH"
    assert any("institution" in r.lower() or "aicte" in r.lower() for r in eval_exact["reasons"])
    assert any("bureau" in r.lower() for r in eval_exact["reasons"])

    # 2. Spelling variations & Aliases in institution name (missing ID)
    norm1 = normalize_institution_name("N.I.S.T. Bangalore")
    norm2 = normalize_institution_name("National Institute of Science & Technology, Electronic City, Bengaluru")
    assert "nist" in norm1.lower()
    
    eval_alias = evaluate_staged_overlap_pair(
        source_inst_id=None,
        source_inst_name="APEX ENGG",
        source_aishe=None,
        source_category="FAKE_DEGREES_DOCUMENTS",
        source_subject="Fake faculty credentials",
        source_desc="Non-existent professors shown on website.",
        source_bureau="VIGILANCE_CELL",
        target_inst_id=None,
        target_inst_name="Apex Institute of Engineering & Technology",
        target_aishe=None,
        target_category="FAKE_DEGREES_DOCUMENTS",
        target_subject="Ghost faculty audit",
        target_desc="18 fake faculty Aadhaar cards detected in annual approval inspection.",
        target_bureau="APPROVAL_BUREAU"
    )
    assert eval_alias["stage_2_name_similarity"] > 0.8
    assert eval_alias["composite_score"] >= 0.70
    assert any("alias" in r.lower() or "acronym" in r.lower() or "name" in r.lower() for r in eval_alias["reasons"])

    # 3. Unrelated cases involving same institution (True Negative for complaint overlap)
    eval_diff_topic = evaluate_staged_overlap_pair(
        source_inst_id="1-10293847",
        source_inst_name="Apex Institute of Engineering & Technology",
        source_aishe="C-44120",
        source_category="RAGGING_HARASSMENT",
        source_subject="Ragging incident in hostel block 4",
        source_desc="First year student harassment during night hours in boy hostel.",
        source_bureau="PGRC",
        target_inst_id="1-10293847",
        target_inst_name="Apex Institute of Engineering & Technology",
        target_aishe="C-44120",
        target_category="UNAPPROVED_COURSES",
        target_subject="Unapproved cyber security diploma course",
        target_desc="Commercial diploma conducted on weekend without council intake approval.",
        target_bureau="APPROVAL_BUREAU"
    )
    # Different categories and descriptions, so category and semantic scores are low
    assert eval_diff_topic["stage_3_metadata_similarity"] < 0.60
    assert eval_diff_topic["stage_4_semantic_similarity"] < 0.35

    # 4. Completely different institutions and topics (True Negative)
    eval_diff_inst = evaluate_staged_overlap_pair(
        source_inst_id="1-10293847",
        source_inst_name="Apex Institute of Engineering & Technology",
        source_aishe="C-44120",
        source_category="FEE_EXTORTION",
        source_subject="Withholding marksheet for capitation fee",
        source_desc="Graduates denied degree certificate.",
        source_bureau="PGRC",
        target_inst_id="1-58392019",
        target_inst_name="Heritage Polytechnic Institute",
        target_aishe="C-22910",
        target_category="INFRASTRUCTURE_DEFICIT",
        target_subject="Cracked laboratory roof and flood water logging",
        target_desc="Salt lake civil structure hazard.",
        target_bureau="REGULATION_BUREAU"
    )
    assert eval_diff_inst["stage_1_exact_id_match"] is False
    assert eval_diff_inst["composite_score"] < 0.30
    assert eval_diff_inst["confidence_tier"] in ("LOW", "BELOW_THRESHOLD")


def test_labelled_benchmark_evaluation(client):
    """
    Validates precision, recall, and F1 score against the labelled synthetic evaluation dataset.
    Confirms tuned threshold performance per PS 26264 acceptance criteria.
    """
    res = client.get("/api/v1/similarity/evaluate-benchmark")
    assert res.status_code == 200
    data = res.json()
    assert data["total_evaluated_pairs"] == len(LABELLED_BENCHMARK_PAIRS)
    metrics = data["metrics"]
    assert metrics["precision"] >= 0.80
    assert metrics["recall"] >= 0.80
    assert metrics["f1_score"] >= 0.80
    assert metrics["accuracy"] >= 0.80

    # Test optimal thresholds sweep endpoint
    opt_res = client.get("/api/v1/similarity/optimal-thresholds")
    assert opt_res.status_code == 200
    opt_data = opt_res.json()
    assert "optimal_thresholds" in opt_data
    assert "optimal_f1" in opt_data
    assert opt_data["optimal_f1"] >= 0.80


def test_cross_bureau_access_controls_on_linkages(client, officer_token, auditor_token):
    """
    Verifies that bureau-scoped access control is strictly enforced:
    1. Read-only auditors cannot create linkages (403 Forbidden).
    2. Regulation bureau officers cannot link complaints between Approval Bureau and Legal Cell.
    """
    complaints = client.get("/api/v1/complaints").json()["items"]
    c_pgrc = next((c for c in complaints if c.get("bureau") == "PGRC"), None)
    c_legal = next((c for c in complaints if c.get("bureau") == "LEGAL_CELL"), None)

    if c_pgrc and c_legal:
        # Officer of REGULATION_BUREAU attempting to link PGRC <-> LEGAL_CELL
        res = client.post(
            "/api/v1/similarity/link",
            json={
                "source_complaint_id": c_pgrc["id"],
                "target_complaint_id": c_legal["id"],
                "link_type": "CROSS_BUREAU_OVERLAP",
                "similarity_score": 0.80,
                "explanation": {"rationale": "Cross-bureau test"},
                "notes": "Unauthorized attempt."
            },
            headers={"Authorization": f"Bearer {officer_token}"}
        )
        assert res.status_code == 403
        assert "cannot link cases outside your bureau" in res.json()["detail"].lower()

    # Auditor attempting mutation
    if c_pgrc and len(complaints) > 1:
        c_other = complaints[1]
        audit_res = client.post(
            "/api/v1/similarity/link",
            json={
                "source_complaint_id": c_pgrc["id"],
                "target_complaint_id": c_other["id"],
                "link_type": "CROSS_BUREAU_OVERLAP",
                "similarity_score": 0.80,
                "explanation": {"rationale": "Auditor test"},
                "notes": "Auditor attempt."
            },
            headers={"Authorization": f"Bearer {auditor_token}"}
        )
        assert audit_res.status_code == 403
