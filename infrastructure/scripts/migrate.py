"""
SAMANVAY — Safe Database Migration & Rollback Utility
Provides programmatic, transactional migration execution, dry-run SQL generation,
and rollback verification for production operations.
"""

import os
import sys
import argparse
from alembic.config import Config
from alembic import command

# Add root directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.app.config import settings
from backend.app.core.db_check import validate_database_connection
from backend.app.core.logging import logger


def get_alembic_config() -> Config:
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    ini_path = os.path.join(root_dir, "backend", "alembic.ini")
    cfg = Config(ini_path)
    cfg.set_main_option("script_location", os.path.join(root_dir, "backend", "alembic"))
    cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL.replace("%", "%%"))
    return cfg


def run_migration(action: str, revision: str = "head", sql_mode: bool = False):
    """Executes safe Alembic migration action."""
    logger.info(f"[Migrate] Validating database connectivity prior to migration action '{action}'...")
    ok, diag = validate_database_connection()
    if not ok:
        logger.critical(f"[Migrate] Database connection failed: {diag.get('error')}")
        sys.exit(1)

    cfg = get_alembic_config()

    try:
        if action == "upgrade":
            if sql_mode:
                logger.info("[Migrate] Generating dry-run upgrade SQL (offline inspection mode)...")
                command.upgrade(cfg, revision, sql=True)
            else:
                logger.info(f"[Migrate] Applying database migrations to target revision '{revision}'...")
                command.upgrade(cfg, revision)
                logger.info("[Migrate] Database schema successfully upgraded to head.")
        elif action == "downgrade":
            target_rev = revision if revision != "head" else "-1"
            if sql_mode:
                logger.info(f"[Migrate] Generating dry-run rollback SQL to '{target_rev}'...")
                command.downgrade(cfg, target_rev, sql=True)
            else:
                logger.warning(f"[Migrate] CAUTION: Rolling back database schema to '{target_rev}'...")
                command.downgrade(cfg, target_rev)
                logger.info(f"[Migrate] Database schema rolled back to '{target_rev}'.")
        elif action == "current":
            logger.info("[Migrate] Inspecting current database revision:")
            command.current(cfg, verbose=True)
        elif action == "history":
            logger.info("[Migrate] Migration revision history:")
            command.history(cfg, verbose=False)
        else:
            logger.error(f"[Migrate] Unrecognized action: {action}")
            sys.exit(1)

    except Exception as exc:
        logger.critical(f"[Migrate] Migration action '{action}' failed: {exc}", exc_info=True)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="SAMANVAY Database Migration Management Tool")
    parser.add_argument("action", choices=["upgrade", "downgrade", "current", "history"], default="upgrade", nargs="?",
                        help="Action to execute: upgrade (default), downgrade, current, history")
    parser.add_argument("revision", nargs="?", default=None,
                        help="Target revision (positional, default: head for upgrade, -1 for downgrade)")
    parser.add_argument("--revision", dest="revision_opt", default=None,
                        help="Target revision option flag")
    parser.add_argument("--sql", action="store_true", help="Dry-run SQL output mode (does not modify database)")
    args = parser.parse_args()

    rev = args.revision or args.revision_opt
    if not rev:
        rev = "head" if args.action == "upgrade" else ("-1" if args.action == "downgrade" else "head")

    run_migration(action=args.action, revision=rev, sql_mode=args.sql)


if __name__ == "__main__":
    main()
