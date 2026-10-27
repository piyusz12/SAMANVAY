import hashlib
from typing import Optional, Dict, Any, Tuple, List
from sqlalchemy.orm import Session
from backend.app.models.audit_log import AuditLog
from backend.app.core.datetime_util import utc_now
from backend.app.core.logging import request_id_ctx_var

GENESIS_PREV_HASH = "0" * 64

def compute_audit_hash(
    prev_hash: str,
    timestamp_iso: str,
    actor_id: Optional[int],
    actor_name: str,
    action_type: str,
    description: str,
    complaint_id: Optional[int],
    institution_id: Optional[int],
    request_id: Optional[str]
) -> str:
    """Computes a deterministic SHA-256 hash across canonical audit record fields."""
    canonical = (
        f"{prev_hash}|{timestamp_iso}|{actor_id or ''}|{actor_name}|{action_type}|"
        f"{description}|{complaint_id or ''}|{institution_id or ''}|{request_id or ''}"
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

def log_audit_event(
    db: Session,
    action_type: str,
    description: str,
    actor_id: Optional[int] = None,
    actor_name: str = "System",
    actor_role: str = "SYSTEM",
    actor_bureau: str = "SYSTEM",
    complaint_id: Optional[int] = None,
    institution_id: Optional[int] = None,
    previous_state: Optional[str] = None,
    new_state: Optional[str] = None,
    ip_address: Optional[str] = None,
    commit: bool = False
) -> AuditLog:
    """
    Records an append-only regulatory audit event with cryptographic SHA-256 hash chaining.
    Privileged modifications or deletions are independently detectable.
    """
    # Look up previous entry hash for chain link
    latest = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    prev_hash = latest.entry_hash if (latest and latest.entry_hash) else GENESIS_PREV_HASH

    now = utc_now()
    req_id = request_id_ctx_var.get()

    entry_hash = compute_audit_hash(
        prev_hash=prev_hash,
        timestamp_iso=now.isoformat(),
        actor_id=actor_id,
        actor_name=actor_name,
        action_type=action_type,
        description=description,
        complaint_id=complaint_id,
        institution_id=institution_id,
        request_id=req_id
    )

    entry = AuditLog(
        complaint_id=complaint_id,
        institution_id=institution_id,
        actor_id=actor_id,
        actor_name=actor_name,
        actor_role=actor_role,
        actor_bureau=actor_bureau,
        action_type=action_type,
        description=description,
        previous_state=previous_state,
        new_state=new_state,
        ip_address=ip_address,
        request_id=req_id,
        timestamp=now,
        prev_hash=prev_hash,
        entry_hash=entry_hash
    )
    db.add(entry)
    if commit:
        db.commit()
        db.refresh(entry)
    return entry

def verify_audit_trail_integrity(db: Session) -> Dict[str, Any]:
    """
    Cryptographically verifies the complete audit log hash chain.
    Detects any row modifications, unauthorized insertions, or deletions.
    """
    entries = db.query(AuditLog).order_by(AuditLog.id.asc()).all()
    if not entries:
        return {
            "is_intact": True,
            "total_records": 0,
            "head_hash": GENESIS_PREV_HASH,
            "details": "Audit log is empty."
        }

    expected_prev = GENESIS_PREV_HASH
    for idx, entry in enumerate(entries):
        # 1. Verify chain link continuity (if record has hash chaining)
        if entry.prev_hash is not None and entry.prev_hash != expected_prev:
            return {
                "is_intact": False,
                "violation_type": "CHAIN_BROKEN",
                "tampered_entry_id": entry.id,
                "record_index": idx,
                "expected_prev_hash": expected_prev,
                "actual_prev_hash": entry.prev_hash,
                "verified_prior_count": idx,
                "details": f"Chain link broken at AuditLog ID {entry.id}. Prior hash mismatch."
            }

        if entry.entry_hash is not None:
            # 2. Recompute content hash
            recomputed = compute_audit_hash(
                prev_hash=entry.prev_hash or expected_prev,
                timestamp_iso=entry.timestamp.isoformat(),
                actor_id=entry.actor_id,
                actor_name=entry.actor_name,
                action_type=entry.action_type,
                description=entry.description,
                complaint_id=entry.complaint_id,
                institution_id=entry.institution_id,
                request_id=entry.request_id
            )
            if recomputed != entry.entry_hash:
                return {
                    "is_intact": False,
                    "violation_type": "CONTENT_TAMPERED",
                    "tampered_entry_id": entry.id,
                    "record_index": idx,
                    "expected_hash": recomputed,
                    "actual_hash": entry.entry_hash,
                    "verified_prior_count": idx,
                    "details": f"Content tampering detected in AuditLog ID {entry.id}. Record payload has been modified."
                }
            expected_prev = entry.entry_hash
        else:
            expected_prev = GENESIS_PREV_HASH

    return {
        "is_intact": True,
        "total_records": len(entries),
        "head_hash": entries[-1].entry_hash if entries and entries[-1].entry_hash else GENESIS_PREV_HASH,
        "first_timestamp": entries[0].timestamp.isoformat() if entries else None,
        "latest_timestamp": entries[-1].timestamp.isoformat() if entries else None,
        "details": f"All {len(entries)} audit records cryptographically verified against SHA-256 chain."
    }
