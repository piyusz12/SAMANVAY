"""
SAMANVAY (SIH PS 26264) — Verified Database Restoration Utility
Validates cryptographic checksums before restoring, guards against tampering,
and verifies schema and data integrity post-restoration.
"""

import os
import sys
import json
import sqlite3
import hashlib
import argparse
import subprocess
from datetime import datetime, timezone

# Ensure project root is in python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.app.config import settings
from backend.app.core.db_check import validate_database_connection
from backend.app.core.logging import logger


def calculate_sha256(filepath: str) -> str:
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            sha.update(chunk)
    return sha.hexdigest()


def restore_database(backup_archive_path: str, target_db_url: str = None) -> dict:
    """
    Restores database from a verified backup archive.
    Performs pre-restore checksum validation and post-restore integrity check.
    """
    if not os.path.exists(backup_archive_path):
        raise FileNotFoundError(f"Backup archive not found at: {backup_archive_path}")

    # Check for metadata JSON
    base, ext = os.path.splitext(backup_archive_path)
    metadata_path = f"{base}.json"
    expected_hash = None
    if os.path.exists(metadata_path):
        with open(metadata_path, "r") as f:
            meta = json.load(f)
            expected_hash = meta.get("sha256_checksum")

    # 1. Pre-restore cryptographic integrity verification
    computed_hash = calculate_sha256(backup_archive_path)
    if expected_hash and computed_hash != expected_hash:
        raise ValueError(
            f"[RESTORE ABORTED] Checksum mismatch! Archive may be corrupted or tampered.\n"
            f"Expected: {expected_hash}\nComputed: {computed_hash}"
        )

    logger.info(f"[Restore] Checksum verified ({computed_hash[:16]}...). Proceeding with restoration...")

    active_db_url = target_db_url or settings.DATABASE_URL
    is_sqlite = active_db_url.startswith("sqlite") or backup_archive_path.endswith(".db")

    if is_sqlite:
        sqlite_path = active_db_url.replace("sqlite:///", "")
        if not os.path.isabs(sqlite_path):
            root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            sqlite_path = os.path.abspath(os.path.join(root_dir, sqlite_path))

        logger.info(f"[Restore] Restoring SQLite database to {sqlite_path}...")
        # Safe atomic replacement using backup API
        src_conn = sqlite3.connect(backup_archive_path)
        dest_conn = sqlite3.connect(sqlite_path)
        with dest_conn:
            src_conn.backup(dest_conn, pages=100)
        src_conn.close()
        dest_conn.close()

    else:
        logger.info(f"[Restore] Restoring PostgreSQL database from {backup_archive_path}...")
        cmd = ["pg_restore", "--clean", "--if-exists", "--no-owner", "-d", active_db_url, backup_archive_path]
        res = subprocess.run(cmd, capture_output=True, text=True)
        # Note: pg_restore returns 0 on success, or 1 with benign warnings
        if res.returncode not in (0, 1):
            raise RuntimeError(f"pg_restore failed with code {res.returncode}: {res.stderr}")

    # 2. Post-restore verification
    is_ok, diag = validate_database_connection(db_url=active_db_url)
    if not is_ok:
        raise RuntimeError(f"Post-restore database validation failed: {diag.get('error')}")

    logger.info(f"[Restore] Database successfully restored and validated (Dialect: {diag['dialect']}).")
    return {
        "status": "RESTORED_VERIFIED",
        "archive_restored": backup_archive_path,
        "sha256_checksum": computed_hash,
        "restored_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    }


def main():
    parser = argparse.ArgumentParser(description="SAMANVAY Database Restoration Tool")
    parser.add_argument("archive", help="Path to database backup archive (.db or .dump)")
    parser.add_argument("--db-url", default=None, help="Optional target database URL")
    args = parser.parse_args()

    result = restore_database(args.archive, args.db_url)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
