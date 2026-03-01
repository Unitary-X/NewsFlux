# NewsFlux: Multi-Tenant SaaS Architecture

Technical architecture documentation for **NewsFlux** — a multi-tenant newspaper distribution management SaaS platform with offline-first capabilities.

---

## 1. 🗄️ Database Schema (SQLAlchemy + SQLite)

**Shared-Schema Multi-Tenant Architecture** — every tenant-specific table includes a `tenant_id` foreign key referencing `agencies.id`. UUIDs are used for all primary keys (stored as 32-char hex strings in SQLite).

### 12 Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `agencies` | Tenant organizations | `name`, `status`, `billing_plan_id`, `gdrive_refresh_token`, `gdrive_folder_id`, `gdrive_connected_at` |
| `users` | All user accounts (RBAC) | `tenant_id` (nullable for super_admin), `role`, `username`, `password_hash` |
| `newspapers` | Products per agency | `tenant_id`, `name`, `base_price` |
| `customers` | Subscriber records | `tenant_id`, `name`, `address`, `phone` |
| `customer_subscriptions` | Paper-to-customer links | `tenant_id`, `customer_id`, `newspaper_id`, `quantity`, `price`, `status` (1=active, 0=paused) |
| `daily_stock` | Daily inventory tracking | `tenant_id`, `date`, `newspaper_id`, `taken`, `returned`, `sold` (computed) |
| `worker_assignments` | Delivery route mappings | `tenant_id`, `worker_id`, `customer_id`, `route_order` |
| `invoices` | Monthly billing records | `tenant_id`, `customer_id`, `month`, `year`, `total_amount`, `delivery_fee`, `status` |
| `audit_logs` | Security & change tracking | `tenant_id`, `user_id`, `action`, `target_table`, `changes` (JSON), `timestamp` |
| `billing_plans` | SaaS tier definitions | `name`, `max_workers`, `max_customers`, `price_monthly`, `billing_cycle` |
| `agency_templates` | Pre-built agency configs | `name`, `region`, `newspapers` (JSON array) |
| `announcements` | Platform-wide messaging | `title`, `message`, `target_audience`, `target_agency_id`, `is_active`, `expires_at` |

### Schema Details

All models are defined in `backend/app/models/models.py` using SQLAlchemy 2.0 declarative syntax with the `Uuid` column type. The `DailyStock.sold` column uses `Computed('taken - returned')`.

**Database initialization:** During app startup (`main.py` lifespan), if the database URL starts with `sqlite`, `Base.metadata.create_all()` auto-creates tables. For PostgreSQL, Alembic migrations are used (`backend/alembic/`).

---

## 2. ⚙️ Backend API Structure (FastAPI)

### Middleware Layer

**`TenantMiddleware`** (`app/core/middleware.py`):
- Intercepts every request, decodes the JWT, extracts `tenant_id`, `role`, and `user_id`
- Injects into `request.state` for downstream use
- Bypasses auth for open routes: `/health`, `/api/v1/auth/login`, `/api/v1/auth/register`, `/docs`, `/openapi.json`
- Enforces tenant isolation: non-super_admin users without a valid `tenant_id` are rejected with 403
- Records request latency metrics via `collector.record()`

### Dependency Injection (`app/api/dependencies.py`)

- `get_db()` — yields a SQLAlchemy session from `SessionLocal`
- `require_role(allowed_roles)` — role-based access control checker reading from `request.state.role`
- `engine` — shared SQLAlchemy engine with SQLite `check_same_thread=False`

### API Routers (57 endpoints total)

| Router | Prefix | Endpoints | Purpose |
|--------|--------|-----------|---------|
| `auth.py` | `/api/v1/auth` | 2 | Login, agency registration |
| `admin.py` | `/api/v1/admin` | 36 | Full agency management CRUD |
| `worker.py` | `/api/v1/worker` | 3 | Assignments, offline sync, announcements |
| `superadmin.py` | `/api/v1/superadmin` | 16 | Platform administration |

#### Auth Router (2 endpoints)
- `POST /login` — JWT authentication
- `POST /register` — Agency + admin user creation

#### Admin Router (36 endpoints)
- **Dashboard:** `GET /dashboard/stats`, `/dashboard/revenue-chart`, `/dashboard/stock-summary`
- **Newspapers:** CRUD (`POST`, `GET`, `PUT /{id}`, `DELETE /{id}`)
- **Workers:** CRUD (`POST`, `GET`, `PUT /{id}`, `DELETE /{id}`)
- **Customers:** CRUD (`POST`, `GET`, `PUT /{id}`, `DELETE /{id}`)
- **Daily Stock:** `POST /stock`, `GET /stock/{date}`
- **Subscriptions:** CRUD (`GET`, `POST`, `PUT /{id}`, `DELETE /{id}`)
- **Assignments:** `GET`, `POST`, `DELETE /{id}`
- **Billing:** `POST /billing/generate`, `GET /invoices`, `PUT /invoices/{id}/pay`
- **Announcements:** `GET /announcements`
- **Google Drive Backup:** `GET /backup/google/connect`, `GET /backup/google/callback`, `GET /backup/google/status`, `DELETE /backup/google/disconnect`, `POST /backup/trigger`, `POST /backup/trigger-monthly`, `POST /backup/trigger-yearly`, `GET /backup/files/{subfolder}`

#### Worker Router (3 endpoints)
- `GET /assignments` — fetch assigned customers & routes
- `POST /offline-sync` — batch sync queued offline updates
- `GET /announcements` — view platform announcements

#### Super Admin Router (16 endpoints)
- **Agencies:** `GET /agencies`, `GET /{id}`, `PUT /{id}/status`, `PUT /{id}/plan`, `DELETE /{id}`
- **Analytics:** `GET /analytics`, `/analytics/trends`, `/analytics/growth`, `/analytics/top-agencies`, `/analytics/churn`
- **Audit:** `GET /audit-logs`
- **System:** `GET /system-health`
- **Super Admin Users:** `POST /super-admins`, `GET /super-admins`, `DELETE /super-admins/{id}`
- **Impersonation:** `POST /impersonate/{agency_id}`

### Background Services

- **Celery + Redis** (`app/core/celery_app.py`) — task queue for async jobs
- **Billing Job** (`app/services/billing_job.py`) — monthly invoice generation: `TotalBill = Σ (Price × Quantity × ActiveDays) + DeliveryFee`
- **Google Drive Backup** (`app/services/gdrive_service.py`, `excel_export.py`, `backup_scheduler.py`) — OAuth2 integration for Excel backup to admin's Google Drive

---

## 3. 💻 Frontend Architecture (React 19 + Vite 7)

**Unified Single Page Application** — a central login gateway routes users to role-specific dashboards via React Router 7.

### Routing Structure

| Role | Base Path | Pages |
|------|-----------|-------|
| Admin | `/admin/*` | Dashboard, Stock, Newspapers, Workers, Customers, Subscriptions, Assignments, Billing, Backup |
| Worker | `/worker/*` | Dashboard (assignments + offline sync) |
| Super Admin | `/superadmin/*` | Dashboard, Agencies, Analytics, Announcements, AuditLogs, SystemHealth, Settings |

### Key Architectural Patterns

1. **Authentication & Role Routing** — `AuthContext.jsx` stores JWT + role. `App.jsx` uses `ProtectedRoute` to redirect based on role after login
2. **i18n** — `react-i18next` with `en.json` and `ta.json` locale files. Components use `useTranslation()` hook
3. **Offline-First PWA** — `Dexie.js` IndexedDB for local caching. `useSyncQueue` hook auto-syncs when `navigator.onLine` restores. PWA manifest in `public/manifest.json`
4. **API Layer** — Axios instance (`utils/api.js`) with `baseURL: /api/v1`, automatic JWT injection via interceptors
5. **UI Components** — Tailwind CSS 4 utility classes, Recharts for dashboard charts, Lucide React icons, `StepperInput.jsx` for touch-friendly worker input

### Admin Layout

`AdminLayout.jsx` with persistent `Sidebar.jsx` providing 9 navigation links (Dashboard, Stock, Newspapers, Workers, Customers, Subscriptions, Assignments, Billing, Backup).

---

## 4. 📁 Project Folder Structure

```text
newspaper-boy/
├── docker-compose.yml          # Docker orchestration
├── README.md
├── backend/                    # FastAPI Application
│   ├── app/
│   │   ├── main.py             # App entry, lifespan, router registration
│   │   ├── seed.py             # Database seeding script
│   │   ├── api/
│   │   │   ├── dependencies.py # DB session, role checker, engine
│   │   │   └── v1/
│   │   │       ├── auth.py     # Login & registration (2 endpoints)
│   │   │       ├── admin.py    # Agency admin operations (36 endpoints)
│   │   │       ├── worker.py   # Worker PWA APIs (3 endpoints)
│   │   │       └── superadmin.py  # Platform admin (16 endpoints)
│   │   ├── core/
│   │   │   ├── config.py       # Pydantic Settings (env vars)
│   │   │   ├── security.py     # Password hashing, JWT creation
│   │   │   ├── middleware.py   # TenantMiddleware
│   │   │   ├── celery_app.py   # Celery + Redis config
│   │   │   └── init_db.py      # Startup DB initialization
│   │   ├── db/
│   │   │   └── base_class.py   # SQLAlchemy declarative Base
│   │   ├── models/
│   │   │   └── models.py       # 12 SQLAlchemy models
│   │   ├── schemas/
│   │   │   ├── auth.py         # Login/register Pydantic schemas
│   │   │   ├── admin.py        # Admin CRUD schemas
│   │   │   └── worker.py       # Worker sync schemas
│   │   └── services/
│   │       ├── billing_job.py  # Invoice generation logic
│   │       ├── gdrive_service.py    # Google Drive OAuth + upload
│   │       ├── excel_export.py      # openpyxl Excel generation
│   │       └── backup_scheduler.py  # Scheduled backup triggers
│   ├── alembic/                # Database migrations
│   │   └── versions/           # Migration scripts
│   ├── alembic.ini
│   ├── requirements.txt        # 18 Python dependencies
│   └── Dockerfile
├── frontend/                   # React SPA (Vite)
│   ├── src/
│   │   ├── App.jsx             # Main router (admin/worker/superadmin routes)
│   │   ├── main.jsx            # React entry point
│   │   ├── i18n.js             # i18next configuration
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   │   ├── AdminLayout.jsx  # Layout wrapper with sidebar
│   │   │   │   └── Sidebar.jsx      # 9-item navigation
│   │   │   └── worker/
│   │   │       └── StepperInput.jsx # Touch-friendly [-] [n] [+]
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx # JWT & role state management
│   │   ├── hooks/
│   │   │   └── useSyncQueue.js # Offline sync queue hook
│   │   ├── locales/
│   │   │   ├── en.json         # English translations
│   │   │   └── ta.json         # Tamil translations
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── admin/          # 9 admin pages
│   │   │   ├── worker/         # Worker dashboard
│   │   │   └── superadmin/     # 7 superadmin pages
│   │   └── utils/
│   │       ├── api.js          # Axios instance + interceptors
│   │       └── db.js           # Dexie.js IndexedDB setup
│   ├── public/
│   │   └── manifest.json       # PWA manifest
│   ├── package.json            # 17 npm dependencies
│   ├── vite.config.js          # Dev proxy → localhost:8000
│   ├── tailwind.config.js
│   ├── nginx.conf              # Production reverse proxy
│   └── Dockerfile
└── docs/                       # Project documentation
    ├── architecture.md         # This file
    ├── core_modules.md         # Business module details
    ├── system_flow.md          # Daily/monthly operational flow
    ├── roles_and_permissions.md # RBAC rules
    ├── diagrams.md             # Mermaid architecture diagrams
    ├── deployment_strategy.md  # Deployment options analysis
    ├── superadmin_addons.md    # Phase 2 super admin features
    ├── gdrive_backup.md        # Google Drive backup implementation
    ├── missing_features.md     # Feature gap analysis
    ├── own_server.md           # Self-hosted hardware assessment
    └── super admin frontend .md # Super admin UI spec
```

---

## 5. 📁 Documentation Index

| Document | Description |
|----------|-------------|
| [Roles & Permissions](roles_and_permissions.md) | RBAC logic for super_admin, admin, worker |
| [System Flow](system_flow.md) | Daily & monthly operational workflows |
| [Core Modules](core_modules.md) | Business modules & UI page flow |
| [Diagrams](diagrams.md) | Mermaid architecture & ERD diagrams |
| [Deployment Strategy](deployment_strategy.md) | Hosting options analysis |
| [Super Admin Add-ons](superadmin_addons.md) | Phase 2 super admin features (all implemented) |
| [Google Drive Backup](gdrive_backup.md) | OAuth2 backup implementation details |
| [Self-Hosted Server](own_server.md) | TrueNAS hardware assessment |

---

## 6. 🔥 Security & Best Practices

1. **Application-Level Tenant Isolation**
   - `TenantMiddleware` extracts `tenant_id` from JWT and injects into `request.state`. Every query filters by `tenant_id`. Non-super_admin users without a valid tenant are rejected (403).

2. **UUIDv4 Primary Keys**
   - All tables use UUID primary keys, enabling offline ID generation by Worker PWA without collision risk. Protects against IDOR attacks.

3. **Immutable Audit Trail**
   - `audit_logs` table tracks critical actions (`PRICE_UPDATE`, `STOCK_EDIT`, impersonation events). Changes stored as JSON for full traceability.

4. **Secure Tenant Impersonation**
   - Super Admins can impersonate agency admins via `POST /superadmin/impersonate/{agency_id}`. Generates a scoped JWT with the agency's `tenant_id`. All impersonated actions are audit-logged.

5. **Google Drive OAuth2 Security**
   - Refresh tokens encrypted with Fernet (`cryptography` library) before storage. OAuth2 consent flow per-agency ensures backups go to the admin's own Google Drive.

6. **JWT Authentication**
   - `python-jose` for token creation/verification. Password hashing via `passlib` + `bcrypt`. Tokens contain `sub` (user_id), `tenant_id`, and `role`.

---

## 7. 🚀 Implementation Status

All core features and Phase 2 super admin add-ons are **implemented**:

| Feature | Status |
|---------|--------|
| Multi-tenant RBAC (3 roles) | ✅ |
| Admin CRUD (newspapers, workers, customers, subscriptions, assignments) | ✅ |
| Daily stock management | ✅ |
| Monthly billing & invoices | ✅ |
| Worker PWA with offline sync | ✅ |
| Dashboard analytics (charts, stats) | ✅ |
| Super admin agency management | ✅ |
| Platform analytics & churn tracking | ✅ |
| Audit logging | ✅ |
| System health monitoring | ✅ |
| Billing plans & agency templates | ✅ |
| Announcements system | ✅ |
| Tenant impersonation | ✅ |
| Google Drive backup (OAuth2 + Excel) | ✅ |
| i18n (English + Tamil) | ✅ |
| Docker deployment | ✅ |
