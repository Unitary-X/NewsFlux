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

### Endpoints (16):
| Permission | Endpoint |
|------------|----------|
| List all agencies | `GET /superadmin/agencies` |
| View agency detail | `GET /superadmin/agencies/{id}` |
| Suspend/activate agency | `PUT /superadmin/agencies/{id}/status` |
| Assign billing plan | `PUT /superadmin/agencies/{id}/plan` |
| Delete agency | `DELETE /superadmin/agencies/{id}` |
| Platform analytics | `GET /superadmin/analytics` |
| Growth trends | `GET /superadmin/analytics/trends` |
| Growth metrics | `GET /superadmin/analytics/growth` |
| Top agencies | `GET /superadmin/analytics/top-agencies` |
| Churn tracking | `GET /superadmin/analytics/churn` |
| Audit logs | `GET /superadmin/audit-logs` |
| System health | `GET /superadmin/system-health` |
| Create super admin | `POST /superadmin/super-admins` |
| List super admins | `GET /superadmin/super-admins` |
| Delete super admin | `DELETE /superadmin/super-admins/{id}` |
| Impersonate agency | `POST /superadmin/impersonate/{agency_id}` |

### Restrictions:
- ❌ Cannot directly modify agency operational data (newspapers, stock, customers)
- Impersonation generates a scoped JWT — all actions audit-logged

---

## 2. 🏢 Admin (Agency Owner)
**Scope:** Full control within their specific agency
**Role value:** `admin`
**Tenant ID:** UUID of their agency

### Endpoints (36):
| Category | Permissions | Endpoints |
|----------|------------|-----------|
| Dashboard | View stats, revenue chart, stock summary | 3 GET endpoints |
| Newspapers | Full CRUD | POST, GET, PUT, DELETE |
| Workers | Full CRUD | POST, GET, PUT, DELETE |
| Customers | Full CRUD | POST, GET, PUT, DELETE |
| Daily Stock | Enter & view stock | POST, GET by date |
| Subscriptions | Full CRUD | POST, GET, PUT, DELETE |
| Assignments | Create, view, delete routes | POST, GET, DELETE |
| Billing | Generate invoices, view, mark paid | POST, GET, PUT |
| Announcements | View platform announcements | GET |
| Google Drive | Connect, disconnect, trigger backups, browse files | 8 endpoints |

### Data Isolation:
- All queries automatically filtered by `request.state.tenant_id`
- Cannot access data from other agencies
- Cannot access super admin endpoints

---

## 3. 👷 Worker (Distributor)
**Scope:** Only their assigned customers and routes
**Role value:** `worker`
**Tenant ID:** UUID of their agency

### Endpoints (3):
| Permission | Endpoint |
|------------|----------|
| View assigned customers & routes | `GET /worker/assignments` |
| Sync offline updates (batch) | `POST /worker/offline-sync` |
| View announcements | `GET /worker/announcements` |

### Restrictions:
- ❌ Cannot see pricing or billing data
- ❌ Cannot see other workers' assignments
- ❌ Cannot access admin or super admin endpoints
- ❌ Cannot modify agency configuration

### Offline Capabilities:
- Can generate UUIDv4 IDs locally while offline
- Updates queued in IndexedDB, synced when online via `useSyncQueue` hook

---

## 🛡️ Enforcement Mechanisms

### TenantMiddleware (`app/core/middleware.py`)
1. Extracts JWT from `Authorization: Bearer <token>` header
2. Decodes `tenant_id`, `role`, `user_id` into `request.state`
3. Rejects non-super_admin users missing `tenant_id` with 403
4. Bypasses auth for open routes: `/health`, `/auth/login`, `/auth/register`, `/docs`

### require_role() (`app/api/dependencies.py`)
- FastAPI dependency that checks `request.state.role` against allowed roles
- Returns 403 if role doesn't match
- Used as: `Depends(require_role(["admin"]))`, `Depends(require_role(["super_admin"]))`

### JWT Token Structure
```json
{
  "sub": "<user_id>",
  "tenant_id": "<agency_id or null>",
  "role": "super_admin | admin | worker"
}
```