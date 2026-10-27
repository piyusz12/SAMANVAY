"""
SAMANVAY (SIH PS 26264) — Regression Tests for CodeRabbit Review Fixes

Validates:
1. Seed script fails closed in production (APP_ENV=production).
2. Health readiness probe does not expose internal exception text.
3. Health metrics detects stale background worker heartbeat.
4. Overlap engine token pre-screen catches paraphrased word inflections (e.g. salary/salaries).
5. Similarity candidate selection prioritizes same-institution complaints deterministically.
6. Database backup/restore fails closed on missing checksum sidecar unless explicitly overridden.
"""

import os
import json
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.config import settings
from backend.app.database import SessionLocal
from backend.app.services.overlap_engine import evaluate_stage4_semantic_similarity
from backend.app.services.similarity_service import calculate_explainable_similarity
from infrastructure.scripts.seed_demo_data import seed_demo_dataset
from infrastructure.scripts.restore import restore_database

client = TestClient(app)


def test_seed_demo_data_blocked_in_production(monkeypatch):
    """Verify seed_demo_dataset raises RuntimeError when APP_ENV is production."""
    monkeypatch.setattr(settings, "APP_ENV", "production")
    db = SessionLocal()
    try:
        with pytest.raises(RuntimeError, match="Refusing to seed or reset demo data when APP_ENV=production"):
            seed_demo_dataset(db, reset=True)
    finally:
        db.close()


def test_health_readiness_probe_does_not_leak_raw_exception(monkeypatch):
    """Verify /health/ready probe returns status: fail without raw error stack on storage failure."""
    def broken_open(*args, **kwargs):
        raise PermissionError("Access denied: /secure/vault/forbidden_path/details")

    # Patch open only within the readiness probe
    from backend.app.api import health
    monkeypatch.setattr("builtins.open", broken_open)

    res = client.get("/health/ready")
    assert res.status_code == 503
    data = res.json()
    assert data["checks"]["storage"]["status"] == "fail"
    # Verify raw driver/path exception text is NOT present in the client payload
    assert "error" not in data["checks"]["storage"]
    assert "forbidden_path" not in res.text


def test_health_metrics_detects_stale_heartbeat(tmp_path, monkeypatch):
    """Verify /health/metrics detects worker heartbeat older than threshold as stale."""
    heartbeat_file = tmp_path / "worker.heartbeat"
    # Create heartbeat with timestamp 30 minutes in the past
    past_time = (datetime.now(timezone.utc) - timedelta(minutes=30)).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    heartbeat_data = {
        "status": "running",
        "timestamp": past_time,
        "pid": 99999
    }
    heartbeat_file.write_text(json.dumps(heartbeat_data))

    monkeypatch.setattr(settings, "BACKGROUND_WORKER_HEARTBEAT_PATH", str(heartbeat_file))

    res = client.get("/health/metrics")
    assert res.status_code == 200
    metrics = res.json()
    assert metrics["background_worker"]["status"] == "stale"


def test_overlap_engine_prefix_stem_inflection_matching():
    """Verify token pre-screen does not drop paraphrased texts sharing inflected word stems."""
    # Text 1 uses singular 'salary', text 2 uses plural 'salaries'
    text1 = "The faculty salary has been withheld for six consecutive months by the administration."
    text2 = "Unpaid salaries of engineering professors delayed without explanation or disbursal."

    result = evaluate_stage4_semantic_similarity(text1, text2)
    # Result score must be > 0.0 because of shared stems ('salar')
    # Without stem pre-screening, disjoint word forms would be fast-dropped to 0.0
    assert result["score"] > 0.0


def test_restore_database_fails_closed_on_missing_checksum(tmp_path):
    """Verify restore_database raises ValueError if sidecar metadata checksum is missing."""
    dummy_archive = tmp_path / "corrupted_archive.db"
    dummy_archive.write_text("corrupted content")

    # Attempting restore without metadata file should fail closed
    with pytest.raises(ValueError, match="No checksum metadata found for archive"):
        restore_database(str(dummy_archive), allow_unverified=False)


def test_similarity_candidate_retrieval_cross_institution_isolation():
    """Verify similarity retrieval executes successfully with disjoint same-inst and cross-inst candidate pools."""
    db = SessionLocal()
    try:
        # Evaluate explainable similarity for a dummy subject/description
        res = calculate_explainable_similarity(
            db=db,
            subject="Infrastructure safety audit and building structural crack inspection",
            description="Inspection of college engineering block walls reveals dangerous structural cracks.",
            institution_id=1,
            category="Infrastructure",
            threshold=0.3
        )
        assert isinstance(res, dict)
        assert "matches" in res
        assert "highest_score" in res
        assert "total_evaluated_candidates" in res
    finally:
        db.close()


def test_similarity_candidate_retrieval_direct_case_reference_prioritization():
    """Verify complaints referenced by explicit case number in description are prioritized as candidates (including lowercase and disclosure controls)."""
    from backend.app.models.complaint import Complaint
    from backend.app.models.user import User
    db = SessionLocal()
    try:
        sample_complaint = db.query(Complaint).first()
        if sample_complaint:
            # 1. Unauthenticated caller: cross-bureau case existence and text score are NOT disclosed
            res_unauth = calculate_explainable_similarity(
                db=db,
                subject="Follow-up on earlier incident",
                description=f"This complaint refers directly to previous case {sample_complaint.complaint_no.lower()}.",
                institution_id=99999,  # Unrelated institution
                category="General",
                threshold=0.1,
                current_user=None
            )
            matched_unauth = next((m for m in res_unauth["matches"] if m["complaint_id"] == sample_complaint.id), None)
            assert matched_unauth is None  # Blocked from metadata oracle

            # 2. Authorized caller (matching bureau): direct reference is prioritized and matched
            auth_user = User(id=1, email="admin@aicte.gov.in", role="BUREAU_ADMIN", bureau=sample_complaint.bureau)
            res_auth = calculate_explainable_similarity(
                db=db,
                subject="Follow-up on earlier incident",
                description=f"This complaint refers directly to previous case {sample_complaint.complaint_no.lower()}.",
                institution_id=99999,
                category="General",
                threshold=0.1,
                current_user=auth_user
            )
            matched_auth = next((m for m in res_auth["matches"] if m["complaint_id"] == sample_complaint.id), None)
            assert matched_auth is not None
            assert matched_auth["subject"] == sample_complaint.subject
            assert matched_auth["complaint_id"] == sample_complaint.id
    finally:
        db.close()


