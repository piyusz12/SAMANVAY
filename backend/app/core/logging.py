import re
import logging
import sys
import contextvars
from datetime import datetime, timezone

# ContextVar for async request-id correlation across logs
request_id_ctx_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")

SENSITIVE_PATTERNS = [
    # JWT Bearer tokens
    (re.compile(r'Bearer\s+[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_.+/=]*', re.IGNORECASE), 'Bearer [SCRUBBED_JWT]'),
    # Passwords in JSON / query strings / key-values
    (re.compile(r'(["\']?password["\']?\s*[:=]\s*["\'])([^"\']+)(["\'])', re.IGNORECASE), r'\1[SCRUBBED_PASSWORD]\3'),
    # Secret keys
    (re.compile(r'(["\']?secret(?:_key)?["\']?\s*[:=]\s*["\'])([^"\']+)(["\'])', re.IGNORECASE), r'\1[SCRUBBED_SECRET]\3'),
    # Auth & CSRF cookies
    (re.compile(r'(access_token|csrf_token)=([A-Za-z0-9\-_.]+)', re.IGNORECASE), r'\1=[SCRUBBED_COOKIE]'),
    # Private SSH / RSA keys
    (re.compile(r'-----BEGIN [A-Z ]+ PRIVATE KEY-----.*?-----END [A-Z ]+ PRIVATE KEY-----', re.DOTALL), '[SCRUBBED_PRIVATE_KEY]')
]

def scrub_sensitive_text(text: str) -> str:
    """Sanitizes sensitive tokens, passwords, cookies, and keys from log strings."""
    if not isinstance(text, str):
        return text
    scrubbed = text
    for pattern, replacement in SENSITIVE_PATTERNS:
        scrubbed = pattern.sub(replacement, scrubbed)
    return scrubbed

# Backward-compatible alias
sanitize_log_message = scrub_sensitive_text

class SensitiveDataFilter(logging.Filter):
    """Logging filter that redacts credentials, secrets, and auth tokens from all log messages."""
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = scrub_sensitive_text(record.msg)
        if record.args:
            if isinstance(record.args, tuple):
                record.args = tuple(scrub_sensitive_text(str(a)) if isinstance(a, str) else a for a in record.args)
            elif isinstance(record.args, dict):
                record.args = {k: scrub_sensitive_text(str(v)) if isinstance(v, str) else v for k, v in record.args.items()}
        return True

import json

class JsonLogFormatter(logging.Formatter):
    """Production JSON log formatter for centralized ingestion (ELK, CloudWatch, Datadog)."""
    def format(self, record: logging.LogRecord) -> str:
        req_id = request_id_ctx_var.get()
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
        log_entry = {
            "timestamp": ts,
            "level": record.levelname,
            "request_id": req_id,
            "logger": record.name,
            "message": scrub_sensitive_text(record.getMessage()),
            "module": record.module,
            "line": record.lineno
        }
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)

class StructuredLogFormatter(logging.Formatter):
    """Custom human-readable log formatter that injects request_id and ISO8601 timestamps."""
    def format(self, record: logging.LogRecord) -> str:
        record.request_id = request_id_ctx_var.get()
        if not hasattr(record, "iso_timestamp"):
            record.iso_timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
        formatted = super().format(record)
        return scrub_sensitive_text(formatted)

def setup_logging(debug: bool = False) -> logging.Logger:
    """Configures centralized structured logging with sensitive credential scrubbing and JSON support."""
    import os
    level_name = os.getenv("LOG_LEVEL", "DEBUG" if debug else "INFO").upper()
    log_level = getattr(logging, level_name, logging.INFO)
    fmt = os.getenv("LOG_FORMAT", "standard").lower()

    handler = logging.StreamHandler(sys.stdout)
    if fmt == "json":
        formatter = JsonLogFormatter()
    else:
        formatter = StructuredLogFormatter(
            fmt="[%(iso_timestamp)s] [%(levelname)s] [req:%(request_id)s] %(name)s: %(message)s"
        )
    handler.setFormatter(formatter)
    handler.addFilter(SensitiveDataFilter())

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
