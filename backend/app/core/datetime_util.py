from datetime import datetime, timezone, timedelta
from typing import Optional

IST = timezone(timedelta(hours=5, minutes=30))

def utc_now() -> datetime:
    """Returns current UTC datetime without tzinfo for universal SQLite/PostgreSQL compatibility."""
    return datetime.now(timezone.utc).replace(tzinfo=None)

def utc_now_aware() -> datetime:
    """Returns current timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)

def to_ist(dt: Optional[datetime]) -> Optional[datetime]:
    """Converts a naive or aware UTC datetime to Indian Standard Time (IST, UTC+05:30)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        # Assume naive datetime is in UTC
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(IST)

def format_ist(dt: Optional[datetime], fmt: str = "%d %b %Y, %I:%M %p IST") -> str:
    """Formats a datetime in Indian Standard Time format for official notifications and emails."""
    if dt is None:
        return "N/A"
    ist_dt = to_ist(dt)
    return ist_dt.strftime(fmt)

