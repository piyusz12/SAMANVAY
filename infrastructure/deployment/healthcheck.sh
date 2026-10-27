#!/usr/bin/env bash
# ==============================================================================
# SAMANVAY (SIH PS 26264) — Deployment Health & Readiness Validator
# ==============================================================================
set -euo pipefail

HOST="${1:-http://localhost:8000}"

echo "[HealthCheck] Probing SAMANVAY health endpoints at $HOST..."

echo "1. Liveness Probe:"
curl -s -w "\nHTTP Status: %{http_code}\n" "$HOST/health/live"

echo -e "\n2. Readiness Probe (DB & Storage):"
curl -s -w "\nHTTP Status: %{http_code}\n" "$HOST/health/ready"

echo -e "\n3. Startup & Config Security Probe:"
curl -s -w "\nHTTP Status: %{http_code}\n" "$HOST/health/startup"

echo -e "\n[HealthCheck] Verification completed."
