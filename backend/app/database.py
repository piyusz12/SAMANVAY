import time
import logging
from functools import wraps
from sqlalchemy import create_engine, event
from sqlalchemy.exc import OperationalError, DBAPIError
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.config import settings

logger = logging.getLogger("samanvay.database")

connect_args = {}
pool_kwargs = {
    "pool_pre_ping": True,  # Verifies connection liveness before checkout
    "echo": False
}

if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False, "timeout": 30.0}
else:
    # Production PostgreSQL connection pool settings (sized for multi-worker concurrency)
    pool_kwargs.update({
        "pool_size": 8,
        "max_overflow": 4,
        "pool_recycle": 1800,  # Recycle connections after 30 mins
        "pool_timeout": 30     # Max wait time for a connection
    })

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    **pool_kwargs
)

# High-performance pragmas for SQLite
if settings.DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")       # Write-Ahead Logging for concurrent reads & writes
        cursor.execute("PRAGMA synchronous=NORMAL")      # Faster writes while maintaining durability
        cursor.execute("PRAGMA cache_size=-64000")       # 64MB in-memory page cache
        cursor.execute("PRAGMA temp_store=MEMORY")       # Fast temporary table sorting in RAM
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def with_db_retry(max_retries: int = 3, base_delay: float = 0.05):
    """
    Decorator to automatically retry database operations on transient connection errors,
    temporary SQLite busy/locked exceptions, or dropped pool connections.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exc = None
            for attempt in range(1, max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except (OperationalError, DBAPIError) as exc:
                    last_exc = exc
                    msg = str(exc).lower()
                    # Check for transient database errors (locked, busy, dropped connection, timeout)
                    if any(err_term in msg for err_term in ("locked", "busy", "server closed", "connection refused", "timeout")):
                        delay = base_delay * (2 ** (attempt - 1))
                        logger.warning(f"Transient DB error on attempt {attempt}/{max_retries}: {exc}. Retrying in {delay:.3f}s...")
                        time.sleep(delay)
                    else:
                        raise
            logger.error(f"DB retry exhausted after {max_retries} attempts: {last_exc}")
            raise last_exc
        return wrapper
    return decorator

