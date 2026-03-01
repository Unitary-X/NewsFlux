# NewsFlux: Missing Features & Gap Analysis

Audit date: March 1, 2026

---

## 👑 Super Admin (`/superadmin/*`)

### Implemented
- [x] Agency list (view all tenants)
- [x] Create new agency + admin account
- [x] Suspend / Reactivate agency

### Missing
- [ ] **Sidebar navigation** — Mockup shows full sidebar (Home, Dashboard, Agencies, Workers, Customers, Billing, System Logs, Settings) — current page has no sidebar
- [ ] **Analytics sub-pages** — Sales Overview, Top Products, Stock Status pages not built
- [ ] **KPI Cards with sparklines** — Mockup shows 4 cards (Total Agencies, Daily Newspapers, Monthly Revenue, System Load) with trend graphs — only basic count cards exist
- [ ] **Agency Growth bar chart** — Monthly growth visualization (from mockup)
- [ ] **Top Performing agencies leaderboard** — Ranked progress bars per agency
- [ ] **System Activity doughnut chart** — System load ring visualization
- [ ] **System Activity Log** — Searchable activity/audit log table
- [ ] **Server Monitoring / APM metrics** — P99 latency, error rates, DB health
- [ ] **Impersonation / God Mode** — "Log in as Admin" button to debug agency issues
- [ ] **Master Agency Templates** — Region-based newspaper pre-seeding on agency creation
- [ ] **Global Broadcast / Announcements** — Platform-wide notification system
- [ ] **SaaS Billing Engine** — Tiered plans, Stripe/Razorpay integration, auto-suspension
- [ ] **Audit Logs viewer** — DB model exists but no API endpoint or UI
- [ ] **Platform Churn & Growth Analytics** — MoM growth, churn rate tracking
- [ ] **Settings page** — No configuration UI

---

## 🏢 Admin (`/admin/*`)

### Implemented
- [x] Newspaper — Create + List
- [x] Worker — Create + List
- [x] Customer — Create + List
- [x] Daily Stock entry (Taken / Returned per newspaper per date)
- [x] Sidebar navigation with links

### Missing — Analytics & Reports
- [ ] **Dashboard overview** — Currently an empty placeholder page (just shows "Admin Dashboard" + logout)
- [ ] **Daily Revenue calculation** — `Sold × Price` not computed or displayed anywhere
- [ ] **Profit / Loss dashboard** — Specified in docs, not built
- [ ] **Stock Reconciliation reports** — Specified in docs, not built
- [ ] **Worker Performance tracking** — No metrics on individual worker output
- [ ] **Charts / Visualizations** — No graphs anywhere in admin pages
- [ ] **Daily / Weekly / Monthly report views** — Specified in docs, not built

### Missing — Billing & Finance
- [ ] **Billing page (generate / view invoices)** — Backend Celery task exists but no API endpoint or frontend UI to trigger or view it
- [ ] **Payment tracking (Paid / Unpaid)** — Invoice model has `status` field but no UI
- [ ] **Delivery Fee configuration** — Invoice model has `delivery_fee` field but no way to set it per agency
- [ ] **Salary management** — Specified in docs — no model, API, or UI for worker compensation

### Missing — CRUD Operations
- [ ] **Edit newspaper** — Can only create, not update name or price
- [ ] **Delete newspaper** — No delete functionality
- [ ] **Edit worker** — Can only create, not update username or reset password
- [ ] **Delete worker** — No delete functionality
- [ ] **Edit customer** — Can only create, not update details
- [ ] **Delete customer** — No delete functionality

### Missing — Subscriptions & Assignments
- [ ] **Customer Subscriptions management** — DB model (`customer_subscriptions`) exists but no admin UI to assign newspapers to customers
- [ ] **Customer Types** — Docs specify Daily / Weekly / Monthly / Yearly — not implemented
- [ ] **Worker Route Assignments** — `worker_assignments` table exists but no admin UI to assign customers to specific workers
- [ ] **Pricing grids per agency** — Only `base_price` on newspaper — no custom pricing per customer

### Missing — UX
- [ ] **Search / Filter in tables** — All tables show all records with no search
- [ ] **Pagination** — All data loaded at once
- [ ] **Sorting** — No column sorting in tables
- [ ] **Bulk actions** — No multi-select operations

---

## 👷 Worker (`/worker/*`)

### Implemented
- [x] View assigned newspapers
- [x] Enter Taken / Returned quantities (stepper inputs)
- [x] View assigned customers
- [x] Toggle delivery status per customer
- [x] Offline-first architecture (IndexedDB + sync queue)
- [x] Online / Offline indicator
- [x] Background sync when reconnected

### Missing
- [ ] **My Sales dashboard** — Docs specify worker sees personal sales metrics
- [ ] **My Salary view** — Docs specify worker sees salary / commission info
- [ ] **Today's Route View** — Docs specify ordered route map — current shows flat unordered list
- [ ] **i18n in worker pages** — Only login page has Tamil translation — worker UI is English-only

---

## 🔐 Authentication & Cross-Cutting

### Implemented
- [x] Login with JWT
- [x] Role-based routing (admin / worker / super_admin)
- [x] Agency registration (creates tenant + admin)
- [x] Token persistence in localStorage
- [x] TenantMiddleware for data isolation
- [x] i18n setup (English + Tamil) on Login page

### Missing
- [ ] **Password reset** — No endpoint or UI
- [ ] **Session timeout** — Token never expires during active use (set to 30 days)
- [ ] **i18n across all pages** — Only Login page is translated; all other pages hardcoded English
- [ ] **Audit logging** — DB model exists (`audit_logs` table) but no code writes to it anywhere
- [ ] **PWA Service Worker** — `manifest.json` exists but no actual service worker for true offline caching
- [ ] **Form validation** — Basic alerts only, no inline field-level validation
- [ ] **Error boundaries** — No React error boundaries for crash recovery

---

## 📊 Priority Recommendations

### High Priority (Core Business Value)
1. Admin Analytics Dashboard — Revenue, sales, stock charts
2. Customer Subscriptions UI — Assign newspapers to customers
3. Worker Route Assignments UI — Assign customers to workers
4. Billing / Invoice generation & viewing
5. Edit / Delete on all entities (newspapers, workers, customers)

### Medium Priority (Super Admin Completeness)
6. Super Admin sidebar + full dashboard with charts
7. Super Admin analytics (KPI cards, Agency Growth chart, System Activity)
8. Audit log viewer
9. Impersonation mode

### Lower Priority (Polish & Scale)
10. Search / Filter / Pagination in all tables
11. i18n across all pages
12. Salary management
13. PWA service worker
14. Password reset flow
