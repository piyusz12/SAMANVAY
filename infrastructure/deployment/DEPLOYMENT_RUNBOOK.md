# SAMANVAY — Production Deployment & Operations Runbook

**Integrated Complaint Monitoring & Cross-Bureau Tracking Dashboard for AICTE**  
**Classification:** Institutional Standard / Production Operations  
**Document Revision:** 1.0.0 (Phase 17 — Deployment and Operations)

---

## 1. System Overview & Deployment Topology

SAMANVAY is deployed as a multi-tier, defense-in-depth containerized topology engineered for high availability, zero cross-bureau data leakage, and rigorous institutional governance.

```
                  ┌─────────────────────────────────────────┐
                  │    Internet / AICTE Intranet Clients    │
                  └───────────────────┬─────────────────────┘
                                      │
                                HTTPS (443) / HTTP (80 Redirect)
                                      ▼
             ┌───────────────────────────────────────────────────┐
             │         Edge Reverse Proxy (samanvay-proxy)       │
             │         - Nginx 1.25 Alpine                       │
             │         - TLS 1.2 / TLS 1.3 Termination           │
             │         - Rate-Limiting & Anti-Brute-Force Zones  │
             │         - Strict CSP, HSTS & Security Headers     │
             └─────────────┬───────────────────────┬─────────────┘
                           │                       │
      / (SPA Web Client)   │                       │ /api/ & /ws/ (REST + WS)
                           ▼                       ▼
          ┌──────────────────────────┐   ┌──────────────────────────┐
          │  Frontend Web Container  │   │   Backend API Cluster    │
          │  (samanvay-frontend)     │   │   (samanvay-backend)     │
          │  - Multi-stage Vite SPA  │   │   - Gunicorn (4 Workers) │
          │  - Port 80 (Internal)    │   │   - FastAPI ASGI Engine  │
          │  - No direct host ports  │   │   - Port 8000 (Internal) │
          └──────────────────────────┘   └─────────────┬────────────┘
                                                       │
                                   ┌───────────────────┼───────────────────┐
                                   │ Private Subnet    │                   │
                                   ▼                   ▼                   ▼
                     ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
                     │ PostgreSQL 16    │    │ Supervised Worker│    │ Isolated Storage │
                     │ (samanvay-db)    │    │ (samanvay-worker)│    │ Volumes          │
                     │ - Port 5432      │    │ - SLA Scheduler  │    │ - evidence_data  │
                     │   INTERNAL ONLY  │    │ - Auto-Escalate  │    │ - worker_runtime │
                     │ - WAL Persistence│    │ - Heartbeat JSON │    │ - backups_data   │
                     └──────────────────┘    └──────────────────┘    └──────────────────┘
```

### Key Security & Isolation Guarantees:
1. **Zero Host Exposure of Data Stores:** The database (port 5432) and backend application server (port 8000) are never bound to public host network interfaces. Only the reverse proxy listens on ports 80 and 443.
2. **Unprivileged Container Execution:** Application containers run as dedicated non-root users (`appuser:10001`), mitigating container breakout risks.
3. **Protected Evidence Storage:** Grievance evidence files and uploaded documents are isolated on restricted, non-public Docker volumes with strict MIME-type and size validation (15 MB maximum).
4. **Cryptographic Validation:** Backups are protected by SHA-256 sidecar checksums and pre-restoration tampering guards.

---

## 2. Environment Configuration & Secret Management

### 2.1 Development vs. Production Configuration Matrix

| Setting | Development (`.env.development`) | Production (`.env.production`) | Enforcement Mechanism |
| :--- | :--- | :--- | :--- |
| `APP_ENV` | `development` | `production` | Strict runtime check |
| `DEBUG` | `true` | `false` | `validate_configuration()` raises fatal error if `true` in prod |
| `SEED_SYNTHETIC_DATA`| `true` | `false` | `validate_configuration()` raises fatal error if `true` in prod |
| `SECRET_KEY` | Dev dummy key allowed | Min. 32 chars high-entropy key | Startup validation blocks default/short keys |
| `DATABASE_URL` | SQLite / PostgreSQL | Managed PostgreSQL cluster | Startup validation blocks SQLite in production |
| `LOG_FORMAT` | `standard` (colorized) | `json` (structured) | Formats log records into JSON for centralized log forwarders |
| `API Docs (/docs)` | Enabled for API discovery | **Disabled** (returns 404) | Hides Swagger UI and OpenAPI schema from unauthorized users |
| `CORS_ORIGINS` | `localhost:5173, localhost:3000` | Strict institutional FQDNs | Prevents unauthorized cross-origin browser requests |

### 2.2 Generating Cryptographic Secrets
Generate a 256-bit cryptographically secure secret key using OpenSSL or Python:

```bash
# Using OpenSSL:
openssl rand -hex 32

# Using Python secrets module:
python -c "import secrets; print(secrets.token_hex(32))"
```

### 2.3 Secret Injection Patterns
- **Docker Compose (Standard):** Load secrets from a secured `.env` file owned by `root:root` with permissions `chmod 600 .env`.
- **Docker Swarm / Kubernetes:** Use Docker Secrets or Kubernetes `Secret` resources mounted into `/run/secrets/`.
- **Cloud Secret Managers:** Retrieve secrets via AWS Secrets Manager, HashiCorp Vault, or Azure Key Vault during container initialization.

---

## 3. Step-by-Step Production Deployment Procedure

### Step 1: Clone Repository & Verify Permissions
```bash
git clone https://github.com/piyusz12/SAMANVAY.git /opt/samanvay
cd /opt/samanvay
```

### Step 2: Configure Production Environment Variables
Copy the production template and populate your secure credentials:
```bash
cp .env.production.example .env
chmod 600 .env
nano .env
```
Ensure you provide:
- `POSTGRES_PASSWORD`: Strong password (24+ characters).
- `SECRET_KEY`: 64-character hex string generated above.
- `CORS_ORIGINS`: Your approved domain (e.g. `https://samanvay.aicte-india.org`).

### Step 3: Provision TLS Certificates
Place your trusted CA certificates (Let's Encrypt / DigiCert / National Informatics Centre) in `infrastructure/nginx/certs/`:
- `infrastructure/nginx/certs/samanvay.crt`: Full-chain certificate.
- `infrastructure/nginx/certs/samanvay.key`: Private key (chmod 600).

*For staging / local testing environments, generate self-signed certificates:*
```bash
# Linux/macOS:
bash infrastructure/nginx/generate_certs.sh

# Windows (PowerShell):
pwsh infrastructure/nginx/generate_certs.ps1
```

### Step 4: Launch Production Containers
```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

### Step 5: Verify Deployment Health
Verify that all containers are healthy and running:
```bash
docker compose -f docker-compose.prod.yml ps
```
Expected output:
- `samanvay-proxy` (healthy)
- `samanvay-frontend` (healthy)
- `samanvay-backend` (healthy)
- `samanvay-worker` (running)
- `samanvay-postgres-prod` (healthy)

Test the external TLS endpoint:
```bash
curl -k https://localhost/health/ready
```
Expected HTTP 200 JSON:
```json
{
  "status": "ready",
  "service": "SAMANVAY - AICTE Integrated Complaint Dashboard",
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": { "status": "ok", "latency_ms": 1.2 },
    "storage": { "status": "ok", "path": "/app/storage/evidence" },
    "schema": { "status": "ok" }
  }
}
```

---

## 4. Safe Database Migration & Rollback Procedures

SAMANVAY uses an automated, transactional migration manager built on Alembic with pre-flight connectivity verification.

### 4.1 Check Current Schema Revision
```bash
docker compose -f docker-compose.prod.yml exec backend python infrastructure/scripts/migrate.py current
```

### 4.2 Dry-Run SQL Preview (Zero Impact Inspection)
Inspect the generated DDL statements prior to executing changes on production:
```bash
docker compose -f docker-compose.prod.yml exec backend python infrastructure/scripts/migrate.py upgrade --sql
```

### 4.3 Execute Forward Migrations
```bash
docker compose -f docker-compose.prod.yml exec backend python infrastructure/scripts/migrate.py upgrade head
```

### 4.4 Rollback Migrations
To safely revert the most recent migration revision:
```bash
docker compose -f docker-compose.prod.yml exec backend python infrastructure/scripts/migrate.py downgrade -1
```

---

## 5. Database Backup & Disaster Recovery Procedures

SAMANVAY features an automated backup system generating atomic snapshots paired with SHA-256 cryptographic hashes for tamper prevention.

### 5.1 Execute Manual Backup
```bash
docker compose -f docker-compose.prod.yml exec backend python infrastructure/scripts/backup.py
```
This generates:
- `storage/backups/samanvay_backup_postgresql_<TIMESTAMP>.dump` (Custom-format archive)
- `storage/backups/samanvay_backup_postgresql_<TIMESTAMP>.json` (Cryptographic verification sidecar)

### 5.2 Automated Daily Backup Schedule (Cron)
On the Docker host machine, configure a daily cron job at 02:00 UTC:
```bash
crontab -e
# Add the following entry:
0 2 * * * docker compose -f /opt/samanvay/docker-compose.prod.yml exec -T backend python infrastructure/scripts/backup.py >> /var/log/samanvay_backup.log 2>&1
```

### 5.3 Disaster Recovery / Restore Procedure
To restore the database from a backup archive:
```bash
# Syntax: python infrastructure/scripts/restore.py <ARCHIVE_PATH>
docker compose -f docker-compose.prod.yml exec backend python infrastructure/scripts/restore.py /app/storage/backups/samanvay_backup_postgresql_20261027_120000.dump
```
**Safety Features:**
1. **Pre-restore Checksum Verification:** The utility calculates the archive's SHA-256 checksum and compares it against the JSON metadata sidecar. If modified or corrupted, restoration is instantly aborted.
2. **Post-restore Connectivity Probe:** Executes an active query verification to ensure transactional consistency before releasing control.

---

## 6. Observability, Healthchecks & Operational Metrics

### 6.1 Telemetry Endpoints

| Endpoint | Probe Type | Purpose | Frequency | Expected Response |
| :--- | :--- | :--- | :--- | :--- |
| `GET /health/live` | Liveness | Checks container process viability | Every 15s | `{"status": "alive"}` (200 OK) |
| `GET /health/ready` | Readiness | Verifies DB connectivity, storage writeability, schema | Every 15s | `{"status": "ready", ...}` (200 OK) |
| `GET /health` | Diagnostic | Deep diagnostic status for operators | On demand | `{"status": "healthy", ...}` (200 OK) |
| `GET /health/metrics` | Observability | Exports active complaint volumes, uptime, worker heartbeat | Every 30s | `{"uptime_seconds": ..., "metrics": {...}}` |

### 6.2 Structured Logging & Log Forwarding
In production (`LOG_FORMAT=json`), all log messages are formatted into single-line JSON records containing:
- `timestamp`: UTC ISO8601 timestamp with microsecond resolution.
- `level`: Log level (`INFO`, `WARNING`, `ERROR`, `CRITICAL`).
- `request_id`: Tracing correlation identifier across async handlers.
- `logger`: Subsystem logger name (e.g. `samanvay.auth`, `samanvay.scheduler`).
- `message`: Scrubbed log message.

**Automated Redaction:** Passwords, JWT Bearer tokens, CSRF tokens, secret keys, and private certificates are automatically sanitized before emission.

---

## 7. Background Worker & Scheduler Supervision

The background daemon (`infrastructure/scripts/worker.py`) executes:
- Periodic SLA deadline audits (reminder notifications at 7, 3, and 1 days before breach).
- Automated hierarchical escalations (Level 1, Level 2, Level 3 based on days overdue).
- Delivery retries for transient notification failures.

### 7.1 Supervision & Liveness
- The worker emits a heartbeat JSON file (`/app/runtime/worker.heartbeat`) after each cycle.
- The `/health/metrics` endpoint monitors this heartbeat and alerts if the worker has stopped reporting or is stale.
- The worker traps `SIGTERM` and `SIGINT` to safely drain ongoing transactions before container termination.

### 7.2 On-Demand Execution (Single-Run Mode)
For testing, maintenance, or external cron-based runners:
```bash
docker compose -f docker-compose.prod.yml exec backend python infrastructure/scripts/worker.py --once
```

---

## 8. Dependency & Security Scanning

To maintain ongoing supply-chain integrity:

### 8.1 Python Backend Vulnerability Scan
```bash
pip install pip-audit
pip-audit -r backend/requirements.txt
```

### 8.2 Frontend Dependency Vulnerability Scan
```bash
npm --prefix frontend audit
```
*(Verified: 0 vulnerabilities found).*

### 8.3 Container Image Vulnerability Scan (Trivy)
```bash
# Scan backend container image:
trivy image samanvay-backend:latest --severity HIGH,CRITICAL

# Scan proxy container image:
trivy image nginx:1.25-alpine --severity HIGH,CRITICAL
```

---

## 9. Operational Troubleshooting Playbooks

### Playbook 1: Backend Returns HTTP 503 (Database Connection Failure)
1. Check PostgreSQL container health:
   ```bash
   docker compose -f docker-compose.prod.yml ps postgres
   docker compose -f docker-compose.prod.yml logs --tail=50 postgres
   ```
2. Validate PostgreSQL connection from backend container:
   ```bash
   docker compose -f docker-compose.prod.yml exec backend python backend/app/core/db_check.py
   ```
3. If PostgreSQL ran out of connections:
   - Check active connections: `SELECT count(*) FROM pg_stat_activity;`
   - Adjust `max_connections` in `infrastructure/init-db.sql`.

### Playbook 2: Background Worker Stalled / Heartbeat Timeout
1. Check worker logs for unhandled exceptions:
   ```bash
   docker compose -f docker-compose.prod.yml logs --tail=100 worker
   ```
2. Check last recorded heartbeat:
   ```bash
   docker compose -f docker-compose.prod.yml exec worker cat /app/runtime/worker.heartbeat
   ```
3. Restart worker container:
   ```bash
   docker compose -f docker-compose.prod.yml restart worker
   ```

### Playbook 3: Rate Limiting Rejection (HTTP 429 Too Many Requests)
1. Check Nginx access logs for rate-limiting triggers:
   ```bash
   docker compose -f docker-compose.prod.yml logs --tail=100 proxy | grep 429
   ```
2. If genuine institutional traffic is being throttled, adjust the rate zones in `infrastructure/nginx/nginx.conf`:
   - Increase `api_rate_limit` zone rate (e.g. `rate=60r/s`) or burst capacity.
   - Reload Nginx: `docker compose -f docker-compose.prod.yml exec proxy nginx -s reload`

### Playbook 4: Emergency Evidence Storage Recovery
1. Check volume disk usage:
   ```bash
   docker system df -v
   ```
2. Clear temporary quarantine or aged log files:
   ```bash
   find storage/quarantine -type f -mtime +14 -delete
   ```
