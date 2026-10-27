"""
SAMANVAY (SIH PS 26264) — Base Background Worker Lifecycle & Supervision
Provides signal handling, heartbeat emission, and graceful draining for workers.
"""

import os
import time
import json
import signal
from datetime import datetime, timezone
from backend.app.config import settings
from backend.app.core.logging import logger

_RUNNING = True


def handle_shutdown(signum, frame):
    """Graceful worker termination on SIGTERM / SIGINT."""
    global _RUNNING
    sig_name = signal.Signals(signum).name
    logger.info(f"[WorkerLifecycle] Received {sig_name}. Draining current tasks before exit...")
    _RUNNING = False


def emit_heartbeat(status: str = "running", details: dict = None):
    """Writes atomic heartbeat JSON file for health probes."""
    heartbeat_path = settings.BACKGROUND_WORKER_HEARTBEAT_PATH
    os.makedirs(os.path.dirname(heartbeat_path), exist_ok=True)
    payload = {
        "status": status,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
        "pid": os.getpid(),
        "details": details or {}
    }
    tmp_path = f"{heartbeat_path}.tmp"
    with open(tmp_path, "w") as f:
        json.dump(payload, f)
    os.replace(tmp_path, heartbeat_path)


def is_running() -> bool:
    """Returns True if the worker is actively running."""
    return _RUNNING
