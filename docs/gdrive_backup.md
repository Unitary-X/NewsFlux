# Google Drive Backup — Implementation Plan

## Overview

Two backup modes depending on user role:

| Mode | Who | Auth Method | Where Backups Go |
|------|-----|------------|-----------------|
| **Central Backup** | Super Admin | Service Account (JSON key) | Super Admin's Google Drive |
| **Agency Backup** | Agency Admin | Google OAuth (Sign in with Google) | Admin's own Google Drive |

Each agency gets Excel file backups organized into 3 folders:

```
NewsFlux Backups/
└── {Agency Name}/
    ├── Daily Updates/
    │   ├── 2026-03-01_daily_stock.xlsx
    │   ├── 2026-03-01_deliveries.xlsx
    │   └── ...
    ├── Monthly Analysis/
    │   ├── 2026-02_revenue_report.xlsx
    │   ├── 2026-02_subscription_summary.xlsx
    │   ├── 2026-02_invoice_report.xlsx
    │   └── ...
    └── Yearly Analysis/
        ├── 2025_annual_report.xlsx
        ├── 2025_customer_growth.xlsx
        └── ...
```

---

## Folder Contents

### 📅 Daily Updates (runs every day)
| File | Sheets / Content |
|------|-----------------|
| `{date}_daily_stock.xlsx` | Per-newspaper: Taken, Returned, Sold, Revenue |
| `{date}_deliveries.xlsx` | Per-worker: Customers delivered, pending, route info |

### 📊 Monthly Analysis (runs on 1st of each month)
| File | Sheets / Content |
|------|-----------------|
| `{month}_revenue_report.xlsx` | Daily revenue breakdown, totals, averages, trends |
| `{month}_subscription_summary.xlsx` | Active/paused subscriptions, customer × newspaper matrix |
| `{month}_invoice_report.xlsx` | All invoices: customer, amount, delivery_fee, paid/pending status |
| `{month}_worker_performance.xlsx` | Per-worker: deliveries completed, customers served, route efficiency |

### 📈 Yearly Analysis (runs on Jan 1st)
| File | Sheets / Content |
|------|-----------------|
| `{year}_annual_report.xlsx` | Monthly revenue trend, total P&L, customer/worker growth |
| `{year}_customer_growth.xlsx` | New customers per month, churn, retention rate |
| `{year}_subscription_trends.xlsx` | Newspaper popularity, subscription changes over time |

---

## Technical Architecture

### Backend Components

```
backend/
├── app/
│   └── services/
│       ├── gdrive_service.py      # Google Drive API wrapper (both OAuth + Service Account)
│       ├── excel_export.py        # openpyxl Excel generation
│       └── backup_scheduler.py    # Celery Beat tasks
│   └── api/v1/
│       └── admin.py               # OAuth callback + backup endpoints
```

### How It Works

1. **Celery Beat** triggers backup tasks on schedule:
   - Daily: `export_daily_backup` at 11:59 PM
   - Monthly: `export_monthly_analysis` on 1st of month
   - Yearly: `export_yearly_analysis` on Jan 1st

2. **Excel Export Service** (`openpyxl`) queries the DB per agency and generates `.xlsx` files with formatted sheets, headers, and auto-column-widths

3. **Google Drive Service** (`google-api-python-client`):
   - **Super Admin path:** Authenticates via Service Account JSON key → uploads to central Drive
   - **Agency Admin path:** Authenticates via stored OAuth refresh token → uploads to admin's own Drive
   - Creates folder structure if not exists: `NewsFlux Backups/{Agency Name}/{Daily|Monthly|Yearly}`
   - Uploads Excel files to the correct folder

4. **API Endpoints** for manual control:
   - `GET /admin/backup/google/connect` — Redirects admin to Google OAuth consent screen
   - `GET /admin/backup/google/callback` — Handles OAuth callback, stores refresh token
   - `GET /admin/backup/google/status` — Check if Google Drive is connected
   - `DELETE /admin/backup/google/disconnect` — Remove stored Google credentials
   - `POST /admin/backup/trigger` — Manual daily backup trigger
   - `GET /admin/backup/history` — List past backups with Drive links
   - `POST /superadmin/backup/trigger-all` — Trigger backup for all agencies (uses service account)

### Dependencies (added to requirements.txt)
```
openpyxl>=3.1.0
google-api-python-client>=2.100.0
google-auth>=2.23.0
google-auth-oauthlib>=1.1.0
```

---

## Agency Admin Flow (OAuth — Easy Way)

### How the Admin Experiences It

1. Admin goes to **Settings** or **Backup** page in the dashboard
2. Clicks **"Connect Google Drive"** button
3. Google login popup appears → admin signs in with their Google account
4. Clicks **"Allow"** to grant Drive file access
5. Done! Backups now automatically go to their personal Google Drive
6. Admin can click **"Backup Now"** anytime for a manual export
7. Admin can **"Disconnect"** at any time to revoke access

### What Happens Behind the Scenes

```
Admin clicks "Connect"
    → Frontend opens: /api/v1/admin/backup/google/connect
    → Backend redirects to Google OAuth consent URL
    → Admin logs into Google, clicks Allow
    → Google redirects back to: /api/v1/admin/backup/google/callback?code=AUTH_CODE
    → Backend exchanges auth code for access_token + refresh_token
    → refresh_token is encrypted and stored in DB (Agency.gdrive_refresh_token)
    → Admin is redirected back to dashboard with success message
```

For scheduled backups, the backend uses the stored **refresh token** to get a fresh access token — no user interaction needed. Tokens auto-renew indefinitely as long as the admin doesn't revoke access.

### Database Change

Add to `Agency` model:
```python
gdrive_refresh_token = Column(String, nullable=True)   # Encrypted OAuth refresh token
gdrive_folder_id = Column(String, nullable=True)        # Root backup folder ID in admin's Drive
gdrive_connected_at = Column(DateTime, nullable=True)   # When Drive was connected
```

---

## Google API Setup

### One-Time Setup (You do this once for the whole platform)

#### 1. Create a Google Cloud Project
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Click **"New Project"** → Name it `newsflux-backups` → Create

#### 2. Enable Google Drive API
- In the project, go to **APIs & Services → Library**
- Search for **"Google Drive API"** → Click **Enable**

#### 3. Create OAuth Client ID (for Agency Admins)
- Go to **APIs & Services → Credentials**
- Click **"Create Credentials" → "OAuth client ID"**
- Application type: **Web application**
- Name: `NewsFlux Backup`
- Authorized redirect URIs: `https://yourdomain.com/api/v1/admin/backup/google/callback` (and `http://localhost:8000/api/v1/admin/backup/google/callback` for dev)
- Click **Create** → Copy the **Client ID** and **Client Secret**

#### 4. Configure OAuth Consent Screen
- Go to **APIs & Services → OAuth consent screen**
- User Type: **External**
- App name: `NewsFlux`
- Scopes: Add `https://www.googleapis.com/auth/drive.file` (only access files created by the app)
- Save

#### 5. (Optional) Create Service Account for Super Admin
- Only needed if super admin wants centralized backups
- Go to **Credentials → Create Credentials → Service Account**
- Download JSON key → place at `backend/gdrive_credentials.json`

#### 6. Add Environment Variables
```env
# OAuth (for agency admins — required)
GOOGLE_CLIENT_ID=your_oauth_client_id
GOOGLE_CLIENT_SECRET=your_oauth_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/admin/backup/google/callback

# Service Account (for super admin — optional)
GDRIVE_CREDENTIALS_PATH=gdrive_credentials.json
GDRIVE_ROOT_FOLDER_ID=your_folder_id_here

# Feature flag
GDRIVE_ENABLED=true
```

---

## Comparison: OAuth vs Service Account

| | OAuth (Agency Admin) | Service Account (Super Admin) |
|---|---|---|
| **Setup difficulty** | Easy — admin just clicks "Sign in with Google" | Harder — needs JSON key file + folder sharing |
| **Where files go** | Admin's own Google Drive | Central platform Drive |
| **Who controls data** | The agency admin | The super admin |
| **Needs JSON key?** | No | Yes |
| **Admin can browse files?** | Yes, in their own Drive | Only if folder is shared with them |
| **Best for** | Self-service per agency | Platform-wide centralized backup |

---

## Cost

**Free.** Google Drive API has generous limits:
- 15 GB free storage per Google account
- 1 billion API calls/day quota (effectively unlimited)
- No per-call charges

For a newspaper agency SaaS, daily Excel files are tiny (< 100 KB each). Even with 100 agencies, yearly storage would be under 1 GB.

---

## Security Notes

- OAuth refresh tokens are **encrypted** before storing in DB (using app SECRET_KEY)
- Service account key (`gdrive_credentials.json`) must NEVER be committed to Git
- OAuth scope is `drive.file` — app can only access files **it created**, not the user's entire Drive
- Admin can revoke access anytime from the app UI or from [Google Account permissions](https://myaccount.google.com/permissions)
- All uploads are audited in the audit_logs table

---

## Status: 🔲 NOT YET IMPLEMENTED

**To start building, you need to:**
1. Create a Google Cloud project and enable Drive API (free, 5 minutes)
2. Create an OAuth Client ID and give me the Client ID + Client Secret
3. I'll implement everything else — backend services, API endpoints, frontend UI
