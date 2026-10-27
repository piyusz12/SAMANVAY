#!/bin/sh
set -e

echo "[SAMANVAY Entrypoint] Initializing backend container in '${APP_ENV:-production}' mode..."

# 1. Wait for database readiness if PostgreSQL is configured
if [ -n "$DATABASE_URL" ] && echo "$DATABASE_URL" | grep -q "postgresql"; then
  echo "[SAMANVAY Entrypoint] Waiting for PostgreSQL database to be available..."
  python -c "
import sys, time
from backend.app.core.db_check import validate_database_connection
max_retries = 30
for i in range(1, max_retries + 1):
    ok, diag = validate_database_connection(timeout_seconds=2.0)
    if ok:
        print(f'[SAMANVAY Entrypoint] Database connection verified on attempt {i}.')
        sys.exit(0)
    print(f'[SAMANVAY Entrypoint] Attempt {i}/{max_retries}: DB not ready yet ({diag.get(\"error\", \"connecting\")}). Retrying in 2s...')
    time.sleep(2)
print('[SAMANVAY Entrypoint] Database wait timeout exceeded!', file=sys.stderr)
sys.exit(1)
"
fi

# Run an alternate command (e.g. background worker) when provided
if [ "$#" -gt 0 ]; then
  echo "[SAMANVAY Entrypoint] Executing custom container command: $*"
  exec "$@"
fi

# 2. Apply database migrations safely
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[SAMANVAY Entrypoint] Running database migrations..."
  python infrastructure/scripts/migrate.py upgrade
fi

# 3. Start production ASGI application server
WORKERS="${WEB_CONCURRENCY:-4}"
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8000}"

echo "[SAMANVAY Entrypoint] Launching Gunicorn with ${WORKERS} Uvicorn workers on ${HOST}:${PORT}..."
exec gunicorn backend.app.main:app \
  --workers "$WORKERS" \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind "${HOST}:${PORT}" \
  --timeout 120 \
  --keep-alive 5 \
  --access-logfile - \
  --error-logfile - \
  --forwarded-allow-ips "*"
