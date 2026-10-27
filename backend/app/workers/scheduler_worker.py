"""
SAMANVAY (SIH PS 26264) — SLA Deadline & Escalation Background Worker
Executes periodic Citizen's Charter 30-day checks and automated escalation sweeps.
"""

from backend.app.database import SessionLocal
from backend.app.services.deadline_service import run_scheduled_deadline_checks
from backend.app.core.logging import logger


def process_deadline_checks(simulated_time=None) -> dict:
    """Executes a single cycle of deadline evaluations and escalations."""
    db = SessionLocal()
    try:
        results = run_scheduled_deadline_checks(db, simulated_time=simulated_time)
        return results
    except Exception as e:
        logger.error(f"[SchedulerWorker] Error during scheduled deadline check: {e}")
        return {"error": str(e)}
    finally:
        db.close()
