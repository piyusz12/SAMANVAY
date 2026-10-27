"""
SAMANVAY — Notification Delivery & Retry Worker
Retries failed delivery attempts with exponential backoff and dead-letter handling.
"""

from backend.app.database import SessionLocal
from backend.app.services.deadline_service import retry_failed_deliveries
from backend.app.core.logging import logger


def process_delivery_retries() -> dict:
    """Executes a single cycle of retrying pending/failed notification deliveries."""
    db = SessionLocal()
    try:
        results = retry_failed_deliveries(db)
        return results
    except Exception as e:
        logger.error(f"[DeliveryWorker] Error retrying notification deliveries: {e}")
        return {"error": str(e)}
    finally:
        db.close()
