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
| **👑 Super Admin** | Dark-mode glassmorphism dashboard | Agency CRUD, Analytics (KPIs, growth, churn), Audit Logs, System Health/APM, God Mode (impersonation), Templates, Announcements, Billing Plans, Backup/Restore, Settings |
| **🏢 Admin** | Dense data-entry ledger UI | Newspapers, Workers, Customers, Stock Entry, Subscriptions, Assignments, Billing/Invoices, Salaries, Reports (P&L, Stock, Performance), Pricing Grid, Google Drive Backup, Dashboard with charts |
| **👷 Worker** | Mobile-first offline PWA | View assignments, enter Taken/Returned with stepper inputs, toggle delivery status, My Sales (7-day trends), My Salary, Route View, IndexedDB + background sync |

---

## 🏗️ Tech Stack

### Backend
- **Framework:** Python 3.11+ / FastAPI
- **Database:** SQLite (local dev) / PostgreSQL (production) — Shared-Schema Multi-Tenancy
- **ORM:** SQLAlchemy 2.0 with Pydantic v2 schemas
- **Auth:** JWT (python-jose) with role claims (`sub`, `role`, `tenant_id`) + refresh tokens
- **Background Jobs:** Celery + Redis (billing cron, Google Drive backups, email notifications)
- **Backup:** Google Drive API with OAuth2 per-agency + openpyxl Excel exports + DB export/import
- **Email:** SMTP email service via Celery tasks

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
│   ├── architecture.md              # DB schema (16 tables) & API structure (111 endpoints)
│   ├── core_modules.md              # Business modules & page flow
│   ├── system_flow.md               # Daily/monthly operational flow
│   ├── roles_and_permissions.md     # RBAC definition
│   ├── diagrams.md                  # Mermaid architecture diagrams
│   ├── deployment_strategy.md       # Docker/PaaS/K8s options
│   ├── own_server.md                # TrueNAS bare-metal guide
│   ├── super admin frontend .md     # Antigravity UI spec
│   ├── superadmin_addons.md         # Super admin enterprise features
│   └── gdrive_backup.md             # Google Drive backup implementation
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app + lifespan
│   │   ├── api/v1/                  # auth, admin, worker, superadmin, backup routers
│   │   ├── core/                    # config, security, middleware, celery, audit, metrics
│   │   ├── models/models.py         # 16 SQLAlchemy models
│   │   ├── schemas/                 # Pydantic request/response schemas
│   │   ├── services/                # google_drive, gdrive_service, excel_export, backup_scheduler, billing_job, email
│   │   └── db/base_class.py         # SQLAlchemy Base
│   ├── alembic/                     # Database migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx                  # Route definitions (admin/worker/superadmin)
│   │   ├── pages/admin/             # 12 pages: Dashboard, Stock, Newspapers, Workers, Customers, Subscriptions, Assignments, Billing, Backup, Reports, Salaries, PricingGrid
│   │   ├── pages/worker/            # 4 pages: Dashboard, MySales, MySalary, RouteView
│   │   ├── pages/superadmin/        # 8 pages: Dashboard, Agencies, Analytics, Announcements, AuditLogs, SystemHealth, Settings, Backup
│   │   ├── components/              # AdminLayout, Sidebar, TableControls, SuperAdminLayout, ErrorBoundary, ImpersonationBanner, AnnouncementBanner
│   │   ├── contexts/AuthContext.jsx # JWT auth + role routing + auto-refresh
│   │   ├── hooks/                   # useSyncQueue, useTableControls
│   │   ├── locales/                 # en.json, ta.json
│   │   └── utils/                   # api.js (axios + token refresh), db.js (Dexie), validation.js
│   └── package.json
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
A super admin account is created automatically on first startup:
- **Username:** `superadmin`
- **Password:** `admin123`

Change the password immediately after first login.

### Docker (Production)
```bash
docker-compose up -d
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | Database schema (16 tables), API structure (111 endpoints), component layout |
| [Core Modules](docs/core_modules.md) | Business logic modules & page flow |
| [System Flow](docs/system_flow.md) | Daily & monthly operational workflow |
| [Roles & Permissions](docs/roles_and_permissions.md) | RBAC rules for all 3 roles |
| [Diagrams](docs/diagrams.md) | Mermaid architecture & flow diagrams |
| [Deployment Strategy](docs/deployment_strategy.md) | Docker, PaaS, Hybrid, K8s analysis |
| [TrueNAS Guide](docs/own_server.md) | Bare-metal self-hosting on TrueNAS |
| [Super Admin UI Spec](docs/super%20admin%20frontend%20.md) | Antigravity glassmorphism design rules |
| [Super Admin Add-ons](docs/superadmin_addons.md) | Enterprise features (all implemented) |
| [Google Drive Backup](docs/gdrive_backup.md) | Per-agency OAuth2 Excel export to Google Drive |

---

## ⚡ Key Architecture

1. **Tenant Middleware:** Every request decodes the JWT, extracts `tenant_id`, and injects it into `request.state` — all queries are automatically scoped.
2. **Offline Sync:** Workers submit batched operations from IndexedDB via `POST /worker/offline-sync` when connectivity resumes.
3. **Celery Beat:** Automated monthly billing (`billing_job`) and Google Drive backups (`backup_scheduler` — daily/monthly/yearly).
4. **Impersonation:** Super admin generates short-lived admin JWTs to debug agencies, all actions are audit-logged.
5. **APM Metrics:** Middleware collects per-request latency and status codes; super admin views P50/P95/P99 in System Health page.
6. **Refresh Tokens:** Access tokens expire in 15 minutes; refresh tokens (30 days) auto-renew via frontend interceptors.
7. **PWA Service Worker:** Network-first caching strategy with offline fallback page for workers in low-connectivity areas.

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
