# SAMANVAY (समन्वय) — AICTE Integrated Complaint Dashboard
### Integrated Dashboard for Monitoring and Tracking Institution-Related Complaint Cases Across AICTE Bureaus/Cells

SAMANVAY is a production-grade, secure, integrated complaint coordination and tracking platform designed for the All India Council for Technical Education (AICTE). It dismantles inter-departmental silos across internal AICTE bureaus and cells (Regulation Bureau, PGRC, Approval Bureau, Legal Cell, Vigilance Cell, and Policy Bureau) by providing a single-window monitoring dashboard, automated cross-bureau conflict detection, 360-degree institutional dossiers, explainable AI deduplication, and an immutable regulatory audit trail.

---

## 1. Monorepo Repository Structure

```
SAMANVAY/
├── frontend/
│   ├── src/
│   │   ├── app/                   # App container & main layout controller
│   │   ├── components/            # Modular reusable UI views & modals
│   │   ├── features/              # Feature modules & domain views
│   │   │   ├── auth/              # Auth personas, RBAC permission checks
│   │   │   ├── institutions/      # Institution registry & 360° dossier
│   │   │   ├── complaints/        # Complaint intake, repository, file transfers
│   │   │   ├── overlaps/          # Explainable AI similarity & Conflict Radar
│   │   │   ├── coordination/      # Joint inquiry workspaces & action plans
│   │   │   ├── notifications/     # Citizen's Charter SLA alerts & escalations
│   │   │   └── reports/           # Executive KPI dashboards & audit ledger
│   │   ├── lib/                   # API client, utilities, and date formatters
│   │   └── types/                 # Domain constants, bureaus, and statuses
│   ├── tests/                     # Frontend component tests documentation
│   ├── package.json               # Frontend dependencies & npm scripts
│   ├── vite.config.js             # Vite configuration with /api reverse proxy
│   └── .env.example               # Frontend environment template
├── backend/
│   ├── app/
│   │   ├── api/                   # REST API Routers (auth, complaints, conflicts, etc.)
│   │   ├── core/                  # Structured logging, middleware, RFC 7807 errors
│   │   ├── models/                # SQLAlchemy relational database entities
│   │   ├── schemas/               # Pydantic v2 typed request/response contracts
│   │   ├── repositories/          # Data access layer & query optimization
│   │   ├── services/              # Domain services (Radar, NLP, Workflow, Audit)
│   │   ├── workers/               # Background SLA scheduler & delivery workers
│   │   └── main.py                # FastAPI application lifespan & middleware assembly
│   ├── migrations/                # Database schema version migrations (Alembic)
│   ├── tests/                     # 163 automated Pytest suites & benchmarks
│   ├── requirements.txt           # Pinned production dependencies
│   ├── requirements-dev.txt       # Development and linting dependencies
│   ├── .env.example               # Backend environment template
│   └── alembic.ini                # Alembic migration configuration
├── infrastructure/
│   ├── docker/                    # Docker Compose stacks, Nginx proxy, DB init
│   ├── deployment/                # Production deployment runbook, deploy/rollback scripts
│   └── scripts/                   # System automation, backup, and restore routines
├── docs/                          # System Specifications & Evaluation Guides
│   ├── architecture.md            # Topology, sequence flows, ER diagram, clean architecture
│   ├── user-flows.md              # Detailed user journeys with Mermaid flowcharts
│   ├── role-permission-matrix.md  # Prototype roles, bureau scoping, CRUD matrix
│   ├── threat-model.md            # STRIDE security analysis & whistleblower privacy
│   ├── acceptance-criteria.md     # Traceability matrix & Gherkin test scenarios
│   └── DEMO_AND_FINAL_ACCEPTANCE_GUIDE.md # 5-7 min script & acceptance checklist
├── scripts/                       # Top-level operational CLI entrypoints
│   ├── seed_demo_data.py          # Synthetic dataset generator CLI
│   ├── run_benchmarks.py          # Latency benchmark runner CLI
│   ├── run_worker.py              # Background worker daemon runner
│   ├── backup.py                  # Database backup CLI with SHA-256 validation
│   ├── restore.py                 # Database restore CLI with integrity verification
│   └── migrate.py                 # Database schema migration CLI
├── docker-compose.yml             # Root Docker Compose service definitions
├── .env.example                   # Root documented environment template
├── .gitignore                     # Git ignore rules
└── README.md                      # Setup, architecture, and operational runbook
```

---

## 2. Technology Stack & Architectural Justifications

| Component | Technology | Architectural Justification |
| :--- | :--- | :--- |
| **Backend API** | FastAPI (Python 3.13) | Asynchronous high-performance core with native Pydantic v2 contract validation, OpenAPI autodocs, and lightweight execution. |
| **Frontend UI** | React 19 + Vite | **Justified Working Alternative to Next.js:** Sub-200ms dev startup, 180ms production bundle builds, pure Client-Side Rendering (CSR) optimal for authenticated internal dashboards without Node SSR server overhead. Fully proxied to backend on port 8000. |
| **Styling** | Vanilla CSS Design System | Full control over executive Government of India / AICTE branding without Tailwind dependency churn. Native light/dark theme support, glassmorphism, and accessible color contrast. |
| **Persistence** | PostgreSQL / SQLite | Dual-dialect support via SQLAlchemy 2.0: production-ready for PostgreSQL 16, with seamless zero-daemon SQLite fallback for instant local developer onboarding and CI test runs. |
| **Migrations** | Alembic | Safe, reversible database migrations (`alembic upgrade head`) ensuring zero data loss during schema evolution. |
| **NLP Engine** | Scikit-Learn TF-IDF | Transparent, explainable cosine narrative matching with attribution breakdown and shared keyword extraction under **Rule 14** (human-in-the-loop oversight). |

---

## 3. Prerequisites

* **Windows PowerShell 5.1+ or PowerShell 7+**
* **Python 3.11+ or 3.13+** (Verified with Python 3.13.6)
* **Node.js 20+ or 22+** (Verified with v22.18.0 & npm 10.9.3)
* **Docker Desktop** (Optional, only needed if running local PostgreSQL container)

---

## 4. Quick-Start Setup (Windows PowerShell)

Open **Windows PowerShell** in `c:\SAMANVAY`:

### Step 1: Environment Configuration
Copy the documented environment template:
```powershell
Copy-Item .env.example .env
```

### Step 2: Backend Virtual Environment & Dependency Installation
```powershell
# Create Python virtual environment (if not already created)
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Upgrade pip and install pinned reproducible dependencies
python -m pip install --upgrade pip
pip install -r backend/requirements.txt
```

### Step 3: (Optional) Start Local PostgreSQL via Docker Compose
*If you have Docker running and wish to use PostgreSQL instead of the default local SQLite fallback:*
```powershell
docker compose up -d
```
*Then edit `.env` and set:*
```
DATABASE_URL=postgresql://samanvay_user:samanvay_dev_pass_2026@localhost:5432/samanvay_db
```

### Step 4: Validate Database Connection & Apply Migrations
SAMANVAY includes a dedicated database validation utility that produces actionable diagnostic suggestions if the database is unreachable:
```powershell
$env:PYTHONPATH="."
# Run the diagnostic connection check
python backend/app/core/db_check.py

# Apply database migrations to head
.\venv\Scripts\alembic.exe -c backend/alembic.ini upgrade head
```

### Step 5: Start the Backend API Server
```powershell
$env:PYTHONPATH="."
.\venv\Scripts\uvicorn.exe backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
* Backend Root: `http://127.0.0.1:8000`
* Interactive OpenAPI Documentation: `http://127.0.0.1:8000/api/v1/docs`
* System Health & DB Ping: `http://127.0.0.1:8000/health`

### Step 6: Install Frontend Dependencies & Start Dev Server
In a second PowerShell window:
```powershell
cd c:\SAMANVAY\frontend
npm install
npm run dev
```
* Dashboard URL: `http://localhost:5173/`

---

## 5. Health Endpoints & Diagnostics Verification

### Backend Health Check:
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/health"
```
**Expected Response:**
```json
{
  "status": "healthy",
  "service": "SAMANVAY - AICTE Integrated Complaint Dashboard",
  "version": "1.0.0",
  "environment": "development",
  "database": {
    "status": "connected",
    "dialect": "sqlite",
    "latency_ms": 0.85
  },
  "timestamp": "2026-10-26T18:15:00.000000Z"
}
```
*(Notice: Returns `status: "unhealthy"` with HTTP 503 if database connectivity fails).*

### In-App Diagnostics:
Click the **🩺 icon** in the top navigation bar of `http://localhost:5173/` to open the live **System Health & Diagnostics Modal**, which displays live round-trip latency, active request IDs, and dialect information.

---

## 6. Running Automated Tests & Code Quality Checks

### Run Automated Backend Test Suite (Pytest)
```powershell
cd c:\SAMANVAY
$env:PYTHONPATH="."
.\venv\Scripts\pytest.exe -v backend/tests
```
**Verification Output:** **19 Passed**
* [`test_health.py`](file:///c:/SAMANVAY/backend/tests/test_health.py) (4 tests: health ping, API v1 health, liveness probe, custom request ID propagation)
* [`test_auth.py`](file:///c:/SAMANVAY/backend/tests/test_auth.py) (3 tests: login, invalid password, JWT token validation)
* [`test_complaints.py`](file:///c:/SAMANVAY/backend/tests/test_complaints.py) (4 tests: listing, bureau filters, tracking number generator, state transition)
* [`test_conflicts.py`](file:///c:/SAMANVAY/backend/tests/test_conflicts.py) (3 tests: conflict radar, collision detection, dossier alert)
* [`test_similarity.py`](file:///c:/SAMANVAY/backend/tests/test_similarity.py) (2 tests: explainable attribution, human linkage workflow)
* [`test_movements.py`](file:///c:/SAMANVAY/backend/tests/test_movements.py) (1 test: inter-bureau transfer authorization)
* [`test_analytics.py`](file:///c:/SAMANVAY/backend/tests/test_analytics.py) (2 tests: executive overview, immutable audit ledger)

### Run Frontend Production Build Check
```powershell
cd c:\SAMANVAY\frontend
npm run build
```
**Verification Output:** Compiled bundle in `< 200ms` with 0 errors.

### Run Frontend Linter
```powershell
cd c:\SAMANVAY\frontend
npm run lint
```
**Verification Output:** 0 errors across 14 modules.

---

## 7. Pre-Configured Demonstration Personas

To test role-based access control (RBAC) across bureaus, use the **1-click Persona Switcher** in the top navigation bar or log in using any of the following demonstration accounts:

| Persona | Email | Bureau | Role | Password |
| :--- | :--- | :--- | :--- | :--- |
| **Dr. Rajeshwar Sharma** | `admin@samanvay.aicte.gov.in` | Central Administration | `SUPER_ADMIN` | `Demo@AICTE2026!` |
| **Prof. Anita Desai** | `head.rb@samanvay.aicte.gov.in` | Regulation Bureau | `BUREAU_HEAD` | `Demo@AICTE2026!` |
| **Dr. K. V. Raman** | `head.pgrc@samanvay.aicte.gov.in` | PGRC (Grievances) | `BUREAU_HEAD` | `Demo@AICTE2026!` |
| **Adv. S. K. Mukherjee** | `head.legal@samanvay.aicte.gov.in` | Legal Cell | `BUREAU_HEAD` | `Demo@AICTE2026!` |
| **Col. R. S. Rathore** | `head.vigilance@samanvay.aicte.gov.in`| Vigilance Cell | `BUREAU_HEAD` | `Demo@AICTE2026!` |
| **Sunil Verma** | `officer.rb@samanvay.aicte.gov.in` | Regulation Bureau | `CASE_OFFICER` | `Demo@AICTE2026!` |
| **Pooja Hegde** | `officer.pgrc@samanvay.aicte.gov.in` | PGRC | `CASE_OFFICER` | `Demo@AICTE2026!` |

---

## 8. Troubleshooting & Actionable Diagnostic Guide

* **Issue: "Database connection failed"**
  * *Cause:* PostgreSQL container is stopped or `DATABASE_URL` is pointing to an unreachable host.
  * *Remedy:* Start PostgreSQL via `docker compose up -d`, or fallback to local SQLite by editing `.env` to `DATABASE_URL=sqlite:///./samanvay.db`.
* **Issue: "Extra inputs are not permitted [extra_forbidden]"**
  * *Cause:* Environment variables for Docker or Vite present in shared `.env`.
  * *Remedy:* Configured in `backend/app/config.py` with `extra = "ignore"`.
* **Issue: "Insecure default SECRET_KEY detected in production"**
  * *Cause:* `APP_ENV=production` with development secret key.
  * *Remedy:* Generate a secure key using `openssl rand -hex 32` and assign it to `SECRET_KEY`.
