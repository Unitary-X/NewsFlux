# NewsFlux: Missing Features & Gap Analysis

Audit date: March 2, 2026 (last updated after full codebase audit)

---

## 👑 Super Admin (`/superadmin/*`)

### Implemented
- [x] Agency list (view all tenants) — searchable, filterable by status
- [x] Create new agency + admin account — with optional template seeding
- [x] Suspend / Reactivate agency — status toggle
- [x] Delete agency — permanent deletion with all associated data
- [x] **Sidebar navigation** — Full sidebar: Dashboard, Agencies, Analytics, Announcements, Audit Logs, System Health, Settings
- [x] **KPI Cards with sparklines** — Total agencies, customers, newspapers, workers with 7-day trend percentages
- [x] **Agency Growth bar chart** — 12-month historical agency creation chart
- [x] **Agency Status donut chart** — Active vs Suspended percentage ring
- [x] **Top Performing agencies leaderboard** — Top 10 agencies ranked by customer count (bar chart + metadata)
- [x] **Analytics sub-pages** — Full analytics page: summary stats, churn KPIs, monthly growth chart, cumulative growth area chart, churn vs growth composed chart, top agencies breakdown table
- [x] **Platform Churn & Growth Analytics** — MoM churn/growth data with growth rates, net active count
- [x] **System Activity / APM metrics** — P50/P95/P99 latency, error rate, request counts, latency distribution bar chart
- [x] **Server Monitoring** — Database health status, server uptime, memory usage (MB), platform data summary
- [x] **Impersonation / God Mode** — "Log in as Admin" button generates admin JWT, logs IMPERSONATION_START audit event, impersonation banner in UI
- [x] **Master Agency Templates** — Create templates with name, region, newspapers (JSON array), seed on agency creation
- [x] **Global Broadcast / Announcements** — Create/list/delete announcements with audience targeting (all/admins/workers/specific_agency), expiration, active status
- [x] **SaaS Billing Plans** — Create/edit/delete billing plans (name, max_workers, max_customers, price_monthly, billing_cycle), assign plans to agencies
- [x] **Audit Logs viewer** — Paginated, searchable, color-coded audit log table (20 per page)
- [x] **Settings page** — 4 tabs: General settings, Agency Templates, Billing Plans, Admin Management (super admin CRUD)
- [x] **Super Admin user management** — Create/list/delete super admin accounts (cannot delete last one)
- [x] **Audit logging in backend** — Impersonation events logged; middleware tracks APM metrics
- [x] **Backup Management** — Per-agency Google Drive backup management (view files, trigger daily/monthly/yearly backups), Backup All agencies button with per-agency results
- [x] **Full Database Backup & Restore** — Export full DB as JSON or SQL (pure-Python INSERT generator), upload/restore from JSON or SQL files, DB stats dashboard with row counts per table
- [x] **Super Admin Google Drive Backup** — OAuth2 connect/disconnect for SA's own Drive, backup entire DB as JSON to Drive

### Missing
- [ ] **Stripe/Razorpay payment integration** — Billing plans exist but no actual payment processing
- [ ] **Auto-suspension on plan limits** — Plan limits defined but not enforced
- [ ] **Email notifications** — No email sending for any event
- [ ] **Settings persistence** — General settings form exists but values not persisted to DB

---

## 🏢 Admin (`/admin/*`)

### Implemented
- [x] Newspaper — Create + List + Edit + Delete (cascades to subscriptions & stock)
- [x] Worker — Create + List + Edit (username + password reset) + Delete (cascades to assignments)
- [x] Customer — Create + List + Edit + Delete (cascades to subscriptions, assignments, invoices)
- [x] Daily Stock entry (Taken / Returned per newspaper per date, auto-calculated Sold)
- [x] Sidebar navigation with 9 links (Overview, Daily Stock, Newspapers, Workers, Customers, Subscriptions, Assignments, Billing, Backup)
- [x] **Dashboard overview** — 5 KPI cards + 14-day revenue area chart + stock bar chart + revenue breakdown table
- [x] **Daily Revenue calculation** — `Sold × Price` computed in dashboard stats and stock summary
- [x] **Charts / Visualizations** — recharts AreaChart (revenue trend) + BarChart (stock summary)
- [x] **Billing page** — Generate monthly invoices, view invoice list, filter by status, stats cards (total/pending/collected)
- [x] **Payment tracking (Paid / Unpaid)** — Mark invoices as paid, filter pending/paid
- [x] **Delivery Fee configuration** — Set delivery fee per billing generation cycle
- [x] **Customer Subscriptions management** — Full CRUD: assign newspapers to customers with quantity & custom pricing, status toggle (Active/Paused)
- [x] **Worker Route Assignments** — Assign customers to workers with route ordering, grouped-by-worker display
- [x] **Search / Filter in tables** — All entity tables have search/filter
- [x] **Announcement display** — Admin receives platform announcements (all + admin-targeted)
- [x] **Google Drive Backup** — OAuth2 connect/disconnect, manual backup triggers (daily/monthly/yearly), browse backup files, 8 API endpoints

### Missing — Analytics & Reports
- [ ] **Profit / Loss dashboard** — Specified in docs, not built
- [ ] **Stock Reconciliation reports** — Specified in docs, not built
- [ ] **Worker Performance tracking** — No metrics on individual worker output
- [ ] **Daily / Weekly / Monthly report views** — Specified in docs, not built

### Missing — Billing & Finance
- [ ] **Salary management** — No model, API, or UI for worker compensation
- [ ] **Billing deduction for failed deliveries** — Current calc is simple (price × quantity × days + delivery_fee)

### Missing — Subscriptions & Assignments
- [ ] **Customer Types** — Docs specify Daily / Weekly / Monthly / Yearly — not implemented
- [ ] **Pricing grids per agency** — Custom pricing per subscription exists, but no bulk pricing grid UI

### Missing — UX
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
- [x] Offline-first architecture (IndexedDB via Dexie + sync queue)
- [x] Online / Offline indicator
- [x] Background sync when reconnected (batch POST to `/worker/offline-sync`)
- [x] Announcement display — Worker receives platform announcements (all + worker-targeted)

- [x] **i18n (English + Tamil)** — Full bilingual support across all worker pages (sidebar, dashboard, stock entry, customer list)

### Missing
- [ ] **My Sales dashboard** — Docs specify worker sees personal sales metrics
- [ ] **My Salary view** — Docs specify worker sees salary / commission info
- [ ] **Today's Route View** — Docs specify ordered route map — current shows flat unordered list

---

## 🔐 Authentication & Cross-Cutting

### Implemented
- [x] Login with JWT (role-based claims: sub, role, tenant_id)
- [x] Role-based routing (admin / worker / super_admin) with ProtectedRoute component
- [x] Agency registration (creates tenant + admin, optional template seeding)
- [x] Token persistence in localStorage
- [x] TenantMiddleware for data isolation (converts UUID strings, validates tenant_id)
- [x] i18n setup (English + Tamil) — Full coverage across Login, all admin pages, all worker pages (Super Admin is English-only by design)
- [x] **Impersonation support** — AuthContext tracks `impersonating`, `original_user_id`, impersonation banner UI
- [x] **APM metrics collection** — Middleware records latency (ms) and status codes per request
- [x] **Audit logging** — Impersonation events written to audit_logs table

### Missing
- [ ] **Password reset** — No endpoint or UI
- [ ] **Session timeout** — Token set to 30 days, no refresh token mechanism
- [x] **Full i18n coverage** — All admin and worker pages translated (English + Tamil); Super Admin is English-only by design
- [ ] **Comprehensive audit logging** — Only impersonation logged; CRUD operations not writing audit events
- [ ] **PWA Service Worker** — `manifest.json` exists but no actual service worker for true offline caching
- [ ] **Form validation** — Basic alerts only, no inline field-level validation (e.g. react-hook-form)
- [ ] **Error boundaries** — No React error boundaries for crash recovery

---

## 📊 Priority Recommendations

### ~~High Priority (Core Business Value)~~ ✅ ALL DONE
1. ~~Admin Analytics Dashboard — Revenue, sales, stock charts~~ ✅
2. ~~Customer Subscriptions UI — Assign newspapers to customers~~ ✅
3. ~~Worker Route Assignments UI — Assign customers to workers~~ ✅
4. ~~Billing / Invoice generation & viewing~~ ✅
5. ~~Edit / Delete on all entities (newspapers, workers, customers)~~ ✅

### ~~Medium Priority (Super Admin Completeness)~~ ✅ ALL DONE
6. ~~Super Admin sidebar + full dashboard with charts~~ ✅
7. ~~Super Admin analytics (KPI sparklines, Agency Growth chart, Churn, System Activity)~~ ✅
8. ~~Audit log viewer~~ ✅
9. ~~Impersonation mode (God Mode)~~ ✅

### Lower Priority (Polish & Scale) — Partially Done
10. ~~Search / Filter in all tables~~ ✅ (Pagination still missing)
11. ~~i18n across all pages~~ ✅ (full coverage: admin + worker pages in EN + Tamil; Super Admin English-only by design)
12. Salary management
13. PWA service worker
14. Password reset flow

### Remaining Gaps (New Items)
15. Comprehensive audit logging for all CRUD operations
16. Admin P&L / Stock Reconciliation / Worker Performance reports
17. Customer Types (Daily/Weekly/Monthly/Yearly subscription frequency)
18. Stripe/Razorpay payment integration for SaaS billing
19. Worker route-ordered delivery view
20. Error boundaries + form validation polish
21. ~~**Daily Google Drive Backup** — Per-agency Excel export to Google Drive with 3 folders: Daily Updates, Monthly Analysis, Yearly Analysis~~ ✅ (see [gdrive_backup.md](gdrive_backup.md))
