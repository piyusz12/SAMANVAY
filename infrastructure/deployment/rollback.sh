#!/usr/bin/env bash
# ==============================================================================
# SAMANVAY (SIH PS 26264) — Production Rollback Script
# ==============================================================================
set -euo pipefail

echo "[Rollback] Initiating safe rollback procedure..."
TARGET_REVISION="${1:-base}"

echo "[Rollback] Downgrading database schema to revision: $TARGET_REVISION..."
docker compose -f docker-compose.prod.yml exec -T backend python infrastructure/scripts/migrate.py --direction downgrade --revision "$TARGET_REVISION"

echo "[Rollback] Restarting application services..."
docker compose -f docker-compose.prod.yml restart backend worker

echo "[Rollback] Verifying liveness..."
sleep 3
curl -fsS http://localhost:8000/health/live || (echo "[Rollback] Health check failed!" && exit 1)

echo "[Rollback] Rollback completed successfully."
