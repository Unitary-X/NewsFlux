# 👑 NewsFlux: Roles & Permissions

Implemented Role-Based Access Control (RBAC) and tenant isolation rules for the NewsFlux platform.

---

## 🔐 Core Data Control Rules

- Each agency sees **only its own data** — enforced by `TenantMiddleware` extracting `tenant_id` from JWT
- Workers see **only their assigned records** — filtered by `worker_id` in assignments
- Super Admin sees **everything** — `tenant_id` is null, bypasses tenant filtering
- All role checks enforced via `require_role()` dependency injection

---

## 1. 👑 Super Admin (Platform Owner)
**Scope:** Entire platform (all agencies)
**Role value:** `super_admin`
**Tenant ID:** `null`

### Endpoints (46):
| Category | Endpoints |
|----------|-----------|
| **Agency Management** | `GET /agencies`, `GET /{id}`, `PUT /{id}/status`, `PUT /{id}/plan`, `DELETE /{id}` |
| **Analytics** | `GET /analytics`, `/analytics/trends`, `/analytics/growth`, `/analytics/top-agencies`, `/analytics/churn` |
| **Audit** | `GET /audit-logs` |
| **System Health** | `GET /system-health` |
| **Super Admin Users** | `POST /super-admins`, `GET /super-admins`, `DELETE /super-admins/{id}` |
| **Impersonation** | `POST /impersonate/{agency_id}` |
| **Templates** | `GET /templates`, `POST /templates`, `DELETE /templates/{id}` |
| **Announcements** | `GET /announcements`, `POST /announcements`, `DELETE /announcements/{id}` |
| **Billing Plans** | `GET /billing-plans`, `POST /billing-plans`, `PUT /billing-plans/{id}`, `DELETE /billing-plans/{id}` |
| **Settings** | `GET /settings`, `GET /settings/{key}`, `PUT /settings/{key}`, `DELETE /settings/{key}` |
| **Agency Backup** | `GET /backup/agencies`, `GET /backup/{id}/files/{subfolder}`, `POST /backup/{id}/trigger`, `POST /backup/{id}/trigger-monthly`, `POST /backup/{id}/trigger-yearly`, `POST /backup/trigger-all` |
| **DB Backup** | `GET /backup/db/export-json`, `GET /backup/db/export-sql`, `GET /backup/db/stats`, `POST /backup/db/upload`, `POST /backup/db/upload-sql` |
| **SA Google Drive** | `GET /backup/gdrive/status`, `GET /backup/gdrive/connect`, `GET /backup/gdrive/callback`, `POST /backup/gdrive/disconnect`, `POST /backup/gdrive/upload-db` |

### Restrictions:
- ❌ Cannot directly modify agency operational data (newspapers, stock, customers)
- Impersonation generates a scoped JWT — all actions audit-logged

### Frontend Pages (8):
Dashboard, Agencies, Analytics, Announcements, AuditLogs, SystemHealth, Settings, Backup

---

## 2. 🏢 Admin (Agency Owner)
**Scope:** Full control within their specific agency
**Role value:** `admin`
**Tenant ID:** UUID of their agency

### Endpoints (47):
| Category | Permissions | Endpoints |
|----------|------------|-----------|
| Dashboard | View stats, revenue chart, stock summary | 3 GET endpoints |
| Newspapers | Full CRUD | POST, GET, PUT, DELETE |
| Workers | Full CRUD | POST, GET, PUT, DELETE |
| Customers | Full CRUD | POST, GET, PUT, DELETE |
| Daily Stock | Enter & view stock | POST, GET by date |
| Subscriptions | Full CRUD (with subscription type) | POST, GET, PUT, DELETE |
| Assignments | Create, view, delete routes | POST, GET, DELETE |
| Billing | Generate invoices, view, mark paid | POST, GET, PUT |
| Salaries | Full CRUD + mark paid | GET, POST, PUT, PUT/pay, DELETE |
| Pricing Grid | View & bulk update prices | GET, PUT |
| Reports | P&L, stock recon, worker perf, summary | 4 GET endpoints |
| Announcements | View platform announcements | GET |
| Google Drive | Connect, disconnect, trigger backups, browse files | 8 endpoints |

### Data Isolation:
- All queries automatically filtered by `request.state.tenant_id`
- Cannot access data from other agencies
- Cannot access super admin endpoints

### Frontend Pages (12):
Dashboard, Stock, Newspapers, Workers, Customers, Subscriptions, Assignments, Billing, Backup, Reports, Salaries, PricingGrid

---

## 3. 👷 Worker (Distributor)
**Scope:** Only their assigned customers and routes
**Role value:** `worker`
**Tenant ID:** UUID of their agency

### Endpoints (6):
| Permission | Endpoint |
|------------|----------|
| View assigned customers & routes | `GET /worker/assignments` |
| Sync offline updates (batch) | `POST /worker/offline-sync` |
| View announcements | `GET /worker/announcements` |
| View today's delivery route | `GET /worker/route` |
| View personal sales metrics | `GET /worker/sales` |
| View salary history | `GET /worker/salary` |

### Restrictions:
- ❌ Cannot see other workers' assignments or sales
- ❌ Cannot modify agency configuration
- ❌ Cannot access admin or super admin endpoints
- ✅ Can view their **own** salary data and sales metrics

### Offline Capabilities:
- Can generate UUIDv4 IDs locally while offline
- Updates queued in IndexedDB, synced when online via `useSyncQueue` hook
- Service worker provides network-first caching with offline fallback page

### Frontend Pages (4):
Dashboard, MySales, MySalary, RouteView

---

## 🔐 Authentication Endpoints (5)

| Permission | Endpoint |
|------------|----------|
| Login (all roles) | `POST /auth/login` |
| Register agency + admin | `POST /auth/register` |
| Refresh access token | `POST /auth/refresh` |
| Request password reset | `POST /auth/forgot-password` |
| Reset password with token | `POST /auth/reset-password` |

### Frontend Pages (3):
Login, ForgotPassword, ResetPassword

---

## 🛡️ Enforcement Mechanisms

### TenantMiddleware (`app/core/middleware.py`)
1. Extracts JWT from `Authorization: Bearer <token>` header
2. Decodes `tenant_id`, `role`, `user_id` into `request.state`
3. Rejects non-super_admin users missing `tenant_id` with 403
4. Bypasses auth for open routes: `/health`, `/auth/login`, `/auth/register`, `/docs`, `/openapi.json`, `/backup/google/callback`
5. Records request latency metrics for APM monitoring

### require_role() (`app/api/dependencies.py`)
- FastAPI dependency that checks `request.state.role` against allowed roles
- Returns 403 if role doesn't match
- Used as: `Depends(require_role(["admin"]))`, `Depends(require_role(["super_admin"]))`

### JWT Token Structure
```json
{
  "sub": "<user_id>",
  "tenant_id": "<agency_id or null>",
  "role": "super_admin | admin | worker",
  "exp": "<expiry timestamp>"
}
```

**Access Token:** 15 minute expiry
**Refresh Token:** 30 day expiry — used to obtain new access tokens without re-login
