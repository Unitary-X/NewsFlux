# 📊 NewsFlux: System Architecture & Flow Diagrams

This document contains visual representations of the NewsFlux Multi-Tenant SaaS platform, including the database schema, role-based workflows, and daily distribution logic.

---

## 🏗️ 1. Multi-Tenant Architecture (Shared Schema)

The core structure demonstrating how a single backend and database securely handle multiple isolated agencies using a strict `tenant_id` filter.

```mermaid
graph TD
    subgraph NewsFlux Platform
        API[FastAPI Backend + Tenant Middleware]
        DB[(PostgreSQL DB)]
    end

    SA((👑 Super Admin)) -.->|God Mode / All Data| API
    
    subgraph Agency A
        AA((🏢 Admin A)) -->|JWT + tenant_id: A| API
        WA1((👷 Worker A1)) -->|JWT + tenant_id: A| API
    end
    
    subgraph Agency B
        AB((🏢 Admin B)) -->|JWT + tenant_id: B| API
        WB1((👷 Worker B1)) -->|JWT + tenant_id: B| API
    end

    API -->|Filters by tenant_id| DB
    
    classDef superAdmin fill:#6b21a8,stroke:#d8b4fe,stroke-width:2px,color:#fff;
    classDef admin fill:#1d4ed8,stroke:#93c5fd,stroke-width:2px,color:#fff;
    classDef worker fill:#15803d,stroke:#86efac,stroke-width:2px,color:#fff;
    classDef system fill:#334155,stroke:#cbd5e1,stroke-width:2px,color:#fff;
    
    class SA superAdmin;
    class AA,AB admin;
    class WA1,WB1 worker;
    class API,DB system;
```

---

## 🗄️ 2. Core Entity Relationship Diagram (ERD)

A simplified view of the database tables, emphasizing how every major entity is tied to its originating agency.

```mermaid
erDiagram
    AGENCIES ||--o{ USERS : "contains"
    AGENCIES ||--o{ NEWSPAPERS : "manages"
    AGENCIES ||--o{ CUSTOMERS : "serves"
    
    USERS ||--o{ WORKER_ASSIGNMENTS : "performs"
    CUSTOMERS ||--o{ CUSTOMER_SUBSCRIPTIONS : "has"
    NEWSPAPERS ||--o{ CUSTOMER_SUBSCRIPTIONS : "included in"
    NEWSPAPERS ||--o{ DAILY_STOCK : "tracked as"
    
    CUSTOMERS ||--o{ INVOICES : "billed via"
    
    AGENCIES {
        UUID id PK
        string name
    }
    
    USERS {
        UUID id PK
        UUID tenant_id FK
        string role "super_admin, admin, worker"
    }
    
    DAILY_STOCK {
        UUID id PK
        UUID tenant_id FK
        date date
        int taken
        int returned
        int sold "GENERATED (taken - returned)"
    }
```

---

## 🔄 3. Daily Operations Workflow

The day-to-day cycle showing how stock moves from the Admin to the Worker, resulting in calculated sales and analytics.

```mermaid
sequenceDiagram
    participant Admin as 🏢 Admin (System)
    participant Worker as 👷 Worker (App)
    participant Core as ⚙️ System Logic
    participant Data as 📊 Analytics

    Note over Admin, Worker: 🌅 Morning Phase
    Admin->>Core: Set Today's Stock Available
    Worker->>Core: View Assigned Route & Stock
    Worker->>Core: Enter 'Taken' Quantity

    Note over Admin, Worker: 🚴 Distribution Phase
    Worker->>Worker: Offline PWA Usage
    Worker-->>Worker: Deliver Newspapers

    Note over Admin, Worker: 🌇 Evening Phase
    Worker->>Core: Online Sync: Enter 'Returned' Quantity
    
    Note over Core, Data: ⚡ Automated Calculation
    Core->>Core: Calculate: Sold = Taken - Returned
    Core->>Data: Update Daily Revenue (Sold * Price)
    Core->>Data: Decrement Agency Total Stock
    Data-->>Admin: Show Daily Profit/Loss Dashboard
```

---

## 📅 4. Monthly SaaS & Billing Cycle

How the system handles complex monthly operations, protecting both the agency and the platform owner.

```mermaid
stateDiagram-v2
    [*] --> EndOfMonth
    
    state "Monthly Cron Job Starts (1st of Month)" as StartJob
    EndOfMonth --> StartJob
    
    state "Agency Actions" as AgencyTier {
        GenerateCustomerBills: Calc (Price x Status) + DeliveryFee
        GenerateSalaries: Calc (Delivery Count x Commission) -> Worker
        StockReconciliation: Calculate Monthly Wasted Stock
    }
    
    state "Super Admin / Platform Actions" as SATier {
        SaaSCharge: Bill Agency via Stripe ($50/mo)
        PlatformBackup: Central pg_dump execution
    }
    
    StartJob --> AgencyTier
    StartJob --> SATier
    
    AgencyTier --> InvoicesSent
    SATier --> AgencyRenewed
```
