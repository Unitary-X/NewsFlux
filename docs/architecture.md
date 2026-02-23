# NewsFlux: Multi-Tenant SaaS Architecture Plan

A comprehensive, production-ready architectural plan for **NewsFlux**, designed for massive scalability, strict tenant isolation, and offline capabilities.

---

## 1. 🗄️ Database Schema (PostgreSQL)

We will use a **Shared-Schema Multi-Tenant Architecture**. Every tenant-specific table will include a `tenant_id` foreign key.

```sql
-- Core Tenants
CREATE TABLE agencies (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP,
    status VARCHAR(50) -- active, suspended
);

-- Users (RBAC)
CREATE TABLE users (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES agencies(id), -- Nullable ONLY for Super Admin
    role VARCHAR(20), -- super_admin, admin, worker
    username VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255)
);

-- Products
CREATE TABLE newspapers (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES agencies(id),
    name VARCHAR(100),
    base_price DECIMAL(10, 2)
);

-- Customers & Routing
CREATE TABLE customers (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES agencies(id),
    name VARCHAR(100),
    address TEXT,
    phone VARCHAR(20)
);

CREATE TABLE customer_subscriptions (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES agencies(id),
    customer_id UUID REFERENCES customers(id),
    newspaper_id UUID REFERENCES newspapers(id),
    quantity INT,
    price DECIMAL(10, 2), -- Overrides base_price if needed
    status INT -- 1 = active, 0 = paused
);

-- Daily Operations & Inventory
CREATE TABLE daily_stock (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES agencies(id),
    date DATE,
    newspaper_id UUID REFERENCES newspapers(id),
    taken INT,
    returned INT,
    sold INT GENERATED ALWAYS AS (taken - returned) STORED
);

CREATE TABLE worker_assignments (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES agencies(id),
    worker_id UUID REFERENCES users(id),
    customer_id UUID REFERENCES customers(id),
    route_order INT
);

-- Billing
CREATE TABLE invoices (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES agencies(id),
    customer_id UUID REFERENCES customers(id),
    month INT,
    year INT,
    total_amount DECIMAL(10, 2),
    delivery_fee DECIMAL(10, 2),
    status VARCHAR(20) -- pending, paid
);

-- Security & Audit
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES agencies(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100), -- e.g., "PRICE_UPDATE", "STOCK_EDIT"
    target_table VARCHAR(50),
    changes JSONB,
    timestamp TIMESTAMP
);
```

---

## 2. ⚙️ Backend API Structure (FastAPI)

- **Middleware Layer:**
  - `TenantMiddleware`: Intercepts every incoming request, decodes the JWT, extracts the `tenant_id`, and safely injects it into the request state (`request.state.tenant_id`) ensuring the developer doesn't have to manually pass it to every query.
- **Dependency Injection:**
  - `get_db(tenant_id)`
  - `get_current_user`
  - `require_role(allowed_roles=["admin"])`
- **Core Modules:**
  - `AuthModule`: Login, Registration, JWT generation.
  - `StockModule`: Daily entry, adjustments.
  - `BillingModule`: Monthly calculation formula triggers.
  - `SyncModule`: Batch API for offline worker PWA.
- **Background Jobs (Celery / APScheduler):**
  - **Billing Cron:** Runs at the end of the month to calculate `TotalBill = Σ (Price_d × Status_d) + DeliveryFee`.
  - **Backup Cron:** Triggers daily at 2:00 AM. Generates SQL dumps for the `pg_dump` worker and executes CSV packaging for specific agencies via the Google Drive API.

---

## 3. 💻 Frontend Component Structure (React)

A **Unified Single Page Application (SPA)** using React (Vite). Instead of separate apps, a central authentication gateway routes users to their respective dashboards based on their JWT role.

1. **Central Login Portal:**
   - A single `/login` route. Upon successful authentication, the backend determines the user's role (`super_admin`, `admin`, or `worker`), and the React Router dynamically redirects them to the correct interface.

2. **Worker Interface (`/worker/*`):**
   - Mobile First, Offline Support via PWA.
   - `components/StepperInput.tsx` (Large `[-] [10] [+]` buttons targeting 48px+ touch targets).
   - *Logic*: Uses `IndexedDB` (via Dexie.js or React Query) to cache offline updates. Service workers manage background syncing when `navigator.onLine` turns true.

3. **Admin Interface (`/admin/*`):**
   - Desktop Ledger UI.
   - `components/StockTable.tsx` (DataGrid style, dense ledger readability).
   - *Logic*: High contrast, dense information architecture optimized for fast keyboard data entry.

4. **Super Admin Interface (`/superadmin/*`):**
   - Dark Futuristic "Antigravity" UI.
   - `components/NeonMetricsCard.tsx` (Glassmorphism layout with blur backdrops).
   - *Logic*: Immersive dashboards for global telemetry and agency monitoring.

---

## 4. 📁 Project Documentation References

The platform's logical specifications, roles, and UI requirements have been separated into detailed documents:

1. [Roles & Permissions (RBAC Logic)](file:///c:/Users/harik/OneDrive/Desktop/Git/newspaper-boy/docs/roles_and_permissions.md)
2. [End-to-End System Flow](file:///c:/Users/harik/OneDrive/Desktop/Git/newspaper-boy/docs/system_flow.md)
3. [Core Modules & UI Page Flow](file:///c:/Users/harik/OneDrive/Desktop/Git/newspaper-boy/docs/core_modules.md)
4. [Super Admin Antigravity UI Specification](file:///c:/Users/harik/OneDrive/Desktop/Git/newspaper-boy/docs/super%20admin%20frontend%20.md)
5. [System Architecture & Flow Diagrams](file:///c:/Users/harik/OneDrive/Desktop/Git/newspaper-boy/docs/diagrams.md)
6. [Deployment Strategy Analysis](file:///c:/Users/harik/OneDrive/Desktop/Git/newspaper-boy/docs/deployment_strategy.md)
7. [TrueNAS Hardware Assessment](file:///c:/Users/harik/OneDrive/Desktop/Git/newspaper-boy/docs/own_server.md)
8. [Suggested General Add-ons (Phase 2)](file:///c:/Users/harik/OneDrive/Desktop/Git/newspaper-boy/docs/suggested_features.md)
9. [Super Admin Add-ons (Phase 2)](file:///c:/Users/harik/OneDrive/Desktop/Git/newspaper-boy/docs/superadmin_addons.md)

---

## 5. 📁 Project Folder Structure

```text
newsflux-monorepo/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── api/              # API Routers (Auth, Stock, Admin)
│   │   ├── core/             # JWT, Config, TenantMiddleware
│   │   ├── db/               # SQLAlchemy Models, Alembic Migrations
│   │   ├── schemas/          # Pydantic Schemas for Validation
│   │   ├── services/         # Business Logic (Billing Formulas, Sync Logic)
│   │   ├── tasks/            # Celery Jobs (Backups, Invoices)
│   │   └── main.py           # Application Entry Point
│   ├── tests/
│   └── requirements.txt
├── frontend/                 # Unified React SPA (Vite)
│   ├── src/
│   │   ├── features/         # Feature-based architecture
│   │   │   ├── auth/         # Central Login & Role Router
│   │   │   ├── worker/       # PWA Mobile UI Routes
│   │   │   ├── admin/        # Ledger Desktop Routes
│   │   │   └── superadmin/   # Antigravity Dashboard Routes
│   │   ├── components/       # Shared UI Library
│   │   └── App.jsx           # Main Router Hub
│   └── package.json
└── infrastructure/           # Docker-compose, k8s manifests, Nginx
```
---
## 6. 🔌 Sample Critical Endpoints

### 1. Worker Offline Sync (Batch Update API)
*Purpose*: Takes an array of actions queued while offline, resolving conflicts using client-side timestamps.
```http
POST /api/v1/worker/offline-sync
Authorization: Bearer <jwt_worker_token>

{
  "stock_updates": [
    { "newspaper_id": "uuid", "taken": 100, "returned": 2, "timestamp": "1677100000" }
  ],
  "delivery_updates": [
    { "customer_id": "uuid", "status": 1, "timestamp": "1677105000" }
  ]
}
```

### 2. Billing Calculation Trigger (Admin)
*Purpose*: Queues a background job to process monthly statements without blocking the UI.
```http
POST /api/v1/billing/calculate
Authorization: Bearer <jwt_admin_token>

{
  "month": 2,
  "year": 2026
}
```
*Returns*: `{"job_id": "uuid", "status": "processing"}` (Frontend polls this ID for a loading bar).

---

## 7. 🔥 Best Practices & Bulletproof Security

1. **Row Level Security (RLS)**
   - Do not rely solely on the application layer to filter `tenant_id`. Implement PostgreSQL RLS as a secondary defense layer so the database physically prevents cross-tenant data leaks even if an API route forgets the `where(tenant_id=X)` clause.
2. **Offline-First Foreign Keys (UUIDv4)**
   - Use UUIDs instead of auto-incrementing integers. This allows the Worker PWA to generate IDs locally while offline and safely push them to the DB later without ID conflicts.
3. **Immutable History for Billing**
   - Because billing is based on historical daily prices, if an Admin changes the price of a newspaper on the 15th, previous deliveries must remain at the old price. Create a specific `daily_pricing_snapshots` table or structure the queries to rely strictly on the `audit_logs` historical prices.
4. **Google Drive Integration Strategy**
   - Use OAuth 2.0 User Consent flow for individual Agencies (so CSVs save directly to the agency owner's personal Drive).
   - Use a Google Service Account for the Super Admin full DB pg_dump.

---

## 8. 🚀 Phase 2 Architecture (Super Admin Add-ons)

To support long-term scalability and SaaS monetization, the following architecture extensions are planned for Phase 2:

1. **Automated SaaS Billing Engine:** Integration with Stripe/Razorpay via webhooks to automate tenant subscription tiers and auto-suspend inactive accounts.
2. **Global Telemetry & APM:** Integration with cloud-hosted Sentry/Datadog to monitor P99 latency, 500-error spikes, and database connection pooling.
3. **Master Agency Pre-Seeding:** Automated database seeding during tenant provisioning to populate the top 20 regional newspapers instantly.
4. **Secure Tenant Impersonation (God Mode):** A stateless JWT override mechanism enabling Super Admins to view the platform as an Agency Admin, safeguarded by strict `audit_logs` tracking.
5. **Platform Analytics Engine:** Centralized views aggregating active vs. churned agencies and total end-customers across the shared schema.
