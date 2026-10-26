from datetime import datetime, timezone

def utc_now() -> datetime:
    """Returns current UTC datetime without tzinfo for universal SQLite/PostgreSQL compatibility."""
    return datetime.now(timezone.utc).replace(tzinfo=None)

def utc_now_aware() -> datetime:
    """Returns current timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)
