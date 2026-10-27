"""
Explicit development-only setup command for synthetic development administrator.
Strictly prohibited in production environments.
Usage (PowerShell): python backend/app/core/setup_dev_admin.py
"""
import sys
import os

# Ensure backend package is accessible
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))

from backend.app.config import settings
from backend.app.database import SessionLocal, Base, engine
from backend.app.models.user import User
from backend.app.models.bureau import Bureau
from backend.app.models.bureau_membership import BureauMembership
from backend.app.services.auth_service import get_password_hash
from backend.app.services.audit_service import log_audit_event
from backend.app.core.datetime_util import utc_now

DEV_ADMIN_EMAIL = "dev.admin@samanvay.aicte.gov.in"
DEV_ADMIN_PASSWORD = os.getenv("DEV_ADMIN_PASSWORD", "DevAdmin@AICTE2026!")

def create_development_admin(db) -> User:
    """
    Creates synthetic development administrator in development/testing mode.
    Raises RuntimeError if called in production.
    """
    if settings.APP_ENV not in ("development", "testing"):
        raise RuntimeError(
            f"CRITICAL SECURITY VIOLATION: Refusing execution in '{settings.APP_ENV}' mode. "
            "Development setup utilities are strictly prohibited in production environments."
        )

    existing_admin = db.query(User).filter(User.email == DEV_ADMIN_EMAIL).first()
    if existing_admin:
        return existing_admin

    central_bureau = db.query(Bureau).filter(Bureau.code == "CENTRAL_ADMIN").first()
    if not central_bureau:
        central_bureau = Bureau(
            code="CENTRAL_ADMIN",
            name="Central Administration & AICTE HQ",
            description="Apex Administrative Monitoring Cell",
            default_sla_days=15
        )
        db.add(central_bureau)
        db.flush()

    new_admin = User(
        email=DEV_ADMIN_EMAIL,
        hashed_password=get_password_hash(DEV_ADMIN_PASSWORD),
        full_name="Development System Administrator [DEV-ONLY]",
        role="SUPER_ADMIN",
        bureau="CENTRAL_ADMIN",
        designation="Local Development Supervisor",
        phone="+91 11 2958 0000",
        is_active=True,
        created_at=utc_now(),
        updated_at=utc_now()
    )
    db.add(new_admin)
    db.flush()

    membership = BureauMembership(
        user_id=new_admin.id,
        bureau_id=central_bureau.id,
        role_in_bureau="HEAD",
        is_primary=True,
        created_at=utc_now()
    )
    db.add(membership)

    log_audit_event(
        db=db,
        action_type="DEV_ADMIN_CREATED",
        description=f"Synthetic development administrator '{DEV_ADMIN_EMAIL}' provisioned via setup CLI.",
        actor_id=new_admin.id,
        actor_name=new_admin.full_name,
        actor_role="SUPER_ADMIN",
        actor_bureau="CENTRAL_ADMIN",
        commit=False
    )
    db.commit()
    db.refresh(new_admin)
    return new_admin

def setup_dev_admin() -> int:
    print("=" * 70)
    print("  SAMANVAY - Synthetic Development Administrator Setup")
    print("=" * 70)

    if settings.APP_ENV not in ("development", "testing"):
        print(f"\n[SECURITY VIOLATION] Refusing execution in '{settings.APP_ENV}' mode.")
        print("This setup utility is strictly restricted to development environments (APP_ENV=development).")
        print("Production systems must provision administrative accounts through secure institutional IAM.")
        return 1

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        admin = create_development_admin(db)
        print("\n[SUCCESS] Synthetic development administrator provisioned successfully:")
        print(f"  Email:    {admin.email}")
        print(f"  Password: {DEV_ADMIN_PASSWORD}")
        print(f"  Role:     {admin.role}")
        print(f"  Bureau:   {admin.bureau}")
        print("  Notice:   Strictly for local technical evaluation. Labelled [DEV-ONLY].")
        print("=" * 70)
        return 0
    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Failed to provision development administrator: {e}")
        return 1
    finally:
        db.close()

if __name__ == "__main__":
    sys.exit(setup_dev_admin())
