# SAMANVAY — Operational & Demonstration Scripts

Convenient top-level CLI utility scripts for the SAMANVAY PS 26264 platform.

| Script | Purpose | Usage Example |
| :--- | :--- | :--- |
| [`seed_demo_data.py`](file:///c:/SAMANVAY/scripts/seed_demo_data.py) | Seeds the complete deterministic SIH demonstration dataset | `python scripts/seed_demo_data.py --reset` |
| [`run_benchmarks.py`](file:///c:/SAMANVAY/scripts/run_benchmarks.py) | Executes reproducible performance latency benchmarks | `python scripts/run_benchmarks.py` |
| [`run_worker.py`](file:///c:/SAMANVAY/scripts/run_worker.py) | Starts background worker for SLA tracking and notifications | `python scripts/run_worker.py` |
| [`backup.py`](file:///c:/SAMANVAY/scripts/backup.py) | Generates atomic database backup with SHA-256 verification | `python scripts/backup.py` |
| [`restore.py`](file:///c:/SAMANVAY/scripts/restore.py) | Restores database from backup with integrity check | `python scripts/restore.py --backup-file <path>` |
| [`migrate.py`](file:///c:/SAMANVAY/scripts/migrate.py) | Executes Alembic schema migrations | `python scripts/migrate.py --direction upgrade` |
