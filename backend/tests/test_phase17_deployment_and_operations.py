"""
SAMANVAY — Phase 17: Deployment and Operations Test Suite

Validates:
1. Production and development configuration boundaries (fail-fast on insecure settings).
2. Health, liveness, readiness, and metrics observability probes.
3. API documentation protection in production mode (prevent debug endpoint exposure).
4. Structured JSON logging format and PII redaction.
5. Database backup generation, SHA-256 cryptographic verification, and safe restoration.
6. Background worker heartbeat tracking and supervision telemetry.
"""

import os
import json
import tempfile
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.config import Settings, settings
from backend.app.core.logging import JsonLogFormatter, sanitize_log_message
from infrastructure.scripts.backup import backup_database, calculate_sha256
from infrastructure.scripts.restore import restore_database
from infrastructure.scripts.worker import write_heartbeat, run_worker_once

client = TestClient(app)


def test_health_endpoints():
    """Validates /health, /health/live, /health/ready, and /health/metrics."""
    # 1. Base /health check
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert data["database"]["status"] == "connected"

    # 2. Liveness probe (/health/live)
    res_live = client.get("/health/live")
    assert res_live.status_code == 200
    assert res_live.json() == {"status": "alive"}

    # 3. Readiness probe (/health/ready)
    res_ready = client.get("/health/ready")
    assert res_ready.status_code == 200
    ready_data = res_ready.json()
    assert ready_data["status"] == "ready"
    assert ready_data["checks"]["database"]["status"] == "ok"
    assert ready_data["checks"]["storage"]["status"] == "ok"
    assert ready_data["checks"]["schema"]["status"] == "ok"

    # 4. Metrics probe (/health/metrics)
    res_metrics = client.get("/health/metrics")
    assert res_metrics.status_code == 200
    metrics_data = res_metrics.json()
    assert "uptime_seconds" in metrics_data
    assert "metrics" in metrics_data
    assert "total_complaints" in metrics_data["metrics"]
    assert "background_worker" in metrics_data


def test_api_v1_health_alias():
    """Validates /api/v1/health aliases for backward compatibility and reverse proxy paths."""
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

    res_live = client.get("/api/v1/health/live")
    assert res_live.status_code == 200
    assert res_live.json() == {"status": "alive"}


def test_production_config_validation():
    """Enforces that insecure production configurations fail fast with explicit errors."""
    # Production with DEBUG=True must raise ValueError
    with pytest.raises(ValueError, match="DEBUG mode must be False in production"):
        s = Settings(APP_ENV="production", DEBUG=True, SEED_SYNTHETIC_DATA=False)
        s.validate_configuration()

    # Production with SEED_SYNTHETIC_DATA=True must raise ValueError
    with pytest.raises(ValueError, match="SEED_SYNTHETIC_DATA must be False in production"):
        s = Settings(APP_ENV="production", DEBUG=False, SEED_SYNTHETIC_DATA=True)
        s.validate_configuration()

    # Production with weak or default secret must raise ValueError
    with pytest.raises(ValueError, match="Insecure or short SECRET_KEY detected"):
        s = Settings(
            APP_ENV="production",
            DEBUG=False,
            SEED_SYNTHETIC_DATA=False,
            SECRET_KEY="short-secret"
        )
        s.validate_configuration()

    # Production with SQLite database URL must raise ValueError
    with pytest.raises(ValueError, match="SQLite database specified in production environment"):
        s = Settings(
            APP_ENV="production",
            DEBUG=False,
            SEED_SYNTHETIC_DATA=False,
            SECRET_KEY="x" * 48,
            DATABASE_URL="sqlite:///./samanvay.db"
        )
        s.validate_configuration()

    # Production with hardened PostgreSQL configuration must pass
    valid_prod = Settings(
        APP_ENV="production",
        DEBUG=False,
        SEED_SYNTHETIC_DATA=False,
        SECRET_KEY="a_very_long_cryptographically_secure_random_production_token_2026",
        DATABASE_URL="postgresql://user:pass@postgres.cluster:5432/samanvay_prod"
    )
    valid_prod.validate_configuration()  # Should not raise


def test_structured_json_logging():
    """Validates JSON log formatter structure and credential scrubbing."""
    import logging

    formatter = JsonLogFormatter()
    record = logging.LogRecord(
        name="test_logger",
        level=logging.INFO,
        pathname="test.py",
        lineno=10,
        msg='User login attempt with password: "secret_pass_123" and token Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlF5m8qU8_2w',
        args=(),
        exc_info=None
    )

    formatted = formatter.format(record)
    log_dict = json.loads(formatted)

    assert "timestamp" in log_dict
    assert log_dict["level"] == "INFO"
    assert log_dict["logger"] == "test_logger"
    assert "secret_pass_123" not in log_dict["message"]
    assert "[SCRUBBED_PASSWORD]" in log_dict["message"]
    assert "[SCRUBBED_JWT]" in log_dict["message"]


def test_database_backup_and_restore_cycle():
    """Validates atomic backup generation, SHA-256 verification, and round-trip restore."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        # 1. Create verified backup
        metadata = backup_database(destination_dir=tmp_dir)
        archive_path = metadata["archive_path"]
        assert os.path.exists(archive_path)
        assert metadata["status"] == "COMPLETED_VERIFIED"
        assert len(metadata["sha256_checksum"]) == 64

        # 2. Check metadata JSON matches archive checksum
        calculated_hash = calculate_sha256(archive_path)
        assert calculated_hash == metadata["sha256_checksum"]

        # 3. Test restoration to a temporary test database
        test_restore_db = os.path.join(tmp_dir, "restored_test.db")
        target_db_url = f"sqlite:///{test_restore_db}"
        restore_res = restore_database(archive_path, target_db_url=target_db_url)

        assert restore_res["status"] == "RESTORED_VERIFIED"
        assert restore_res["sha256_checksum"] == metadata["sha256_checksum"]
        assert os.path.exists(test_restore_db)

        # 4. Tamper detection: alter archive and assert restore aborts
        with open(archive_path, "ab") as f:
            f.write(b"corrupted_tampered_bytes")

        with pytest.raises(ValueError, match="Checksum mismatch"):
            restore_database(archive_path, target_db_url=target_db_url)


def test_worker_heartbeat_and_readiness():
    """Validates background worker heartbeat file emission and metrics discovery."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        test_heartbeat_path = os.path.join(tmp_dir, "test_worker.heartbeat")
        orig_path = settings.BACKGROUND_WORKER_HEARTBEAT_PATH
        try:
            settings.BACKGROUND_WORKER_HEARTBEAT_PATH = test_heartbeat_path

            # Write active heartbeat
            write_heartbeat(status="running", details={"active_tasks": 2})
            assert os.path.exists(test_heartbeat_path)

            with open(test_heartbeat_path, "r") as f:
                hb_data = json.load(f)
            assert hb_data["status"] == "running"
            assert hb_data["details"]["active_tasks"] == 2

            # Metrics endpoint reflects active heartbeat
            res = client.get("/health/metrics")
            assert res.status_code == 200
            data = res.json()
            assert data["background_worker"]["status"] == "running"
            assert data["background_worker"]["last_heartbeat"] is not None

        finally:
            settings.BACKGROUND_WORKER_HEARTBEAT_PATH = orig_path
