# NewsFlux: Multi-Tenant SaaS Architecture

Technical architecture documentation for **NewsFlux** — a multi-tenant newspaper distribution management SaaS platform with offline-first capabilities.

---

## 1. 🗄️ Database Schema (SQLAlchemy + SQLite/PostgreSQL)

**Shared-Schema Multi-Tenant Architecture** — every tenant-specific table includes a `tenant_id` foreign key referencing `agencies.id`. UUIDs are used for all primary keys (stored as 32-char hex strings in SQLite).

### 16 Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `agencies` | Tenant organizations | `name`, `status`, `billing_plan_id`, `gdrive_refresh_token`, `gdrive_folder_id`, `gdrive_connected_at`, `gdrive_oauth_state` |
| `users` | All user accounts (RBAC) | `tenant_id` (nullable for super_admin), `role`, `username`, `password_hash` |
| `newspapers` | Products per agency | `tenant_id`, `name`, `base_price` |
| `customers` | Subscriber records | `tenant_id`, `name`, `address`, `phone` |
| `customer_subscriptions` | Paper-to-customer links | `tenant_id`, `customer_id`, `newspaper_id`, `quantity`, `price`, `status`, `subscription_type` |
| `daily_stock` | Daily inventory tracking | `tenant_id`, `date`, `newspaper_id`, `taken`, `returned`, `sold` (computed) |
| `worker_assignments` | Delivery route mappings | `tenant_id`, `worker_id`, `customer_id`, `route_order` |
| `invoices` | Monthly billing records | `tenant_id`, `customer_id`, `month`, `year`, `total_amount`, `delivery_fee`, `status` |
| `audit_logs` | Security & change tracking | `tenant_id`, `user_id`, `action`, `target_table`, `changes` (JSON), `timestamp` |
| `billing_plans` | SaaS tier definitions | `name`, `max_workers`, `max_customers`, `price_monthly`, `billing_cycle` |
| `agency_templates` | Pre-built agency configs | `name`, `region`, `newspapers` (JSON array) |
| `announcements` | Platform-wide messaging | `title`, `message`, `target_audience`, `target_agency_id`, `is_active`, `expires_at` |
| `platform_settings` | Super admin key-value settings | `setting_key`, `setting_value`, `setting_type` |
| `salaries` | Worker salary records | `tenant_id`, `worker_id`, `month`, `year`, `base_salary`, `bonus`, `deductions`, `status` |
| `daily_deliveries` | Per-customer daily delivery log | `tenant_id`, `customer_id`, `worker_id`, `date`, `status` (delivered/missed) |
| `backups` | Google Drive backup records | `agency_id`, `backup_name`, `backup_type`, `status`, `gdrive_file_id`, `gdrive_web_link` |

### Schema Details

All models are defined in `backend/app/models/models.py` using SQLAlchemy 2.0 declarative syntax with the `Uuid` column type. The `DailyStock.sold` column uses `Computed('taken - returned')`.

**Database initialization:** During app startup (`main.py` lifespan), if the database URL starts with `sqlite`, `Base.metadata.create_all()` auto-creates tables. For PostgreSQL, Alembic migrations are used (`backend/alembic/`).

---

## 2. ⚙️ Backend API Structure (FastAPI)

### Middleware Layer

**`TenantMiddleware`** (`app/core/middleware.py`):
- Intercepts every request, decodes the JWT, extracts `tenant_id`, `role`, and `user_id`
- Injects into `request.state` for downstream use
- Bypasses auth for open routes: `/health`, `/api/v1/auth/login`, `/api/v1/auth/register`, `/docs`, `/openapi.json`, `/api/v1/backup/google/callback`
- Enforces tenant isolation: non-super_admin users without a valid `tenant_id` are rejected with 403
- Records request latency metrics via `collector.record()`

### Dependency Injection (`app/api/dependencies.py`)

- `get_db()` — yields a SQLAlchemy session from `SessionLocal`
- `require_role(allowed_roles)` — role-based access control checker reading from `request.state.role`
- `engine` — shared SQLAlchemy engine with SQLite `check_same_thread=False`

### API Routers (111 endpoints total)

| Router | Prefix | Endpoints | Purpose |
|--------|--------|-----------|---------|
| `auth.py` | `/api/v1/auth` | 5 | Login, registration, password reset, token refresh |
| `admin.py` | `/api/v1/admin` | 47 | Full agency management CRUD, reports, salaries, backup |
| `worker.py` | `/api/v1/worker` | 6 | Assignments, offline sync, announcements, route, sales, salary |
| `superadmin.py` | `/api/v1/superadmin` | 46 | Platform administration, analytics, backup, settings |
| `backup.py` | `/api/v1/backup` | 7 | Google Drive OAuth & backup management (per-agency) |

#### Auth Router (5 endpoints)
- `POST /login` — JWT authentication
- `POST /register` — Agency + admin user creation
- `POST /refresh` — Refresh access token using refresh token
- `POST /forgot-password` — Generate password reset token
- `POST /reset-password` — Reset password with token

#### Admin Router (47 endpoints)
- **Dashboard:** `GET /dashboard/stats`, `/dashboard/revenue-chart`, `/dashboard/stock-summary`
- **Newspapers:** CRUD (`POST`, `GET`, `PUT /{id}`, `DELETE /{id}`)
- **Workers:** CRUD (`POST`, `GET`, `PUT /{id}`, `DELETE /{id}`)
- **Customers:** CRUD (`POST`, `GET`, `PUT /{id}`, `DELETE /{id}`)
- **Daily Stock:** `POST /stock`, `GET /stock/{date}`
- **Subscriptions:** CRUD (`GET`, `POST`, `PUT /{id}`, `DELETE /{id}`)
- **Assignments:** `GET`, `POST`, `DELETE /{id}`
- **Billing:** `POST /billing/generate`, `GET /invoices`, `PUT /invoices/{id}/pay`
- **Salaries:** CRUD (`GET`, `POST`, `PUT /{id}`, `PUT /{id}/pay`, `DELETE /{id}`)
- **Pricing Grid:** `GET /pricing-grid`, `PUT /pricing-grid`
- **Reports:** `GET /reports/profit-loss`, `/reports/stock-reconciliation`, `/reports/worker-performance`, `/reports/summary`
- **Announcements:** `GET /announcements`
- **Google Drive Backup:** `GET /backup/google/connect`, `GET /backup/google/callback`, `GET /backup/google/status`, `DELETE /backup/google/disconnect`, `POST /backup/trigger`, `POST /backup/trigger-monthly`, `POST /backup/trigger-yearly`, `GET /backup/files/{subfolder}`

#### Worker Router (6 endpoints)
- `GET /assignments` — fetch assigned customers & routes
- `POST /offline-sync` — batch sync queued offline updates
- `GET /announcements` — view platform announcements
- `GET /route` — today's ordered delivery route with customer details
- `GET /sales` — personal sales metrics with 7-day trends
- `GET /salary` — salary history and earned/pending totals

#### Super Admin Router (46 endpoints)
- **Agencies:** `GET /agencies`, `GET /{id}`, `PUT /{id}/status`, `PUT /{id}/plan`, `DELETE /{id}`
- **Analytics:** `GET /analytics`, `/analytics/trends`, `/analytics/growth`, `/analytics/top-agencies`, `/analytics/churn`
- **Audit:** `GET /audit-logs`
- **System:** `GET /system-health`
- **Super Admin Users:** `POST /super-admins`, `GET /super-admins`, `DELETE /super-admins/{id}`
- **Impersonation:** `POST /impersonate/{agency_id}`
- **Templates:** `GET /templates`, `POST /templates`, `DELETE /templates/{id}`
- **Announcements:** `GET /announcements`, `POST /announcements`, `DELETE /announcements/{id}`
- **Billing Plans:** `GET /billing-plans`, `POST /billing-plans`, `PUT /billing-plans/{id}`, `DELETE /billing-plans/{id}`
- **Settings:** `GET /settings`, `GET /settings/{key}`, `PUT /settings/{key}`, `DELETE /settings/{key}`
- **Agency Backup:** `GET /backup/agencies`, `GET /backup/{id}/files/{subfolder}`, `POST /backup/{id}/trigger`, `POST /backup/{id}/trigger-monthly`, `POST /backup/{id}/trigger-yearly`, `POST /backup/trigger-all`
- **DB Backup:** `GET /backup/db/export-json`, `GET /backup/db/export-sql`, `GET /backup/db/stats`, `POST /backup/db/upload`, `POST /backup/db/upload-sql`
- **SA Google Drive:** `GET /backup/gdrive/status`, `GET /backup/gdrive/connect`, `GET /backup/gdrive/callback`, `POST /backup/gdrive/disconnect`, `POST /backup/gdrive/upload-db`

#### Backup Router (7 endpoints)
- `GET /status` — check Google Drive connection status
- `GET /google/auth-url` — get OAuth authorization URL
- `GET /google/callback` — handle OAuth callback (open route)
- `POST /disconnect-google` — remove Google Drive connection
- `POST /trigger-backup` — trigger manual backup
- `GET /list` — list backup records
- `DELETE /delete/{backup_id}` — delete a backup

### Background Services

- **Celery + Redis** (`app/core/celery_app.py`) — task queue for async jobs
- **Billing Job** (`app/services/billing_job.py`) — monthly invoice generation: `TotalBill = Σ (Price × Quantity × ActiveDays) + DeliveryFee`
- **Google Drive Backup** (`app/services/google_drive.py`, `gdrive_service.py`, `excel_export.py`, `backup_scheduler.py`) — OAuth2 integration for Excel backup to admin's Google Drive
- **Email Service** (`app/services/email_service.py`, `email_tasks.py`) — SMTP email sending via Celery tasks

---

## 3. 💻 Frontend Architecture (React 19 + Vite 7)

**Unified Single Page Application** — a central login gateway routes users to role-specific dashboards via React Router 7.

### Routing Structure

| Role | Base Path | Pages |
|------|-----------|-------|
| Auth | `/` | Login, ForgotPassword, ResetPassword |
| Admin | `/admin/*` | Dashboard, Stock, Newspapers, Workers, Customers, Subscriptions, Assignments, Billing, Backup, Reports, Salaries, PricingGrid |
| Worker | `/worker/*` | Dashboard, MySales, MySalary, RouteView |
| Super Admin | `/superadmin/*` | Dashboard, Agencies, Analytics, Announcements, AuditLogs, SystemHealth, Settings, Backup |

### Key Architectural Patterns

1. **Authentication & Role Routing** — `AuthContext.jsx` stores JWT + role + refresh token. `App.jsx` uses `ProtectedRoute` to redirect based on role after login. Auto-refresh every 10 minutes.
2. **i18n** — `react-i18next` with `en.json` and `ta.json` locale files. Components use `useTranslation()` hook. Full coverage across admin and worker pages; super admin is English-only by design.
3. **Offline-First PWA** — `Dexie.js` IndexedDB for local caching. `useSyncQueue` hook auto-syncs when `navigator.onLine` restores. PWA manifest in `public/manifest.json`. Service worker with network-first caching and offline fallback page.
4. **API Layer** — Axios instance (`utils/api.js`) with `baseURL: /api/v1`, automatic JWT injection via interceptors. 401 interceptor auto-refreshes tokens.
5. **UI Components** — Tailwind CSS 4 utility classes, Recharts for dashboard charts, Lucide React icons, `StepperInput.jsx` for touch-friendly worker input, `TableControls.jsx` for pagination/sorting/bulk actions.
6. **Error Handling** — `ErrorBoundary.jsx` catches React crashes with friendly UI and dev error details. Form validation via `utils/validation.js`.

### Admin Layout

`AdminLayout.jsx` with persistent `Sidebar.jsx` providing navigation links (Dashboard, Stock, Newspapers, Workers, Customers, Subscriptions, Assignments, Billing, Backup). Additional pages (Reports, Salaries, PricingGrid) accessible through the interface.

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
│   │   │       ├── auth.py     # Login, registration, password reset (5 endpoints)
│   │   │       ├── admin.py    # Agency admin operations (47 endpoints)
│   │   │       ├── worker.py   # Worker PWA APIs (6 endpoints)
│   │   │       ├── superadmin.py  # Platform admin (46 endpoints)
│   │   │       └── backup.py   # Google Drive backup (7 endpoints)
│   │   ├── core/
│   │   │   ├── config.py       # Pydantic Settings (env vars + .env loading)
│   │   │   ├── security.py     # Password hashing, JWT, Fernet token encryption
│   │   │   ├── middleware.py   # TenantMiddleware + APM metrics
│   │   │   ├── celery_app.py   # Celery + Redis config
│   │   │   ├── init_db.py      # Startup DB initialization
│   │   │   ├── metrics.py      # Request latency collector
│   │   │   ├── audit.py        # Audit logging utility
│   │   │   └── audit_decorator.py # Reusable audit decorator
│   │   ├── db/
│   │   │   └── base_class.py   # SQLAlchemy declarative Base
│   │   ├── models/
│   │   │   └── models.py       # 16 SQLAlchemy models
│   │   ├── schemas/
│   │   │   ├── auth.py         # Login/register/reset Pydantic schemas
│   │   │   ├── admin.py        # Admin CRUD schemas
│   │   │   ├── worker.py       # Worker sync schemas
│   │   │   └── settings.py     # Platform settings schemas
│   │   └── services/
│   │       ├── billing_job.py       # Invoice generation logic
│   │       ├── google_drive.py      # Google Drive OAuth + backup operations
│   │       ├── gdrive_service.py    # Google Drive service (admin/superadmin)
│   │       ├── excel_export.py      # openpyxl Excel generation
│   │       ├── backup_scheduler.py  # Scheduled backup triggers
│   │       ├── email_service.py     # SMTP email sending
│   │       └── email_tasks.py       # Celery email tasks
│   ├── alembic/                # Database migrations
│   │   └── versions/           # Migration scripts
│   ├── alembic.ini
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                   # React SPA (Vite)
│   ├── src/
│   │   ├── App.jsx             # Main router (admin/worker/superadmin routes)
│   │   ├── main.jsx            # React entry point + service worker registration
│   │   ├── i18n.js             # i18next configuration
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   │   ├── AdminLayout.jsx  # Layout wrapper with sidebar
│   │   │   │   ├── Sidebar.jsx      # Navigation sidebar
│   │   │   │   └── TableControls.jsx # Pagination, sorting, bulk actions
│   │   │   ├── superadmin/
│   │   │   │   ├── SuperAdminLayout.jsx  # SA layout wrapper
│   │   │   │   └── SuperAdminSidebar.jsx # SA navigation sidebar
│   │   │   ├── worker/
│   │   │   │   └── StepperInput.jsx # Touch-friendly [-] [n] [+]
│   │   │   ├── AnnouncementBanner.jsx  # Platform announcements display
│   │   │   ├── ErrorBoundary.jsx       # React error boundary
│   │   │   └── ImpersonationBanner.jsx # Impersonation mode indicator
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx # JWT, role state, auto-refresh
│   │   ├── hooks/
│   │   │   ├── useSyncQueue.js    # Offline sync queue hook
│   │   │   └── useTableControls.js # Pagination/sorting hook
│   │   ├── locales/
│   │   │   ├── en.json         # English translations
│   │   │   └── ta.json         # Tamil translations
│   │   ├── pages/
│   │   │   ├── Login.jsx       # Login page
│   │   │   ├── ForgotPassword.jsx  # Password reset request
│   │   │   ├── ResetPassword.jsx   # Password reset form
│   │   │   ├── admin/          # 12 admin pages
│   │   │   ├── worker/         # 4 worker pages
│   │   │   └── superadmin/     # 8 superadmin pages
│   │   └── utils/
│   │       ├── api.js          # Axios instance + interceptors + token refresh
│   │       ├── db.js           # Dexie.js IndexedDB setup
│   │       └── validation.js   # Form validation schemas
│   ├── public/
│   │   ├── manifest.json       # PWA manifest
│   │   ├── service-worker.js   # Network-first caching SW
│   │   └── offline.html        # Offline fallback page
│   ├── package.json
│   ├── vite.config.js          # Dev proxy → localhost:8000 + path alias
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
   - `audit_logs` table tracks critical actions (`PRICE_UPDATE`, `STOCK_EDIT`, impersonation events). Changes stored as JSON for full traceability. Reusable `@audit_log` decorator for easy extension to new entities.

4. **Secure Tenant Impersonation**
   - Super Admins can impersonate agency admins via `POST /superadmin/impersonate/{agency_id}`. Generates a scoped JWT with the agency's `tenant_id`. All impersonated actions are audit-logged.

5. **Google Drive OAuth2 Security**
   - Refresh tokens encrypted with Fernet (`cryptography` library) before storage. OAuth2 consent flow per-agency ensures backups go to the admin's own Google Drive. PKCE code challenge used for additional security.

6. **JWT Authentication**
   - `python-jose` for token creation/verification. Password hashing via `passlib` + `bcrypt`. Access tokens (15 min) + refresh tokens (30 days). Tokens contain `sub` (user_id), `tenant_id`, and `role`.

7. **Frontend Security**
   - Error boundaries prevent crash information leakage in production. Form validation at system boundaries. Auto-logout on token expiry with refresh token retry.

---

## 7. 🚀 Implementation Status

All core features and Phase 2 add-ons are **fully implemented**:

| Feature | Status |
|---------|--------|
| Multi-tenant RBAC (3 roles) | ✅ |
| Admin CRUD (newspapers, workers, customers, subscriptions, assignments) | ✅ |
| Daily stock management | ✅ |
| Monthly billing & invoices | ✅ |
| Worker PWA with offline sync | ✅ |
| Worker sales, salary, route views | ✅ |
| Dashboard analytics (charts, stats) | ✅ |
| Admin reports (P&L, stock, worker performance) | ✅ |
| Salary management | ✅ |
| Pricing grid (bulk editor) | ✅ |
| Super admin agency management | ✅ |
| Platform analytics & churn tracking | ✅ |
| Audit logging | ✅ |
| System health monitoring | ✅ |
| Billing plans & agency templates | ✅ |
| Announcements system | ✅ |
| Tenant impersonation | ✅ |
| Google Drive backup (OAuth2 + Excel) | ✅ |
| Super admin DB backup & restore | ✅ |
| Password reset flow | ✅ |
| Session timeout with refresh tokens | ✅ |
| i18n (English + Tamil) | ✅ |
| PWA service worker & offline fallback | ✅ |
| Error boundaries & form validation | ✅ |
| Email notifications | ✅ |
| Docker deployment | ✅ |
