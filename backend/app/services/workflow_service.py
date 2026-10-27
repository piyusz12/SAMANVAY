"""
Workflow Transition Service
Implements a configurable state machine for complaint cases, enforcing valid transitions,
role-based closure authorization, and mandatory justifications.
"""
from typing import Dict, List, Optional, Tuple, Any
import json
from sqlalchemy.orm import Session
from backend.app.models.system_config import SystemConfig

# Configurable Status Definitions
STATUS_METADATA: Dict[str, Dict[str, str]] = {
    "RECEIVED": {
        "label": "Received / Lodged",
        "category": "OPEN",
        "description": "Initial intake of complaint record awaiting preliminary scrutiny."
    },
    "LODGED": {
        "label": "Received / Lodged",
        "category": "OPEN",
        "description": "Initial intake of complaint record awaiting preliminary scrutiny."
    },
    "UNDER_REVIEW": {
        "label": "Under Review",
        "category": "SCRUTINY",
        "description": "Preliminary assessment and prima facie regulatory evaluation."
    },
    "SCRUTINY_PENDING": {
        "label": "Under Review",
        "category": "SCRUTINY",
        "description": "Preliminary assessment and prima facie regulatory evaluation."
    },
    "IN_PROGRESS": {
        "label": "In Progress / Active Inquiry",
        "category": "INVESTIGATION",
        "description": "Under active inquiry or investigation by appointed desk officer."
    },
    "UNDER_INQUIRY": {
        "label": "In Progress / Active Inquiry",
        "category": "INVESTIGATION",
        "description": "Under active inquiry or investigation by appointed desk officer."
    },
    "AWAITING_INFORMATION": {
        "label": "Awaiting Information",
        "category": "AWAITING",
        "description": "Proceedings paused pending submission of documents or clarifications."
    },
    "AWAITING_INFO": {
        "label": "Awaiting Information",
        "category": "AWAITING",
        "description": "Proceedings paused pending submission of documents or clarifications."
    },
    "SHOW_CAUSE_ISSUED": {
        "label": "Show Cause Issued",
        "category": "PROCEEDINGS",
        "description": "Statutory Show Cause Notice dispatched to the institution."
    },
    "HEARING_SCHEDULED": {
        "label": "Hearing Scheduled",
        "category": "PROCEEDINGS",
        "description": "Formal oral or virtual hearing convened before the AICTE committee."
    },
    "TRANSFERRED": {
        "label": "Transferred",
        "category": "MOVEMENT",
        "description": "Jurisdiction formally transferred to another specialized bureau."
    },
    "ESCALATED": {
        "label": "Escalated",
        "category": "ESCALATION",
        "description": "Escalated to Vigilance Cell, Legal Cell, or Central Administration for high-priority action."
    },
    "RESOLVED": {
        "label": "Resolved",
        "category": "TERMINAL",
        "description": "Substantive grievance addressed and directives issued."
    },
    "DISPOSED": {
        "label": "Disposed / Closed",
        "category": "TERMINAL",
        "description": "Proceedings formally concluded, signed off, and archived."
    }
}

# Standard Default Transition Matrix
DEFAULT_TRANSITIONS: Dict[str, List[str]] = {
    "RECEIVED": ["UNDER_REVIEW", "IN_PROGRESS", "AWAITING_INFORMATION", "TRANSFERRED", "DISPOSED"],
    "LODGED": ["UNDER_REVIEW", "IN_PROGRESS", "AWAITING_INFORMATION", "TRANSFERRED", "DISPOSED"],
    "UNDER_REVIEW": ["IN_PROGRESS", "AWAITING_INFORMATION", "SHOW_CAUSE_ISSUED", "TRANSFERRED", "ESCALATED", "DISPOSED"],
    "SCRUTINY_PENDING": ["UNDER_REVIEW", "IN_PROGRESS", "AWAITING_INFORMATION", "TRANSFERRED", "ESCALATED", "DISPOSED"],
    "IN_PROGRESS": ["AWAITING_INFORMATION", "SHOW_CAUSE_ISSUED", "HEARING_SCHEDULED", "TRANSFERRED", "ESCALATED", "RESOLVED", "DISPOSED"],
    "UNDER_INQUIRY": ["AWAITING_INFORMATION", "SHOW_CAUSE_ISSUED", "HEARING_SCHEDULED", "TRANSFERRED", "ESCALATED", "RESOLVED", "DISPOSED"],
    "AWAITING_INFORMATION": ["IN_PROGRESS", "UNDER_REVIEW", "SHOW_CAUSE_ISSUED", "ESCALATED", "DISPOSED"],
    "AWAITING_INFO": ["IN_PROGRESS", "UNDER_REVIEW", "SHOW_CAUSE_ISSUED", "ESCALATED", "DISPOSED"],
    "SHOW_CAUSE_ISSUED": ["AWAITING_INFORMATION", "HEARING_SCHEDULED", "IN_PROGRESS", "ESCALATED", "RESOLVED", "DISPOSED"],
    "HEARING_SCHEDULED": ["IN_PROGRESS", "SHOW_CAUSE_ISSUED", "ESCALATED", "RESOLVED", "DISPOSED"],
    "TRANSFERRED": ["UNDER_REVIEW", "IN_PROGRESS"],
    "ESCALATED": ["IN_PROGRESS", "HEARING_SCHEDULED", "SHOW_CAUSE_ISSUED", "TRANSFERRED", "DISPOSED"],
    "RESOLVED": ["DISPOSED", "UNDER_REVIEW"],  # Allowed re-opening to Under Review or final archival
    "DISPOSED": ["UNDER_REVIEW"]  # Exceptional re-opening with administrative approval
}

# Transitions requiring mandatory justification / remarks
STATUSES_REQUIRING_REASON = {
    "TRANSFERRED",
    "ESCALATED",
    "RESOLVED",
    "DISPOSED"
}

TERMINAL_STATUSES = {"RESOLVED", "DISPOSED"}

def get_configured_transitions(db: Optional[Session] = None) -> Dict[str, List[str]]:
    """Loads transitions from SystemConfig if present in database, otherwise returns defaults."""
    if db:
        try:
            cfg = db.query(SystemConfig).filter(SystemConfig.config_key == "WORKFLOW_STATUS_TRANSITIONS").first()
            if cfg and cfg.config_value:
                loaded = json.loads(cfg.config_value)
                if isinstance(loaded, dict):
                    return loaded
        except Exception:
            pass
    return DEFAULT_TRANSITIONS

def normalize_status(status: str) -> str:
    """Normalizes status string to uppercase with standard aliases."""
    s = (status or "").strip().upper()
    if s == "LODGED":
        return "RECEIVED"
    if s == "SCRUTINY_PENDING":
        return "UNDER_REVIEW"
    if s == "UNDER_INQUIRY":
        return "IN_PROGRESS"
    if s == "AWAITING_INFO":
        return "AWAITING_INFORMATION"
    return s

def validate_status_transition(
    current_status: str,
    target_status: str,
    user_role: str,
    reason: Optional[str] = None,
    resolution_summary: Optional[str] = None,
    db: Optional[Session] = None
) -> Tuple[bool, Optional[str]]:
    """
    Validates whether a status transition is permitted:
    1. Validates source and target existence.
    2. Validates against state machine transitions.
    3. Validates role permissions (e.g. Case Officers cannot execute terminal disposal).
    4. Enforces mandatory justification for transfers, escalations, closures, or re-openings.

    Returns:
        (is_valid: bool, error_message: Optional[str])
    """
    curr = current_status.strip().upper()
    target = target_status.strip().upper()
    role = (user_role or "").strip().upper()

    # 1. No-op transition check
    if curr == target:
        return True, None

    # 2. State machine lookup
    transitions = get_configured_transitions(db)
    allowed = transitions.get(curr, [])
    
    # Also check normalized equivalents if not found
    if not allowed:
        norm_curr = normalize_status(curr)
        allowed = transitions.get(norm_curr, [])

    # Target normalization comparison
    is_allowed = target in allowed or normalize_status(target) in [normalize_status(a) for a in allowed]

    if not is_allowed:
        permitted_str = ", ".join(allowed) if allowed else "None"
        return False, (
            f"Invalid status transition from '{curr}' to '{target}'. "
            f"Permitted next statuses are: [{permitted_str}]."
        )

    # 3. Role-based restrictions
    if role in ("AUDITOR", "READ_ONLY_AUDITOR"):
        return False, "Auditor accounts are read-only and cannot alter complaint status."

    if target in TERMINAL_STATUSES:
        if role not in ("SUPER_ADMIN", "BUREAU_ADMIN", "BUREAU_HEAD"):
            return False, (
                f"Permission denied: Final case closure ({target}) requires Bureau Administrator "
                f"or Super Administrator sign-off."
            )

    # 4. Mandatory reason / resolution checks
    notes_provided = (reason or "").strip()
    summary_provided = (resolution_summary or "").strip()

    if target in ("RESOLVED", "DISPOSED"):
        if not summary_provided and not notes_provided:
            return False, f"Formal resolution summary or disposal reason is strictly required to close case as '{target}'."

    elif target == "TRANSFERRED":
        if not notes_provided:
            return False, "Formal transfer justification is strictly required to transition case to 'TRANSFERRED'."

    elif target == "ESCALATED":
        if not notes_provided:
            return False, "Escalation rationale and justification are strictly required to escalate this case."

    # Re-opening a closed case
    if curr in TERMINAL_STATUSES and target not in TERMINAL_STATUSES:
        if role not in ("SUPER_ADMIN", "BUREAU_ADMIN", "BUREAU_HEAD"):
            return False, "Permission denied: Only Bureau Administrators or Super Admin can reopen a disposed case."
        if not notes_provided:
            return False, "Administrative justification note is required to reopen a disposed case."

    return True, None

def get_allowed_transitions_for_user(
    current_status: str,
    user_role: str,
    db: Optional[Session] = None
) -> List[Dict[str, Any]]:
    """
    Returns list of permitted next statuses for the current user and complaint status.
    Each item contains status, label, category, and requires_reason flag.
    """
    curr = current_status.strip().upper()
    role = (user_role or "").strip().upper()

    if role in ("AUDITOR", "READ_ONLY_AUDITOR"):
        return []

    transitions = get_configured_transitions(db)
    raw_allowed = transitions.get(curr, [])
    if not raw_allowed:
        raw_allowed = transitions.get(normalize_status(curr), [])

    result = []
    can_close = role in ("SUPER_ADMIN", "BUREAU_ADMIN", "BUREAU_HEAD")

    for target in raw_allowed:
        # Filter terminal states if user lacks closure permissions
        if target in TERMINAL_STATUSES and not can_close:
            continue

        meta = STATUS_METADATA.get(target, {
            "label": target.replace("_", " ").title(),
            "category": "GENERAL",
            "description": ""
        })

        requires_reason = (
            target in STATUSES_REQUIRING_REASON or
            (curr in TERMINAL_STATUSES and target not in TERMINAL_STATUSES)
        )

        result.append({
            "status": target,
            "label": meta["label"],
            "category": meta["category"],
            "description": meta["description"],
            "requires_reason": requires_reason,
            "requires_resolution_summary": target in ("RESOLVED", "DISPOSED")
        })

    return result

def get_all_status_definitions() -> List[Dict[str, Any]]:
    """Returns all supported statuses with category and metadata for UI pickers."""
    unique_statuses = [
        "RECEIVED",
        "UNDER_REVIEW",
        "IN_PROGRESS",
        "AWAITING_INFORMATION",
        "SHOW_CAUSE_ISSUED",
        "HEARING_SCHEDULED",
        "TRANSFERRED",
        "ESCALATED",
        "RESOLVED",
        "DISPOSED"
    ]
    return [
        {
            "status": s,
            "label": STATUS_METADATA[s]["label"],
            "category": STATUS_METADATA[s]["category"],
            "description": STATUS_METADATA[s]["description"]
        }
        for s in unique_statuses
    ]
