"""
SAMANVAY — Supervised Background Worker & Scheduler Daemon
Handles periodic SLA monitoring, escalation triggers, and delivery retries with
graceful signal termination and durable heartbeat reporting.
"""

import os
import sys
import time
import json
import signal
from datetime import datetime, timezone

# Ensure project root is in python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.app.config import settings
from backend.app.database import SessionLocal
from backend.app.services.deadline_service import run_scheduled_deadline_checks, retry_failed_deliveries
from backend.app.core.logging import logger

_RUNNING = True


def handle_shutdown_signal(signum, frame):
    """Graceful shutdown handler for SIGTERM and SIGINT."""
    global _RUNNING
    sig_name = signal.Signals(signum).name
    logger.info(f"[Worker] Received shutdown signal {sig_name}. Initiating graceful worker drain...")
    _RUNNING = False


def write_heartbeat(status: str = "running", details: dict = None):
    """Emits worker heartbeat JSON for health and readiness telemetry."""
    heartbeat_path = settings.BACKGROUND_WORKER_HEARTBEAT_PATH
    os.makedirs(os.path.dirname(heartbeat_path), exist_ok=True)
    payload = {
        "status": status,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
        "pid": os.getpid(),
        "details": details or {}
    }
    temp_path = f"{heartbeat_path}.tmp"
    with open(temp_path, "w") as f:
        json.dump(payload, f)
    os.replace(temp_path, heartbeat_path)


def run_worker_loop():
    """Main worker event loop."""
    signal.signal(signal.SIGINT, handle_shutdown_signal)
    signal.signal(signal.SIGTERM, handle_shutdown_signal)

    interval_alerts = int(os.getenv("ALERT_SCHEDULER_INTERVAL_SECONDS", "300"))
    interval_retries = int(os.getenv("FAILED_DELIVERY_RETRY_INTERVAL_SECONDS", "600"))

    last_alert_run = 0.0
    last_retry_run = 0.0

    logger.info(
        f"[Worker] Starting SAMANVAY Background Worker Daemon (PID: {os.getpid()}). "
        f"Alert cadence: {interval_alerts}s | Retry cadence: {interval_retries}s"
    )
    write_heartbeat(status="running", details={"cadence_alerts_s": interval_alerts, "cadence_retries_s": interval_retries})

    while _RUNNING:
        now_ts = time.time()
        db = SessionLocal()

        try:
            # 1. Periodic deadline and escalation checks
            if now_ts - last_alert_run >= interval_alerts:
                logger.info("[Worker] Executing scheduled deadline checks and auto-escalations...")
                result = run_scheduled_deadline_checks(db)
                last_alert_run = now_ts
                logger.info(
                    f"[Worker] Deadline check completed: {result.alerts_created} alerts created, "
                    f"{result.escalations_triggered} escalations triggered."
                )

            # 2. Periodic failed notification delivery retries
            if now_ts - last_retry_run >= interval_retries:
                logger.info("[Worker] Executing failed notification retry cycle...")
                retried, succeeded, logs = retry_failed_deliveries(db)
                last_retry_run = now_ts
                logger.info(f"[Worker] Delivery retry completed: {retried} retried, {succeeded} delivered.")

            # Update heartbeat
            write_heartbeat(status="running", details={
                "last_alert_run_epoch": last_alert_run,
                "last_retry_run_epoch": last_retry_run
            })

        except Exception as exc:
            logger.error(f"[Worker] Exception in worker loop: {exc}", exc_info=True)
            write_heartbeat(status="error", details={"error": str(exc)})
        finally:
            db.close()

        # Sleep in short increments to respond quickly to shutdown signals
        for _ in range(10):
            if not _RUNNING:
                break
            time.sleep(1.0)

    logger.info("[Worker] Background worker daemon terminated gracefully.")
    write_heartbeat(status="stopped", details={"reason": "graceful_shutdown"})


def run_worker_once():
    """Executes a single maintenance/escalation cycle and records heartbeat."""
    db = SessionLocal()
    try:
        logger.info("[Worker] Executing single-run maintenance cycle (--once)...")
        result = run_scheduled_deadline_checks(db)
        retried, succeeded, _ = retry_failed_deliveries(db)
        write_heartbeat(status="running", details={
            "mode": "single_run",
            "alerts_created": result.alerts_created,
            "escalations_triggered": result.escalations_triggered,
            "deliveries_retried": retried,
            "deliveries_succeeded": succeeded
        })
        logger.info(
            f"[Worker] Single-run completed: {result.alerts_created} alerts, "
            f"{result.escalations_triggered} escalations, {retried} retried."
        )
    except Exception as exc:
        logger.error(f"[Worker] Single-run execution error: {exc}", exc_info=True)
        write_heartbeat(status="error", details={"error": str(exc)})
        raise
    finally:
        db.close()


if __name__ == "__main__":
    if "--once" in sys.argv:
        run_worker_once()
    else:
        run_worker_loop()
