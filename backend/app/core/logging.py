import logging
import sys
import contextvars
from datetime import datetime, timezone

# ContextVar for async request-id correlation across logs
request_id_ctx_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")

class StructuredLogFormatter(logging.Formatter):
    """Custom log formatter that injects request_id and ISO8601 timestamps."""
    def format(self, record: logging.LogRecord) -> str:
        record.request_id = request_id_ctx_var.get()
        if not hasattr(record, "iso_timestamp"):
            record.iso_timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
        return super().format(record)

def setup_logging(debug: bool = False) -> logging.Logger:
    """Configures centralized structured logging for the application."""
    log_level = logging.DEBUG if debug else logging.INFO

    handler = logging.StreamHandler(sys.stdout)
    formatter = StructuredLogFormatter(
        fmt="[%(iso_timestamp)s] [%(levelname)s] [req:%(request_id)s] %(name)s: %(message)s"
    )
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Avoid duplicate handlers
    if not root_logger.handlers:
        root_logger.addHandler(handler)
    else:
        root_logger.handlers[0] = handler

    logger = logging.getLogger("samanvay")
    logger.setLevel(log_level)
    return logger

logger = setup_logging()
