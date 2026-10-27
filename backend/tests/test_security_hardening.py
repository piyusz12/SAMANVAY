import io
import pytest
from backend.app.config import settings

def test_security_headers_present(client):
    """Verify that all API responses contain OWASP-recommended security headers."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") in ("DENY", "SAMEORIGIN")
    assert response.headers.get("X-XSS-Protection") == "1; mode=block"
    assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "X-Request-ID" in response.headers
    assert "X-Response-Time" in response.headers

def test_evidence_upload_unsupported_file_extension_rejected(client, admin_token):
    """Verify that potentially dangerous executable or script files are strictly rejected."""
    bad_file = io.BytesIO(b"echo 'malicious script'")
    response = client.post(
        "/api/v1/complaints/1/upload",
        files={"file": ("exploit.sh", bad_file, "text/x-shellscript")},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]

def test_evidence_upload_empty_file_rejected(client, admin_token):
    """Verify that empty (0 bytes) upload attempts are rejected."""
    empty_file = io.BytesIO(b"")
    response = client.post(
        "/api/v1/complaints/1/upload",
        files={"file": ("empty.pdf", empty_file, "application/pdf")},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()

def test_evidence_upload_path_traversal_sanitized(client, admin_token):
    """Verify that directory traversal attempts in filenames are safely sanitized and contained."""
    file_content = io.BytesIO(b"%PDF-1.4 test secure content")
    response = client.post(
        "/api/v1/complaints/1/upload",
        files={"file": ("../../../../etc/passwd.pdf", file_content, "application/pdf")},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert ".." not in data["filename"]
    assert "/" not in data["filename"]
    assert "\\" not in data["filename"]

def test_evidence_upload_size_limit_enforced(client, admin_token):
    """Verify that files exceeding 15MB are rejected with 413 Request Entity Too Large."""
    # 15MB + 100 bytes
    oversized_data = b"0" * (15 * 1024 * 1024 + 100)
    oversized_file = io.BytesIO(oversized_data)
    response = client.post(
        "/api/v1/complaints/1/upload",
        files={"file": ("huge_evidence.pdf", oversized_file, "application/pdf")},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 413
    assert "exceeds" in response.json()["detail"].lower()

def test_csv_import_invalid_extension_rejected(client, admin_token):
    """Verify that non-CSV uploads to the institution import endpoint are rejected."""
    bad_csv = io.BytesIO(b'{"name": "test"}')
    response = client.post(
        "/api/v1/institutions/import-csv?dry_run=true",
        files={"file": ("institutions.json", bad_csv, "application/json")},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 400
    assert "Only CSV files" in response.json()["detail"]

def test_cors_settings_safe_from_wildcard_credentials():
    """Verify that wildcard origins are not configured alongside credentials."""
    origins = settings.BACKEND_CORS_ORIGINS
    assert "*" not in origins
    for origin in origins:
        assert origin.startswith("http://") or origin.startswith("https://")
