# 💾 Google Drive Backup — Implementation Guide

## Overview

NewsFlux supports automated Google Drive backups for agency data via OAuth2 per-agency authentication. Agency admins connect their own Google account and backups go to their personal Google Drive.

Two backup modes depending on user role:

| Mode | Who | Auth Method | Where Backups Go |
|------|-----|------------|-----------------|
| **Agency Backup** | Agency Admin | Google OAuth2 (Sign in with Google) | Admin's own Google Drive |
| **Platform Backup** | Super Admin | Google OAuth2 | Super Admin's Google Drive |

---

## Backup Structure

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

### 📅 Daily Updates
| File | Content |
|------|---------|
| `{date}_daily_stock.xlsx` | Per-newspaper: Taken, Returned, Sold, Revenue |
| `{date}_deliveries.xlsx` | Per-worker: Customers delivered, pending, route info |

### 📊 Monthly Analysis
| File | Content |
|------|---------|
| `{month}_revenue_report.xlsx` | Daily revenue breakdown, totals, averages, trends |
| `{month}_subscription_summary.xlsx` | Active/paused subscriptions, customer × newspaper matrix |
| `{month}_invoice_report.xlsx` | All invoices: customer, amount, delivery_fee, paid/pending status |
| `{month}_worker_performance.xlsx` | Per-worker: deliveries completed, customers served |

### 📈 Yearly Analysis
| File | Content |
|------|---------|
| `{year}_annual_report.xlsx` | Monthly revenue trend, total P&L, customer/worker growth |
| `{year}_customer_growth.xlsx` | New customers per month, churn, retention rate |

---

## Technical Architecture

### Backend Components

```
backend/app/
├── services/
│   ├── google_drive.py        # OAuth2 flow + Drive API wrapper (backup.py router)
│   ├── gdrive_service.py      # Google Drive functions (admin.py / superadmin.py)
│   ├── excel_export.py        # openpyxl Excel generation
│   └── backup_scheduler.py    # Celery Beat scheduled tasks
├── api/v1/
│   ├── backup.py              # Dedicated backup router (7 endpoints)
│   ├── admin.py               # Admin backup endpoints (8 endpoints)
│   └── superadmin.py          # SA backup/DB management endpoints (16 endpoints)
└── models/
    └── models.py              # Backup model + Agency gdrive columns
```

### How It Works

1. **Celery Beat** triggers backup tasks on schedule:
   - Daily: `export_daily_backup` at 11:59 PM
   - Monthly: `export_monthly_analysis` on 1st of month
   - Yearly: `export_yearly_analysis` on Jan 1st

2. **Excel Export Service** (`openpyxl`) queries the DB per agency and generates `.xlsx` files with formatted sheets, headers, and auto-column-widths

3. **Google Drive Service** (`google-api-python-client`):
   - Authenticates via stored OAuth refresh token
   - Creates folder structure if not exists: `NewsFlux Backups/{Agency Name}/{Daily|Monthly|Yearly}`
   - Uploads Excel files to the correct folder

---

## API Endpoints

### Admin Backup (in `admin.py`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/admin/backup/google/connect` | Redirect to Google OAuth consent |
| GET | `/admin/backup/google/callback` | Handle OAuth callback |
| GET | `/admin/backup/google/status` | Check if Drive is connected |
| DELETE | `/admin/backup/google/disconnect` | Remove stored credentials |
| POST | `/admin/backup/trigger` | Manual daily backup |
| POST | `/admin/backup/trigger-monthly` | Manual monthly backup |
| POST | `/admin/backup/trigger-yearly` | Manual yearly backup |
| GET | `/admin/backup/files/{subfolder}` | Browse backup files |

### Backup Router (in `backup.py` — `/api/v1/backup`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/status` | Check Google Drive connection |
| GET | `/google/auth-url` | Get OAuth authorization URL |
| GET | `/google/callback` | Handle OAuth callback (open route) |
| POST | `/disconnect-google` | Remove connection |
| POST | `/trigger-backup` | Trigger manual backup |
| GET | `/list` | List backup records |
| DELETE | `/delete/{backup_id}` | Delete a backup |

### Super Admin Backup (in `superadmin.py`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/superadmin/backup/agencies` | List agencies with backup status |
| GET | `/superadmin/backup/{id}/files/{subfolder}` | Browse agency backups |
| POST | `/superadmin/backup/{id}/trigger` | Trigger agency daily backup |
| POST | `/superadmin/backup/{id}/trigger-monthly` | Trigger agency monthly backup |
| POST | `/superadmin/backup/{id}/trigger-yearly` | Trigger agency yearly backup |
| POST | `/superadmin/backup/trigger-all` | Backup all agencies |
| GET | `/superadmin/backup/db/export-json` | Export full DB as JSON |
| GET | `/superadmin/backup/db/export-sql` | Export full DB as SQL |
| GET | `/superadmin/backup/db/stats` | DB stats (row counts per table) |
| POST | `/superadmin/backup/db/upload` | Restore from JSON |
| POST | `/superadmin/backup/db/upload-sql` | Restore from SQL |
| GET | `/superadmin/backup/gdrive/status` | SA Drive connection status |
| GET | `/superadmin/backup/gdrive/connect` | SA Drive OAuth connect |
| GET | `/superadmin/backup/gdrive/callback` | SA Drive OAuth callback |
| POST | `/superadmin/backup/gdrive/disconnect` | SA Drive disconnect |
| POST | `/superadmin/backup/gdrive/upload-db` | Upload DB to SA's Drive |

---

## Agency Admin OAuth Flow

### User Experience
1. Admin goes to **Backup** page in the dashboard
2. Clicks **"Connect Google Drive"** button
3. Google login popup appears → admin signs in with their Google account
4. Clicks **"Allow"** to grant Drive file access (`drive.file` scope)
5. Backups now automatically go to their personal Google Drive
6. Admin can click **"Backup Now"** anytime for a manual export
7. Admin can **"Disconnect"** at any time to revoke access

### Behind the Scenes
```
Admin clicks "Connect"
    → Frontend redirects to: /api/v1/backup/google/auth-url
    → Backend generates OAuth URL with PKCE code challenge
    → Backend stores state in Agency.gdrive_oauth_state (maps state → agency)
    → Admin redirected to Google OAuth consent
    → Admin logs into Google, clicks Allow
    → Google redirects to: /api/v1/backup/google/callback?code=AUTH_CODE&state=STATE
    → Backend exchanges auth code for access_token + refresh_token
    → refresh_token encrypted with Fernet and stored in Agency.gdrive_refresh_token
    → Admin redirected back to frontend with success message
```

### Database Columns (Agency model)
```python
gdrive_refresh_token = Column(Text, nullable=True)      # Encrypted OAuth refresh token
gdrive_folder_id = Column(String, nullable=True)         # Root backup folder ID
gdrive_connected_at = Column(DateTime, nullable=True)    # When Drive was connected
gdrive_oauth_state = Column(String(512), nullable=True)  # OAuth state for callback mapping
```

### Backup Model
```python
class Backup:
    id              # UUID primary key
    agency_id       # FK to agencies
    backup_name     # Human-readable name
    backup_type     # daily / monthly / yearly
    status          # pending / completed / failed
    file_size_bytes # File size
    gdrive_file_id  # Google Drive file ID
    gdrive_web_link # Direct link to file
    error_message   # Error details if failed
    created_at      # When backup was initiated
    completed_at    # When backup finished
```

---

## Google API Setup

### One-Time Setup (platform-level)

#### 1. Create Google Cloud Project
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create new project → Name: `newsflux-backups`

#### 2. Enable Google Drive API
- APIs & Services → Library → Search "Google Drive API" → Enable

#### 3. Create OAuth Client ID
- APIs & Services → Credentials → Create Credentials → OAuth client ID
- Application type: **Web application**
- Authorized redirect URIs:
  - Production: `https://yourdomain.com/api/v1/backup/google/callback`
  - Development: `http://localhost:8000/api/v1/backup/google/callback`

#### 4. Configure OAuth Consent Screen
- User Type: **External**
- App name: `NewsFlux`
- Scopes: `https://www.googleapis.com/auth/drive.file` (only access files created by the app)

#### 5. Environment Variables (`.env`)
```env
# OAuth credentials (required)
GOOGLE_CLIENT_ID=your_oauth_client_id
GOOGLE_CLIENT_SECRET=your_oauth_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/backup/google/callback

# Feature flag
GDRIVE_ENABLED=true
```

---

## Security

- **Token Encryption:** OAuth refresh tokens are encrypted with Fernet (derived from `SECRET_KEY`) before database storage
- **Minimal Scope:** Only `drive.file` scope — app can only access files it creates, not the user's entire Drive
- **PKCE:** OAuth flow uses code challenge for additional security
- **State Parameter:** Random state string prevents CSRF attacks on the callback
- **Per-Agency Isolation:** Each agency's tokens stored separately; admins can only access their own backups

---

## Dependencies

```
google-api-python-client>=2.100.0
google-auth>=2.23.0
google-auth-oauthlib>=1.1.0
openpyxl>=3.1.0
cryptography>=41.0.0
```
