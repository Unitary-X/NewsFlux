# 📰 NewsFlux

[![NewsFlux Banner](https://via.placeholder.com/1200x300.png?text=NewsFlux+-+Multi-Tenant+SaaS+Platform)](#)

**NewsFlux** is a production-ready, highly scalable Multi-Tenant B2B SaaS system engineered perfectly for the newspaper distribution industry.

It provides completely isolated environments for newspaper distribution agencies, strict role-based access control, complex daily billing logic, and true offline-first capabilities for distribution workers.

---

## 🚀 Why NewsFlux? (The Business Value)

Newspaper distribution is historically bound to pen, paper, and manual ledger calculations, leading to wasted stock, skipped deliveries, and massive bad debt at the end of the month. 

**NewsFlux solves this by:**
1. **Automating the math:** Instantly calculating `Sold = Taken - Returned` every day.
2. **Preventing Bad Debt:** Customers can pause their own subscriptions or utilize pre-paid ledger wallets, ensuring the algorithm only bills for delivered days.
3. **True Offline Capabilities:** Workers often deliver in underground complexes or rural areas without 5G. The Progressive Web App (PWA) operates entirely offline and synchronizes via a Batch API once connected.

---

## 🏢 Platform Ecosystem (Unified SPA)

NewsFlux runs on a strict **Shared-Schema Multi-Tenant** architecture. Instead of separate login pages or distinct apps, users access a **single centralized login portal**. Upon authentication, the React Router automatically redirects the user to their respective interface based on their role:

- **👑 Super Admin Workspace:** An immersive dark-mode glassmorphism UI for the Platform Owner. Features global APM telemetry, SaaS Stripe billing integration, SaaS churn analytics, and secure tenant impersonation (God Mode) for rapid bug fixing. *(See [Super Admin UI Spec](docs/super%20admin%20frontend%20.md))*
- **🏢 Admin Dashboard:** A high-contrast, dense desktop ledger interface optimized for data entry, worker management, and pricing controls—supporting dual-language tags (e.g., English stacked with Tamil).
- **👷 Worker PWA:** Mobile-first, fully offline-capable React app with synchronization queues. Designed with huge 48px+ touch targets and stepper inputs (`[-] [10] [+]`) for robust on-the-go data entry while riding a bike or walking.

---

## 🎯 Core Business Logic & Formulas

The platform automates the intense daily and monthly mathematical operations securely on the backend:

1. **Daily Sales Calculation:**
   > `Sold = Taken - Returned`
   Calculated dynamically via PostgreSQL generated columns and backend trigger operations to prevent client-side manipulation.

2. **Daily Revenue Calculation:**
   > `Income = Sold × Price`

3. **Monthly Billing Aggregation:**
   > `TotalBill = Σ (Price_d × Status_d) + DeliveryFee`
   Where `Status_d` = 1 if delivered, 0 if the customer paused delivery for that specific day. 

---

## 🔐 Strict Role-Based Access Control (RBAC)

NewsFlux enforces rigorous security protocols ensuring **tenant_id** filtering bounds every operation. 

- [View the full Roles & Permissions Documentation](docs/roles_and_permissions.md)

---

## 🏗️ Technical Architecture (MANDATORY Tech Stack)

### **Backend Ecosystem**
- **Language/Framework:** Python 3.11+ / FastAPI
- **Database:** PostgreSQL 15+ (Using Shared-Schema Multi-Tenancy backed by RLS)
- **Authentication:** JWT-based stateless authentication
- **Background Workers:** Celery / APScheduler
- **Automated Backups:** Daily CSV Google Drive exports via OAuth & full `pg_dump` securely shipped to cloud buckets.

### **Frontend Ecosystem**
- **Library:** React.js (Monorepo architecture using Nx / Turborepo)
- **Desktop Dashboards:** Dense DataGrids, Chart.js / Recharts for analytics
- **Worker PWA:** IndexedDB / React Query, Service Workers for background syncing

---

## 📚 System Documentation & Blueprints

All logical specifications, UI requirements, and system flows have been broken down into official documentation:

1. 🏗️ **[Master System Architecture](docs/architecture.md)**
2. 📊 **[System Architecture & Flow Diagrams](docs/diagrams.md)**
3. 🔄 **[End-to-End System Flow](docs/system_flow.md)**
4. 🧩 **[Core Modules & UI Page Flow](docs/core_modules.md)**
5. 🛡️ **[Roles & Permissions (RBAC Logic)](docs/roles_and_permissions.md)**
6. 🌌 **[Super Admin Antigravity UI Specification](docs/super%20admin%20frontend%20.md)**
7. 🚀 **[Suggested General Add-ons (Phase 2)](docs/suggested_features.md)**
8. � **[Super Admin Add-ons (Phase 2)](docs/superadmin_addons.md)**
9. �🐋 **[Deployment Strategy Analysis](docs/deployment_strategy.md)**
10. 🖥️ **[TrueNAS Hardware Assessment](docs/own_server.md)**

---

## ⚡ Key Architectural Mechanisms

1. **Strict Tenant Middleware:** Every FastAPI request intercepts the JWT, extracts the `tenant_id`, and acts as a dependency injector blocking access to un-owned records.
2. **Offline Sync API (Batch Resolution):** Workers syncing after going through offline zones send batch updates. The API resolves conflicts utilizing client-side timestamps.
3. **Asynchronous Billing Cron:** Runs a heavy aggregation cron monthly, generating invoices via background workers tools to prevent API locking.
4. **Immutable Audit Logging:** Tracks every critical modification, including price updates, stock edits, and user creations.

---

## 📁 Repository Structure

```text
newsflux/
├── docs/
│   ├── architecture.md           # Master DB Schema and API Logic
│   ├── core_modules.md           # Business Logic Definitions
│   ├── deployment_strategy.md    # Docker vs Alternatives Analysis
│   ├── diagrams.md               # Mermaid Visual Configurations
│   ├── own_server.md             # TrueNAS Bare-Metal Hardware Assessment
│   ├── roles_and_permissions.md  # RBAC Constraints
│   ├── suggested_features.md     # Phase 2 General Enterprise Up-sells
│   ├── super admin frontend .md  # Floating Antigravity UI Design Rules
│   ├── superadmin_addons.md      # Super Admin specific features
│   └── system_flow.md            # Daily / Monthly Operations
├── backend/                      # FastAPI Application Workspace
│   ├── app/
│   │   ├── api/
│   │   ├── core/                 # TenantMiddleware, Auth, JWT Config
│   │   ├── db/                   # SQLAlchemy ORM, Alembic Migrations
│   │   └── services/             # Formula engines, Offline Sync algorithms
├── frontend/                     # Unified React SPA (Vite)
│   ├── src/
│   │   ├── features/             # Feature-based routes (Auth, Admin, Worker)
│   │   ├── components/           # Shared UI Library
│   │   └── App.jsx               # Main Router Hub
└── infrastructure/               # Dockerization, Nginx, deployment scripts
```

---

## 🚦 Getting Started (Local Development)

*(Coming Soon upon Release Candidate 1)*

### Prerequisites
- Docker and Docker Compose
- PostgreSQL 15+
- Node.js (Latest LTS)
- Python 3.11+

### Installation 
```bash
# Clone the repository
git clone https://github.com/your-username/newsflux.git

# CD into the directory
cd newsflux

# Initialize the environment via Docker Compose
docker-compose up -d
```

---

## 🚀 Non-Functional Requirements (NFRs) Met
- ✅ Highly Scalable Architecture
- ✅ Secure API endpoints (Preventing IDORs and Tenant Bleeding)
- ✅ Lightning fast P99 response times (Sub 100ms API resolutions)
- ✅ Mobile-first resilient offline capabilities
- ✅ Clean, highly logical, and modular codebase.

---

## 🛡️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
