import time
import sys
from typing import Dict, Any, Tuple
from sqlalchemy import text
from backend.app.database import engine
from backend.app.core.logging import logger

def validate_database_connection(timeout_seconds: float = 3.0) -> Tuple[bool, Dict[str, Any]]:
    """
    Validates database connectivity by executing a raw test query.
    Returns (is_connected, diagnostic_metadata).
    Produces actionable diagnostic error messages if connection fails.
    """
    start = time.perf_counter()
    dialect_name = engine.dialect.name
    url_str = str(engine.url)

    # Obfuscate password in URL for safe logging
    safe_url = url_str
    if engine.url.password:
        safe_url = url_str.replace(str(engine.url.password), "********")

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        latency_ms = (time.perf_counter() - start) * 1000.0
        return True, {
            "status": "connected",
            "dialect": dialect_name,
            "url": safe_url,
            "latency_ms": round(latency_ms, 2)
        }
    except Exception as exc:
        latency_ms = (time.perf_counter() - start) * 1000.0
        error_msg = str(exc)

        # Actionable diagnostic suggestions
        suggestion = "Please check your database configuration in .env."
        if dialect_name == "postgresql":
            suggestion = (
                "PostgreSQL connection failed. "
                "Ensure local Docker container is running via 'docker compose up -d', "
                "or fallback to SQLite by setting DATABASE_URL=sqlite:///./samanvay.db in .env."
            )
        elif dialect_name == "sqlite":
            suggestion = "SQLite database path is unwriteable. Ensure backend directory has write permissions."

        actionable_diagnostic = {
            "status": "disconnected",
            "dialect": dialect_name,
            "url": safe_url,
            "latency_ms": round(latency_ms, 2),
            "error": error_msg,
            "actionable_suggestion": suggestion
        }
        logger.error(f"Database validation FAILED for {safe_url}: {error_msg}\nACTION REQUIRED: {suggestion}")
        return False, actionable_diagnostic

if __name__ == "__main__":
    is_ok, diag = validate_database_connection()
    if is_ok:
        print(f"DATABASE CHECK PASSED: Connected to {diag['dialect']} ({diag['latency_ms']}ms)")
        sys.exit(0)
    else:
        print(f"DATABASE CHECK FAILED: {diag['error']}")
        print(f"ACTION REQUIRED: {diag['actionable_suggestion']}")
        sys.exit(1)
