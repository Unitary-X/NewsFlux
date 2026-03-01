# 🧩 NewsFlux: Core Modules & Page Flow

This document details the implemented business modules and page configurations for all three roles within the NewsFlux platform.

---

## 🧠 Core Modules (All Implemented ✅)

### 📰 1. Newspaper Management ✅
- Admin CRUD for newspapers (name, base price) — `POST/GET/PUT/DELETE /admin/newspapers`
- Multi-language labels via `react-i18next` (English + Tamil)
- Per-agency newspaper lists isolated by `tenant_id`

### 📦 2. Stock Management ✅
- Daily stock entry per newspaper: taken, returned, sold (computed) — `POST /admin/stock`, `GET /admin/stock/{date}`
- Dashboard stock summary chart — `GET /admin/dashboard/stock-summary`
- StockTable page with date-based ledger view

### 👷 3. Worker Management ✅
- CRUD for worker profiles — `POST/GET/PUT/DELETE /admin/workers`
- Route assignment linking workers → customers with ordering — `POST/GET/DELETE /admin/assignments`
- Worker PWA fetches assigned customers — `GET /worker/assignments`

### 👥 4. Customer Management ✅
- CRUD for customer records — `POST/GET/PUT/DELETE /admin/customers`
- Subscription management linking customers to newspapers with quantity, price override, and pause/active status — `POST/GET/PUT/DELETE /admin/subscriptions`

### 💰 5. Pricing System ✅
- Per-agency pricing: each newspaper has a `base_price` set by the admin
- Subscription-level price overrides via `customer_subscriptions.price` field
- Prices feed directly into billing calculations

### 🧾 6. Billing System ✅
- Monthly bill generation — `POST /admin/billing/generate`
- Formula: `TotalBill = Σ (Price × Quantity × ActiveDays) + DeliveryFee`
- Invoice tracking: pending/paid — `GET /admin/invoices`, `PUT /admin/invoices/{id}/pay`

### � 7. Analytics & Dashboards ✅
- **Admin Dashboard:** Stats cards + revenue chart + stock summary — 3 dedicated endpoints
- **Super Admin Analytics:** Platform-wide metrics, trends, growth, top agencies, churn — 5 dedicated endpoints
- **System Health:** Real-time server monitoring — `GET /superadmin/system-health`

### 🔔 8. Announcements ✅
- Platform-wide messaging from Super Admin to agencies/workers
- Targetable by audience: all, admins, workers, or specific agency
- Visible to admins (`GET /admin/announcements`) and workers (`GET /worker/announcements`)

### 💾 9. Google Drive Backup ✅
- OAuth2 consent flow per agency for secure Drive access
- Excel export (openpyxl) of agency data uploaded to admin's personal Google Drive
- Daily, monthly, and yearly backup triggers
- Browse and manage backup files from frontend

### 🔍 10. Audit & Security ✅
- Audit log tracking for all critical actions — `GET /superadmin/audit-logs`
- Tenant impersonation with full audit trail — `POST /superadmin/impersonate/{agency_id}`
- Billing plans for SaaS tiering — assigned per agency

---

## 🚀 Super Admin Add-ons (All Implemented ✅)

| Feature | Status | Description |
|---------|--------|-------------|
| Agency Templates | ✅ | Pre-seed agencies with regional newspaper lists |
| Secure Impersonation | ✅ | View platform as any agency admin, fully audit-logged |
| Platform Analytics | ✅ | MoM growth, churn rates, top agencies, aggregate metrics |
| System Health / APM | ✅ | Real-time server health monitoring |
| Billing Plans | ✅ | SaaS tiers with worker/customer limits |
| Announcements | ✅ | Targetable platform-wide messaging |


## 🚀 Page / Feature Flow

### 🔐 Authentication
1. **Login Page** (`/login`) — Single entry point for all roles
2. Role-based redirect to appropriate dashboard after JWT authentication

---

### 🏢 Admin Pages — 9 Pages (Agency Scope)

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/admin/dashboard` | Stats cards, revenue chart, stock summary |
| Stock Entry | `/admin/stock` | Daily newspaper stock ledger |
| Newspapers | `/admin/newspapers` | CRUD newspaper catalog |
| Workers | `/admin/workers` | CRUD worker profiles |
| Customers | `/admin/customers` | CRUD customer records |
| Subscriptions | `/admin/subscriptions` | Manage paper-to-customer assignments |
| Assignments | `/admin/assignments` | Worker-to-customer route mapping |
| Billing | `/admin/billing` | Invoice generation & payment tracking |
| Backup | `/admin/backup` | Google Drive connection & backup management |

---

### 👷 Worker Pages — 1 Page (Personal Scope)

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/worker/dashboard` | Today's assignments, offline sync, announcements |

Worker features: StepperInput for touch-friendly data entry, IndexedDB offline caching via Dexie.js, automatic sync via `useSyncQueue` hook.

---

### 👑 Super Admin Pages — 7 Pages (Platform Scope)

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/superadmin/dashboard` | Platform overview metrics |
| Agencies | `/superadmin/agencies` | Create, manage, suspend agencies |
| Analytics | `/superadmin/analytics` | Growth trends, churn, top performers |
| Announcements | `/superadmin/announcements` | Platform messaging management |
| Audit Logs | `/superadmin/audit-logs` | Security & change history |
| System Health | `/superadmin/system-health` | Server monitoring dashboard |
| Settings | `/superadmin/settings` | Platform configuration |