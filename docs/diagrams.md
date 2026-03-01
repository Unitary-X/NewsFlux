# 📊 NewsFlux: System Architecture & Flow Diagrams

Visual representations of the NewsFlux Multi-Tenant SaaS platform architecture, database schema, and operational workflows.

---

## 🏗️ 1. Multi-Tenant Architecture (Shared Schema)

Single backend and SQLite database securely handling multiple isolated agencies via `tenant_id` filtering in TenantMiddleware.

```mermaid
graph TD
    subgraph NewsFlux Platform
        API[FastAPI Backend + TenantMiddleware]
        DB[(SQLite Database)]
        Celery[Celery + Redis]
    end

    SA((👑 Super Admin)) -.->|JWT tenant_id: null| API
    
    subgraph Agency A
        AA((🏢 Admin A)) -->|JWT tenant_id: A| API
        WA1((👷 Worker A1)) -->|JWT tenant_id: A| API
        WA1 -.->|Offline Queue| IDB1[IndexedDB]
    end
    
    subgraph Agency B
        AB((🏢 Admin B)) -->|JWT tenant_id: B| API
        WB1((👷 Worker B1)) -->|JWT tenant_id: B| API
    end

    API -->|Filters by tenant_id| DB
    API -->|Background jobs| Celery
    AA -.->|OAuth2| GD[Google Drive]
    
    classDef superAdmin fill:#6b21a8,stroke:#d8b4fe,stroke-width:2px,color:#fff;
    classDef admin fill:#1d4ed8,stroke:#93c5fd,stroke-width:2px,color:#fff;
    classDef worker fill:#15803d,stroke:#86efac,stroke-width:2px,color:#fff;
    classDef system fill:#334155,stroke:#cbd5e1,stroke-width:2px,color:#fff;
    classDef storage fill:#b45309,stroke:#fbbf24,stroke-width:2px,color:#fff;
    
    class SA superAdmin;
    class AA,AB admin;
    class WA1,WB1 worker;
    class API,DB,Celery system;
    class IDB1,GD storage;
```

---

## 🗄️ 2. Entity Relationship Diagram (12 Tables)

Complete ERD showing all implemented tables and their relationships.

```mermaid
erDiagram
    AGENCIES ||--o{ USERS : "contains"
    AGENCIES ||--o{ NEWSPAPERS : "manages"
    AGENCIES ||--o{ CUSTOMERS : "serves"
    AGENCIES ||--o{ DAILY_STOCK : "tracks"
    AGENCIES ||--o{ WORKER_ASSIGNMENTS : "routes"
    AGENCIES ||--o{ INVOICES : "bills"
    AGENCIES ||--o{ AUDIT_LOGS : "logs"
    AGENCIES ||--o{ CUSTOMER_SUBSCRIPTIONS : "subscriptions"
    AGENCIES }o--|| BILLING_PLANS : "subscribed to"
    
    USERS ||--o{ WORKER_ASSIGNMENTS : "assigned"
    USERS ||--o{ AUDIT_LOGS : "performed by"
    CUSTOMERS ||--o{ CUSTOMER_SUBSCRIPTIONS : "has"
    CUSTOMERS ||--o{ WORKER_ASSIGNMENTS : "delivered to"
    CUSTOMERS ||--o{ INVOICES : "billed via"
    NEWSPAPERS ||--o{ CUSTOMER_SUBSCRIPTIONS : "included in"
    NEWSPAPERS ||--o{ DAILY_STOCK : "tracked as"
    
    ANNOUNCEMENTS }o--o| AGENCIES : "targets"
    
    AGENCIES {
        UUID id PK
        string name
        string status "active/suspended"
        UUID billing_plan_id FK
        text gdrive_refresh_token "encrypted"
        string gdrive_folder_id
        datetime gdrive_connected_at
    }
    
    USERS {
        UUID id PK
        UUID tenant_id FK "nullable for super_admin"
        string role "super_admin/admin/worker"
        string username "unique"
        string password_hash
    }
    
    NEWSPAPERS {
        UUID id PK
        UUID tenant_id FK
        string name
        decimal base_price
    }
    
    CUSTOMERS {
        UUID id PK
        UUID tenant_id FK
        string name
        string address
        string phone
    }
    
    CUSTOMER_SUBSCRIPTIONS {
        UUID id PK
        UUID tenant_id FK
        UUID customer_id FK
        UUID newspaper_id FK
        int quantity
        decimal price "override"
        int status "1=active 0=paused"
    }
    
    DAILY_STOCK {
        UUID id PK
        UUID tenant_id FK
        date date
        UUID newspaper_id FK
        int taken
        int returned
        int sold "COMPUTED taken-returned"
    }
    
    WORKER_ASSIGNMENTS {
        UUID id PK
        UUID tenant_id FK
        UUID worker_id FK
        UUID customer_id FK
        int route_order
    }
    
    INVOICES {
        UUID id PK
        UUID tenant_id FK
        UUID customer_id FK
        int month
        int year
        decimal total_amount
        decimal delivery_fee
        string status "pending/paid"
    }
    
    AUDIT_LOGS {
        UUID id PK
        UUID tenant_id FK
        UUID user_id FK
        string action
        string target_table
        json changes
        datetime timestamp
    }
    
    BILLING_PLANS {
        UUID id PK
        string name "Basic/Pro/Enterprise"
        int max_workers
        int max_customers
        decimal price_monthly
        string billing_cycle
    }
    
    AGENCY_TEMPLATES {
        UUID id PK
        string name
        string region
        json newspapers "array of name+price"
    }
    
    ANNOUNCEMENTS {
        UUID id PK
        string title
        text message
        string target_audience "all/admins/workers"
        UUID target_agency_id FK
        bool is_active
        datetime expires_at
    }
```

---

## 🔄 3. Daily Operations Workflow

Day-to-day cycle: stock entry → distribution → sync → calculation.

```mermaid
sequenceDiagram
    participant Admin as 🏢 Admin
    participant API as ⚙️ FastAPI
    participant Worker as 👷 Worker PWA
    participant IDB as 📱 IndexedDB
    participant DB as 🗄️ SQLite

    Note over Admin, DB: 🌅 Morning Phase
    Admin->>API: POST /admin/stock (taken per newspaper)
    API->>DB: Insert daily_stock record
    
    Worker->>API: GET /worker/assignments
    API->>DB: Query assignments by worker_id + tenant_id
    API-->>Worker: Customer list with route order

    Note over Worker, IDB: 🚴 Distribution Phase (Possibly Offline)
    Worker->>IDB: Cache delivery updates locally
    Worker->>Worker: Deliver newspapers on route

    Note over Worker, DB: 🌇 Evening Phase
    Worker->>IDB: Enter returned quantities
    IDB-->>API: POST /worker/offline-sync (auto when online)
    API->>DB: Process batch updates
    
    Note over API, DB: ⚡ Automated
    DB->>DB: sold = taken - returned (computed)
    API-->>Admin: Dashboard stats updated
```

---

## 📅 4. Monthly Billing Cycle

```mermaid
sequenceDiagram
    participant Admin as 🏢 Admin
    participant API as ⚙️ FastAPI
    participant DB as 🗄️ SQLite

    Admin->>API: POST /admin/billing/generate
    API->>DB: Query active subscriptions for month
    
    loop For each customer
        API->>API: Calculate TotalBill = Σ(Price × Qty × Days) + DeliveryFee
        API->>DB: Insert invoice (status: pending)
    end
    
    API-->>Admin: Invoices generated
    Admin->>API: GET /admin/invoices
    API-->>Admin: List of pending/paid invoices
    
    Admin->>API: PUT /admin/invoices/{id}/pay
    API->>DB: Update status to "paid"
```

---

## 💾 5. Google Drive Backup Flow

```mermaid
sequenceDiagram
    participant Admin as 🏢 Admin
    participant API as ⚙️ FastAPI
    participant GD as 📁 Google Drive

    Note over Admin, GD: One-time Setup
    Admin->>API: GET /admin/backup/google/connect
    API-->>Admin: Redirect to Google OAuth consent
    Admin->>API: GET /admin/backup/google/callback (auth code)
    API->>API: Exchange code for refresh_token
    API->>API: Encrypt token with Fernet
    API->>API: Store encrypted token in agencies table

    Note over Admin, GD: Trigger Backup
    Admin->>API: POST /admin/backup/trigger
    API->>API: Generate Excel via openpyxl
    API->>GD: Upload Excel to admin's Drive folder
    GD-->>API: File ID confirmation
    API-->>Admin: Backup complete

    Note over Admin, GD: Browse Backups
    Admin->>API: GET /admin/backup/files/{subfolder}
    API->>GD: List files in subfolder
    GD-->>API: File list
    API-->>Admin: Display backup files
```

---

## 🔐 6. Authentication & Role Routing

```mermaid
flowchart TD
    Login["/login page"] --> Submit["POST /auth/login"]
    Submit --> JWT["JWT returned with role + tenant_id"]
    
    JWT --> Check{role?}
    Check -->|super_admin| SA["/superadmin/dashboard"]
    Check -->|admin| AD["/admin/dashboard"]
    Check -->|worker| WK["/worker/dashboard"]
    
    SA --> SA_Pages["7 pages: Agencies, Analytics, Announcements, AuditLogs, SystemHealth, Settings"]
    AD --> AD_Pages["9 pages: Stock, Newspapers, Workers, Customers, Subscriptions, Assignments, Billing, Backup"]
    WK --> WK_Pages["1 page: Assignments + Offline Sync"]
```

---

## 🛡️ 7. Tenant Isolation Flow

```mermaid
flowchart LR
    Request["HTTP Request"] --> MW["TenantMiddleware"]
    MW --> Open{"Open route?"}
    Open -->|Yes| Pass["Skip auth"]
    Open -->|No| Decode["Decode JWT"]
    Decode --> Extract["Extract tenant_id, role, user_id"]
    Extract --> Inject["Inject into request.state"]
    Inject --> RoleCheck{"Has tenant_id OR super_admin?"}
    RoleCheck -->|No| Reject["403: Tenant ID required"]
    RoleCheck -->|Yes| Handler["Route Handler"]
    Handler --> Query["DB query filtered by tenant_id"]
```