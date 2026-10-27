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

class StructuredLogFormatter(logging.Formatter):
    """Custom log formatter that injects request_id and ISO8601 timestamps."""
    def format(self, record: logging.LogRecord) -> str:
        record.request_id = request_id_ctx_var.get()
        if not hasattr(record, "iso_timestamp"):
            record.iso_timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
        formatted = super().format(record)
        return scrub_sensitive_text(formatted)

def setup_logging(debug: bool = False) -> logging.Logger:
    """Configures centralized structured logging with sensitive credential scrubbing."""
    log_level = logging.DEBUG if debug else logging.INFO

    handler = logging.StreamHandler(sys.stdout)
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
