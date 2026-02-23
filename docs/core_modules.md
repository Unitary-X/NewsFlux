# 🧩 NewsFlux: Core Modules & Feature Flow

This document details the essential business modules and the exact page configurations required for the three distinct roles within the NewsFlux platform.

---

## 🧠 Core Modules

### 📰 1. Newspaper Management
- Centralized list of newspapers.
- Multi-language support.
- Admin-controlled base pricing algorithms.

### 📦 2. Stock Management
- Support for daily stock entry.
- Real-time tracking of remaining stock counts.
- Validation layers to prevent over-distribution.

### 👷 3. Worker Management
- Add, update, and remove worker profiles.
- Route assignment (assign specific newspapers to workers).
- Aggregated tracking of individual Worker metrics: `Taken`, `Returned`, and `Sold`.

### 👥 4. Customer Management
- **Customer Types:** Daily, Weekly, Monthly, Yearly.
- Subscription tracking and pause state management.

### 💰 5. Pricing System
- Pricing grids defined entirely by the Agency Admin.
- Pricing can vary significantly per agency.
- Automatic integration with the Sales and Billing calculators.

### 🧾 6. Billing System
- Automated monthly bill generation.
- Delivery charge inclusions (optional per agency).
- State tracking: Paid vs. Unpaid invoices.

### 💸 7. Salary System
- Worker compensation calculations based on delivery count volume and flat commission rates.

### 📊 8. Analytics & Reports
- **Granular Dashboards:** Daily, Weekly, Monthly scopes.
- Worker performance tracking.
- Aggregate agency profit analysis and stock reconciliation reports.

---

## 🚀 Advanced Super Admin Add-ons (Phase 2 Roadmap)
These enterprise features are designated for post-MVP implementation to empower the Platform Owner with deep observability and reduced onboarding friction.

### 🏢 1. Master Agency Templates
- **Purpose:** Fast Agency Provisioning.
- **Functionality:** When provisioning a new agency, the Super Admin can pre-seed their database with the top 20 most popular newspapers and average market prices.
- **Benefit:** Saves new client Admins hours of initial data entry and drastically improves Time-to-Value (TTV).

### 🔒 2. Secure Impersonation (God Mode)
- **Purpose:** Rapid Customer Support & Debugging.
- **Functionality:** A crucial support tool allowing the Super Admin to temporarily log in as an Agency Admin to see exactly what they see on their screen.
- **Security:** All actions taken during impersonation are securely logged in the `audit_logs` specifically tagging the Super Admin.

### 📈 3. Platform Velocity Analytics
- **Purpose:** Advanced SaaS Metrics.
- **Functionality:** Beyond just counting agencies, track Month-over-Month (MoM) growth, overall churn rates, and total aggregate end-customers across the entire platform to measure true product-market fit.

### 📡 4. Live Telemetry & APM
- **Purpose:** Global Health Observability.
- **Functionality:** Integrate real-time health monitoring (tracking Database locks, API 500 errors, and response latency).
- **Benefit:** Allows the Super Admin to proactively fix server issues before agency users notice any performance degradation.

---

## 🚀 Page / Feature Flow Layout

**Authentication & Onboarding:**
1. Login Page
2. Terms & Conditions
3. Welcome / Platform Guide
4. Role-Specific Dashboard

---

### 🏢 Admin Pages (Agency Scope)
- Newspapers
- Stock Entry
- Workers
- Customers
- Billing
- Reports

### 👷 Worker Pages (Personal Scope)
- Today’s Assignment (Route View)
- Stock Entry Form (Taken / Returned Inputs)
- My Sales Dashboard

### 👑 Super Admin Pages (Platform Scope)
- Agency Management (Create/Suspend Entities)
- Global Analytics (Count, Load, Revenue)
- Server Monitoring Logs
