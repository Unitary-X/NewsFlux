# 🔄 NewsFlux: End-to-End System Flow

This document details the lifecycle and daily operational flow of the NewsFlux newspaper distribution platform.

---

## 🟢 Step 1: Platform Setup (Super Admin)
- Creates a new Agency via `POST /auth/register` or Super Admin dashboard
- Provisions the initial Admin account with agency-scoped JWT
- Optionally assigns a Billing Plan and applies an Agency Template to pre-seed newspapers

---

## 🔵 Step 2: Agency Configuration (Admin)
The Admin configures their isolated agency environment:
- **Newspapers** — Add catalog with base prices (`POST /admin/newspapers`)
- **Workers** — Create distributor accounts (`POST /admin/workers`)
- **Customers** — Add subscriber records (`POST /admin/customers`)
- **Subscriptions** — Link customers to newspapers with quantity & pricing (`POST /admin/subscriptions`)
- **Assignments** — Map workers to customers with route ordering (`POST /admin/assignments`)
- **Google Drive** — Connect OAuth2 for automated backups (`GET /admin/backup/google/connect`)

---

## 🟡 Step 3: Daily Operation Loop

### Morning
1. Admin enters daily stock counts per newspaper — `POST /admin/stock`
2. System records taken/returned/sold (computed) per newspaper per date

### Distribution Phase
3. Workers open the PWA and view assigned customers — `GET /worker/assignments`
4. Workers deliver newspapers along their assigned routes
5. If offline, updates are queued in IndexedDB via Dexie.js

### Evening
6. Workers enter returned quantities via StepperInput (touch-friendly `[-] [n] [+]`)
7. Offline queue auto-syncs when connectivity restores — `POST /worker/offline-sync`

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
3. Invoices stored with pending/paid status — `GET /admin/invoices`
4. Admin marks invoices as paid — `PUT /admin/invoices/{id}/pay`
5. Revenue chart updates on dashboard — `GET /admin/dashboard/revenue-chart`

---

## 💾 Step 5: Backup Process
Google Drive backup runs on demand or scheduled:
- **Daily backup** — `POST /admin/backup/trigger` (current day's data as Excel)
- **Monthly backup** — `POST /admin/backup/trigger-monthly` (full month summary)
- **Yearly backup** — `POST /admin/backup/trigger-yearly` (annual report)
- Files uploaded to admin's personal Google Drive in organized subfolders
- Browse backups from frontend — `GET /admin/backup/files/{subfolder}`

---

## 👑 Step 6: Platform Monitoring (Super Admin)
Super Admin continuously monitors:
- **Agency Health** — `GET /superadmin/agencies` (active/suspended status)
- **Platform Analytics** — Growth trends, churn, top agencies — 5 analytics endpoints
- **Audit Trail** — All critical actions logged — `GET /superadmin/audit-logs`
- **System Health** — Server metrics and latency — `GET /superadmin/system-health`
- **Impersonation** — Debug agency issues by viewing as admin — `POST /superadmin/impersonate/{agency_id}`
- **Announcements** — Broadcast messages to all or specific agencies

---

## 🔒 Security Through Every Step
- All API calls authenticated via JWT with `tenant_id` isolation
- `TenantMiddleware` enforces data separation at every request
- UUIDv4 keys enable offline ID generation without conflicts
- Audit logs track every sensitive action with user attribution
- Google Drive tokens encrypted with Fernet before storage