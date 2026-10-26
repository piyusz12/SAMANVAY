# SAMANVAY (समन्वय) — AICTE Integrated Complaint Dashboard
### SIH Problem Statement 26264: Monitoring and Tracking Institution-Related Complaint Cases Across AICTE Bureaus/Cells

SAMANVAY is a production-grade, secure, integrated complaint coordination and tracking platform designed for the All India Council for Technical Education (AICTE). It dismantles inter-departmental silos across internal AICTE bureaus and cells (Regulation Bureau, PGRC, Approval Bureau, Legal Cell, Vigilance Cell, and Policy Bureau) by providing a single-window monitoring dashboard, automated cross-bureau conflict detection, 360-degree institutional dossiers, explainable AI deduplication, and an immutable regulatory audit trail.

---

## 1. Monorepo Repository Structure

```
c:\SAMANVAY\
├── backend\                   # FastAPI Application Core
│   ├── alembic\               # Database schema version migrations
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions\          # Version migration files (851cb2ae3d38_initial_schema.py)
│   ├── app\
│   │   ├── api\               # REST API Routers
│   │   │   ├── health.py      # Health & DB diagnostic probes
│   │   │   ├── auth.py        # JWT authentication & profile
│   │   │   ├── institutions.py# Institution registry & 360° dossier
│   │   │   ├── complaints.py  # Complaint lifecycle CRUD & uploads
│   │   │   ├── conflicts.py   # Master Cross-Bureau Conflict Radar
│   │   │   ├── similarity.py  # Explainable AI similarity & linkages
│   │   │   ├── movements.py   # Inter-bureau transfers & co-handling
│   │   │   ├── analytics.py   # Bureau KPIs & regional matrix
│   │   │   └── audit.py       # Regulatory audit ledger & notifications
│   │   ├── core\              # Infrastructure, Middleware & Error Handling
│   │   │   ├── logging.py     # Structured logging with request_id context
│   │   │   ├── middleware.py  # Request ID injection & latency measurement
│   │   │   ├── errors.py      # Centralized RFC 7807 error envelopes
│   │   │   └── db_check.py    # Database connection validator & diagnostics
│   │   ├── models\            # SQLAlchemy Relational Entities (7 tables)
│   │   ├── schemas\           # Pydantic v2 typed contracts & validation
│   │   ├── services\          # Domain services (Radar, NLP, Workflow, Audit)
│   │   ├── config.py          # Pydantic-Settings with actionable startup validation
│   │   ├── database.py        # Dual-dialect database engine & session maker
│   │   └── main.py            # FastAPI application lifespan & middleware assembly
│   ├── tests\                 # Comprehensive automated Pytest suite (19 tests)
│   ├── requirements.txt       # Pinned reproducible dependencies
│   ├── requirements-dev.txt   # Development and linting dependencies
│   ├── .env.example           # Documented backend environment example
│   └── alembic.ini            # Alembic migration configuration
├── frontend\                  # Vite + React Executive UI
│   ├── src\
│   │   ├── components\        # Modular interactive UI views
│   │   │   ├── ExecutiveOverview.jsx      # KPIs, bureau matrix, hotspot radar
│   │   │   ├── ConflictRadarView.jsx      # Live multi-bureau collision cards
│   │   │   ├── CasesRepositoryView.jsx    # Complaints table with SLA badges
│   │   │   ├── ComplaintDetailModal.jsx   # Case inspector, status transitions, uploads
│   │   │   ├── InstitutionDossierView.jsx # 360° dossier by AICTE Permanent ID
│   │   │   ├── AISimilarityView.jsx       # Explainable NLP matching & linkage
│   │   │   ├── TransfersView.jsx          # Inter-bureau transfer approval queue
│   │   │   ├── LodgeComplaintView.jsx     # Intake portal with pre-check duplicate radar
│   │   │   ├── AuditTrailView.jsx         # Immutable regulatory event ledger
│   │   │   └── HealthStatusModal.jsx      # Live system & DB diagnostics dialog
│   │   ├── services\          # Typed API client
│   │   ├── App.jsx            # Main app controller with persona switcher
│   │   └── index.css          # Bespoke executive design system (dark/light)
│   ├── package.json           # Frontend dependencies & npm scripts
│   ├── vite.config.js         # Vite dev server with /api proxy to port 8000
│   └── .env.example           # Documented frontend environment example
├── docs\                      # Complete Phase 01 System Specifications
│   ├── requirements.md        # Functional (FR-01 to FR-10) and Non-Functional specs
│   ├── architecture.md        # Topology, sequence flows, ER diagram, clean architecture
│   ├── user-flows.md          # 7 detailed user journeys with Mermaid flowcharts
│   ├── role-permission-matrix.md # 5 prototype roles, bureau scoping, CRUD matrix
│   ├── acceptance-criteria.md # Traceability matrix & Gherkin test scenarios
│   ├── api-contract-outline.md# OpenAPI contract outline & RFC 7807 error format
│   └── threat-model.md        # STRIDE security analysis & whistleblower privacy
├── infrastructure\            # Container & Deployment Infrastructure
│   ├── docker-compose.yml     # Local PostgreSQL 16 + pgAdmin container services
│   └── init-db.sql            # PostgreSQL schema initialization script
├── docker-compose.yml         # Root Docker Compose shortcut
├── .env.example               # Root documented environment template
└── README.md                  # This setup and operational runbook
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
