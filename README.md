# 📰 NewsFlux

**NewsFlux** is a fully implemented Multi-Tenant B2B SaaS platform for the newspaper distribution industry. It provides isolated environments for distribution agencies, strict role-based access control, automated daily billing logic, offline-first worker capabilities, and a platform-level super admin console.

---

## 🚀 What It Does

Newspaper distribution runs on pen-and-paper math — leading to wasted stock, missed deliveries, and bad debt. NewsFlux automates the entire workflow:

1. **Daily Sales:** `Sold = Taken - Returned` — calculated server-side to prevent manipulation.
2. **Daily Revenue:** `Income = Sold × Price` — computed in real-time dashboards.
3. **Monthly Billing:** `TotalBill = Σ (Price × Quantity × ActiveDays) + DeliveryFee` — automated invoice generation via Celery background jobs.
4. **Offline Delivery:** Workers in areas without connectivity use the PWA offline and batch-sync when reconnected.

---

## 🏢 Platform Ecosystem

A single React SPA with role-based routing after login:

| Role | Interface | Key Features |
|------|-----------|-------------|
| **👑 Super Admin** | Dark-mode glassmorphism dashboard | Agency CRUD, Analytics (KPIs, growth, churn), Audit Logs, System Health/APM, God Mode (impersonation), Templates, Announcements, Billing Plans |
| **🏢 Admin** | Dense data-entry ledger UI | Newspapers, Workers, Customers, Stock Entry, Subscriptions, Assignments, Billing/Invoices, Google Drive Backup, Dashboard with charts |
| **👷 Worker** | Mobile-first offline PWA | View assignments, enter Taken/Returned with stepper inputs, toggle delivery status, IndexedDB + background sync |

---

## 🏗️ Tech Stack

### Backend
- **Framework:** Python 3.11+ / FastAPI
- **Database:** SQLite (local dev) / PostgreSQL (production) — Shared-Schema Multi-Tenancy
- **ORM:** SQLAlchemy 2.0 with Pydantic v2 schemas
- **Auth:** JWT (python-jose) with role claims (`sub`, `role`, `tenant_id`)
- **Background Jobs:** Celery + Redis (billing cron, Google Drive backups)
- **Backup:** Google Drive API with OAuth2 per-agency + openpyxl Excel exports

### Frontend
- **Framework:** React 19 + Vite 7
- **Styling:** Tailwind CSS 4
- **Charts:** Recharts
- **Routing:** React Router 7
- **i18n:** react-i18next (English + Tamil)
- **Offline:** Dexie.js (IndexedDB) + custom sync queue
- **Icons:** Lucide React

---

## 📁 Repository Structure

```
newspaper-boy/
├── README.md
├── docker-compose.yml
├── docs/
│   ├── architecture.md              # DB schema & API structure
│   ├── core_modules.md              # Business modules & page flow
│   ├── system_flow.md               # Daily/monthly operational flow
│   ├── roles_and_permissions.md     # RBAC definition
│   ├── diagrams.md                  # Mermaid architecture diagrams
│   ├── deployment_strategy.md       # Docker/PaaS/K8s options
│   ├── own_server.md                # TrueNAS bare-metal guide
│   ├── super admin frontend .md     # Antigravity UI spec
│   ├── superadmin_addons.md         # Phase 2 super admin features
│   ├── gdrive_backup.md             # Google Drive backup plan
│   └── missing_features.md          # Gap analysis & roadmap
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app + lifespan
│   │   ├── api/v1/                  # auth, admin, worker, superadmin routers
│   │   ├── core/                    # config, security, middleware, celery
│   │   ├── models/models.py         # 12 SQLAlchemy models
│   │   ├── schemas/                 # Pydantic request/response schemas
│   │   ├── services/                # excel_export, gdrive_service, backup_scheduler, billing_job
│   │   └── db/base_class.py         # SQLAlchemy Base
│   ├── alembic/                     # Database migrations
│   └── requirements.txt             # 18 Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx                  # Route definitions (admin/worker/superadmin)
│   │   ├── pages/admin/             # Dashboard, Stock, Newspapers, Workers, Customers, Subscriptions, Assignments, Billing, Backup
│   │   ├── pages/worker/            # Dashboard (offline-first PWA)
│   │   ├── pages/superadmin/        # Dashboard, Agencies, Analytics, Announcements, AuditLogs, SystemHealth, Settings
│   │   ├── components/              # AdminLayout, Sidebar, SuperAdminLayout, ImpersonationBanner, AnnouncementBanner
│   │   ├── contexts/AuthContext.jsx # JWT auth + role routing
│   │   ├── hooks/useSyncQueue.js    # Offline sync logic
│   │   ├── locales/                 # en.json, ta.json
│   │   └── utils/                   # api.js (axios), db.js (Dexie)
│   └── package.json                 # 17 npm dependencies
```

---

## 🚦 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+ (LTS)
- Redis (for Celery — optional for dev)

### Backend Setup
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate     # Windows
# source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The frontend dev server proxies `/api` requests to `http://localhost:8000`.

### Default Super Admin
Create one manually:
```bash
cd backend
python create_admin.py
```

### Docker (Production)
```bash
docker-compose up -d
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | Database schema, API structure, component layout |
| [Core Modules](docs/core_modules.md) | Business logic modules & page flow |
| [System Flow](docs/system_flow.md) | Daily & monthly operational workflow |
| [Roles & Permissions](docs/roles_and_permissions.md) | RBAC rules for all 3 roles |
| [Diagrams](docs/diagrams.md) | Mermaid architecture & flow diagrams |
| [Deployment Strategy](docs/deployment_strategy.md) | Docker, PaaS, Hybrid, K8s analysis |
| [TrueNAS Guide](docs/own_server.md) | Bare-metal self-hosting on TrueNAS |
| [Super Admin UI Spec](docs/super%20admin%20frontend%20.md) | Antigravity glassmorphism design rules |
| [Super Admin Add-ons](docs/superadmin_addons.md) | Phase 2 enterprise features |
| [Google Drive Backup](docs/gdrive_backup.md) | Per-agency Excel export to Google Drive |
| [Gap Analysis](docs/missing_features.md) | Feature audit & remaining roadmap |

---

## ⚡ Key Architecture

1. **Tenant Middleware:** Every request decodes the JWT, extracts `tenant_id`, and injects it into `request.state` — all queries are automatically scoped.
2. **Offline Sync:** Workers submit batched operations from IndexedDB via `POST /worker/offline-sync` when connectivity resumes.
3. **Celery Beat:** Automated monthly billing (`billing_job`) and Google Drive backups (`backup_scheduler` — daily/monthly/yearly).
4. **Impersonation:** Super admin generates short-lived admin JWTs to debug agencies, all actions are audit-logged.
5. **APM Metrics:** Middleware collects per-request latency and status codes; super admin views P50/P95/P99 in System Health page.

---

## 🚀 Non-Functional Requirements (NFRs) Met
- ✅ Highly Scalable Architecture
- ✅ Secure API endpoints (Preventing IDORs and Tenant Bleeding)
- ✅ Lightning fast P99 response times (Sub 100ms API resolutions)
- ✅ Mobile-first resilient offline capabilities
- ✅ Clean, highly logical, and modular codebase.

---

## 🛡️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
