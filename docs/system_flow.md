# 🔄 NewsFlux: End-to-End System Flow

This document details the lifecycle and daily operational flow of the NewsFlux newspaper distribution platform.

---

## 🟢 Step 1: Platform Setup (Super Admin)
- Creates a new Agency via `POST /auth/register` or Super Admin dashboard
- Provisions the initial Admin account with agency-scoped JWT
- Optionally assigns a Billing Plan and applies an Agency Template to pre-seed newspapers
- System sends agency creation email notification via Celery

---

## 🔵 Step 2: Agency Configuration (Admin)
The Admin configures their isolated agency environment:
- **Newspapers** — Add catalog with base prices (`POST /admin/newspapers`)
- **Pricing Grid** — Bulk-edit newspaper prices across the agency (`PUT /admin/pricing-grid`)
- **Workers** — Create distributor accounts (`POST /admin/workers`)
- **Customers** — Add subscriber records (`POST /admin/customers`)
- **Subscriptions** — Link customers to newspapers with quantity, pricing, and type (daily/weekly/monthly/yearly) (`POST /admin/subscriptions`)
- **Assignments** — Map workers to customers with route ordering (`POST /admin/assignments`)
- **Google Drive** — Connect OAuth2 for automated backups (`GET /admin/backup/google/connect`)

---

## 🟡 Step 3: Daily Operation Loop

### Morning
1. Admin enters daily stock counts per newspaper — `POST /admin/stock`
2. System records taken/returned/sold (computed) per newspaper per date

### Distribution Phase
3. Workers open the PWA and view assigned customers — `GET /worker/assignments`
4. Workers view their ordered delivery route — `GET /worker/route`
5. Workers deliver newspapers along their assigned routes
6. If offline, updates are queued in IndexedDB via Dexie.js

### Evening
7. Workers enter returned quantities via StepperInput (touch-friendly `[-] [n] [+]`)
8. Workers toggle delivery status per customer (delivered/missed → `DailyDelivery` records)
9. Offline queue auto-syncs when connectivity restores — `POST /worker/offline-sync`

### Worker Self-Service
10. Workers review personal sales metrics and 7-day trends — `GET /worker/sales`
11. Workers check salary history and pending earnings — `GET /worker/salary`

### Automated Calculations
Upon submission, the system computes:
- `Sold = Taken − Returned` (computed column in `daily_stock`)
- Stock summary available on admin dashboard — `GET /admin/dashboard/stock-summary`

---

## 📅 Step 4: Monthly Billing Process
At the end of each billing cycle:
1. Admin triggers bill generation — `POST /admin/billing/generate`
2. System calculates per-customer invoices:
   - `TotalBill = Σ (Price × Quantity × ActiveDays) + DeliveryFee`
   - Deducts for missed deliveries (queries `DailyDelivery` records)
3. Invoices stored with pending/paid status — `GET /admin/invoices`
4. Admin marks invoices as paid — `PUT /admin/invoices/{id}/pay`
5. Revenue chart updates on dashboard — `GET /admin/dashboard/revenue-chart`

---

## 💼 Step 5: Salary Management
Admin manages worker compensation monthly:
1. Create salary records with base salary, bonus, deductions — `POST /admin/salaries`
2. Review salary list and make adjustments — `GET /admin/salaries`, `PUT /admin/salaries/{id}`
3. Mark salaries as paid — `PUT /admin/salaries/{id}/pay`
4. Workers view their own salary details — `GET /worker/salary`

---

## 📊 Step 6: Admin Reporting
Admin reviews business performance:
- **P&L Dashboard** — Revenue vs costs breakdown — `GET /admin/reports/profit-loss`
- **Stock Reconciliation** — Track stock variances — `GET /admin/reports/stock-reconciliation`
- **Worker Performance** — Delivery success rates per worker — `GET /admin/reports/worker-performance`
- **Summary** — Aggregated daily/weekly/monthly metrics — `GET /admin/reports/summary`

---

## 💾 Step 7: Backup Process
Google Drive backup runs on demand or scheduled:
- **Daily backup** — `POST /admin/backup/trigger` (current day's data as Excel)
- **Monthly backup** — `POST /admin/backup/trigger-monthly` (full month summary)
- **Yearly backup** — `POST /admin/backup/trigger-yearly` (annual report)
- Files uploaded to admin's personal Google Drive in organized subfolders
- Browse backups from frontend — `GET /admin/backup/files/{subfolder}`

Super Admin can also:
- Trigger backups for any agency or all agencies at once
- Export/import the full database as JSON or SQL
- Connect their own Google Drive for platform-level backups

---

## 🔐 Step 8: Password Reset Flow
1. User submits email via **Forgot Password** page — `POST /auth/forgot-password`
2. Backend generates a password reset token
3. User clicks the reset link → **Reset Password** page — `POST /auth/reset-password`
4. Password is updated and user can log in with new credentials

---

## 👑 Step 9: Platform Monitoring (Super Admin)
Super Admin continuously monitors:
- **Agency Health** — `GET /superadmin/agencies` (active/suspended status)
- **Platform Analytics** — Growth trends, churn, top agencies — 5 analytics endpoints
- **Audit Trail** — All critical actions logged — `GET /superadmin/audit-logs`
- **System Health** — Server metrics, latency, memory usage — `GET /superadmin/system-health`
- **Impersonation** — Debug agency issues by viewing as admin — `POST /superadmin/impersonate/{agency_id}`
- **Announcements** — Broadcast messages to all or specific agencies
- **Settings** — Configure platform settings, manage templates, billing plans, and super admin accounts

---

## 🔒 Security Through Every Step
- All API calls authenticated via JWT with `tenant_id` isolation
- `TenantMiddleware` enforces data separation at every request
- UUIDv4 keys enable offline ID generation without conflicts
- Audit logs track every sensitive action with user attribution
- Google Drive tokens encrypted with Fernet before storage
- Access tokens expire in 15 minutes; refresh tokens auto-renew for 30 days
- Error boundaries catch frontend crashes without exposing internals
