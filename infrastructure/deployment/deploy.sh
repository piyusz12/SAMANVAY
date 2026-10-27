#!/usr/bin/env bash
# ==============================================================================
# SAMANVAY — Production Container Deployment Script
# ==============================================================================
set -euo pipefail

echo "[Deploy] Initiating SAMANVAY containerized stack deployment..."
ENV_FILE="${1:-.env.production}"

if [ ! -f "$ENV_FILE" ]; then
    echo "[Deploy] Error: Environment file $ENV_FILE not found."
    exit 1
fi

echo "[Deploy] Pulling/building production containers with $ENV_FILE..."
docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" up -d --build --remove-orphans

echo "[Deploy] Running database schema migration..."
docker compose -f docker-compose.prod.yml exec -T backend python infrastructure/scripts/migrate.py --direction upgrade

echo "[Deploy] Verifying service health..."
sleep 5
curl -fsS http://localhost:8000/health/ready || (echo "[Deploy] Readiness check failed!" && exit 1)

echo "[Deploy] Deployment successfully completed and healthy."
