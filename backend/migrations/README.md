# SAMANVAY Database Migrations

This directory corresponds to the database schema migration engine for the SAMANVAY application.
Alembic is used as the migration orchestrator, with version files managed in [`backend/alembic/versions/`](file:///c:/SAMANVAY/backend/alembic/versions).

### Running Migrations
```bash
# Upgrade to latest database schema version
python scripts/migrate.py --direction upgrade

# Downgrade by 1 revision
python scripts/migrate.py --direction downgrade --revision -1

# Generate new auto-detected migration revision
alembic -c backend/alembic.ini revision --autogenerate -m "description_of_change"
```
