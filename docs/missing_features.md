# NewsFlux: Missing Features & Gap Analysis

Audit date: March 1, 2026

---

## 👑 Super Admin (`/superadmin/*`)

### Implemented
- [x] Agency list (view all tenants)
- [x] Create new agency + admin account
- [x] Suspend / Reactivate agency
- [x] **Sidebar navigation** — Full sidebar with Home, Agencies, Analytics, Audit Logs, System Health, Settings
- [x] **Analytics sub-page** — Platform analytics page with charts
- [x] **KPI Cards** — Dashboard cards for Total Agencies, Active/Suspended counts
- [x] **Audit Logs viewer** — API endpoint + UI for viewing audit logs
- [x] **System Health page** — System monitoring page
- [x] **Settings page** — Configuration UI

### Missing
- [ ] **KPI sparklines** — Trend graphs on KPI cards not yet implemented
- [ ] **Agency Growth bar chart** — Monthly growth visualization (from mockup)
- [ ] **Top Performing agencies leaderboard** — Ranked progress bars per agency
- [ ] **System Activity doughnut chart** — System load ring visualization
- [ ] **Server Monitoring / APM metrics** — P99 latency, error rates, DB health
- [ ] **Impersonation / God Mode** — "Log in as Admin" button to debug agency issues
- [ ] **Master Agency Templates** — Region-based newspaper pre-seeding on agency creation
- [ ] **Global Broadcast / Announcements** — Platform-wide notification system
- [ ] **SaaS Billing Engine** — Tiered plans, Stripe/Razorpay integration, auto-suspension
- [ ] **Platform Churn & Growth Analytics** — MoM growth, churn rate tracking

---

## 🏢 Admin (`/admin/*`)

### Implemented
- [x] Newspaper — Create + List + Edit + Delete
- [x] Worker — Create + List + Edit (username + password reset) + Delete
- [x] Customer — Create + List + Edit + Delete
- [x] Daily Stock entry (Taken / Returned per newspaper per date)
- [x] Sidebar navigation with links (incl. Subscriptions, Assignments, Billing)
- [x] **Dashboard overview** — KPI cards (Newspapers, Workers, Customers, Today's Revenue, Monthly Revenue) + 14-day revenue area chart + stock bar chart + revenue breakdown table
- [x] **Daily Revenue calculation** — `Sold × Price` computed in dashboard stats and stock summary
- [x] **Charts / Visualizations** — recharts AreaChart (revenue trend) + BarChart (stock summary)
- [x] **Billing page** — Generate monthly invoices, view invoice list, filter by status
- [x] **Payment tracking (Paid / Unpaid)** — Mark invoices as paid, filter pending/paid
- [x] **Delivery Fee configuration** — Set delivery fee per billing generation cycle
- [x] **Customer Subscriptions management** — Full CRUD: assign newspapers to customers with quantity & custom pricing, status toggle (Active/Paused)
- [x] **Worker Route Assignments** — Assign customers to workers with route ordering, grouped-by-worker display
- [x] **Search / Filter in tables** — All entity tables (Newspapers, Workers, Customers, Subscriptions, Assignments, Billing) have search/filter

### Missing — Analytics & Reports
- [ ] **Profit / Loss dashboard** — Specified in docs, not built
- [ ] **Stock Reconciliation reports** — Specified in docs, not built
- [ ] **Worker Performance tracking** — No metrics on individual worker output
- [ ] **Daily / Weekly / Monthly report views** — Specified in docs, not built

### Missing — Billing & Finance
- [ ] **Salary management** — Specified in docs — no model, API, or UI for worker compensation

### Missing — Subscriptions & Assignments
- [ ] **Customer Types** — Docs specify Daily / Weekly / Monthly / Yearly — not implemented
- [ ] **Pricing grids per agency** — Custom pricing per customer subscription exists, but no bulk pricing grid UI

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

### ~~High Priority (Core Business Value)~~ ✅ DONE
1. ~~Admin Analytics Dashboard — Revenue, sales, stock charts~~ ✅
2. ~~Customer Subscriptions UI — Assign newspapers to customers~~ ✅
3. ~~Worker Route Assignments UI — Assign customers to workers~~ ✅
4. ~~Billing / Invoice generation & viewing~~ ✅
5. ~~Edit / Delete on all entities (newspapers, workers, customers)~~ ✅

### Medium Priority (Super Admin Completeness) — Partially Done
6. ~~Super Admin sidebar + full dashboard with charts~~ ✅
7. Super Admin analytics (KPI sparklines, Agency Growth chart, System Activity)
8. ~~Audit log viewer~~ ✅
9. Impersonation mode

### Lower Priority (Polish & Scale) — Partially Done
10. ~~Search / Filter in all tables~~ ✅ (Pagination still missing)
11. i18n across all pages
12. Salary management
13. PWA service worker
14. Password reset flow
