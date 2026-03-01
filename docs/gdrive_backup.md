# Google Drive Backup — Implementation Plan

## Overview

Each agency gets automated Excel file backups pushed to Google Drive, organized into 3 folders:

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
│       ├── gdrive_service.py      # Google Drive API wrapper
│       ├── excel_export.py        # openpyxl Excel generation
│       └── backup_scheduler.py    # Celery Beat tasks
```

### How It Works

1. **Celery Beat** triggers backup tasks on schedule:
   - Daily: `export_daily_backup` at 11:59 PM
   - Monthly: `export_monthly_analysis` on 1st of month
   - Yearly: `export_yearly_analysis` on Jan 1st

2. **Excel Export Service** (`openpyxl`) queries the DB per agency and generates `.xlsx` files with formatted sheets, headers, and auto-column-widths

3. **Google Drive Service** (`google-api-python-client`):
   - Authenticates via Service Account
   - Creates folder structure if not exists: `NewsFlux Backups/{Agency Name}/{Daily|Monthly|Yearly}`
   - Uploads Excel files to the correct folder
   - Optionally shares the agency folder with the admin's email

4. **API Endpoints** for manual control:
   - `POST /admin/backup/trigger` — Manual daily backup trigger
   - `GET /admin/backup/history` — List past backups with Drive links
   - `POST /superadmin/backup/trigger-all` — Trigger backup for all agencies

### Dependencies (added to requirements.txt)
```
openpyxl>=3.1.0
google-api-python-client>=2.100.0
google-auth>=2.23.0
```

---

## Google API Setup (Required)

### Step-by-Step Instructions

#### 1. Create a Google Cloud Project
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Click **"New Project"** → Name it `newsflux-backups` → Create

#### 2. Enable Google Drive API
- In the project, go to **APIs & Services → Library**
- Search for **"Google Drive API"**
- Click **Enable**

#### 3. Create a Service Account
- Go to **APIs & Services → Credentials**
- Click **"Create Credentials" → "Service Account"**
- Name: `newsflux-backup-bot`
- Role: **None needed** (Drive access is granted by sharing folders)
- Click **Done**

#### 4. Generate the JSON Key
- Click on the service account you just created
- Go to **Keys** tab → **Add Key → Create new key**
- Choose **JSON** → Download
- You'll get a file like `newsflux-backups-abc123.json`

#### 5. Place the Key in the Project
- Rename it to `gdrive_credentials.json`
- Place it at `backend/gdrive_credentials.json`
- **DO NOT commit this file to Git** (already in .gitignore)

#### 6. Share a Drive Folder with the Service Account
- Create a folder in your Google Drive called `NewsFlux Backups`
- Right-click → Share → paste the service account email (looks like `newsflux-backup-bot@newsflux-backups.iam.gserviceaccount.com`)
- Give it **Editor** access
- Copy the folder ID from the URL: `https://drive.google.com/drive/folders/{THIS_IS_THE_FOLDER_ID}`

#### 7. Add Environment Variables
Add to your `.env` file:
```env
GDRIVE_CREDENTIALS_PATH=gdrive_credentials.json
GDRIVE_ROOT_FOLDER_ID=your_folder_id_here
GDRIVE_ENABLED=true
```

---

## Cost

**Free.** Google Drive API has generous limits:
- 15 GB free storage per Google account
- 1 billion API calls/day quota (effectively unlimited)
- No per-call charges

For a newspaper agency SaaS, daily Excel files are tiny (< 100 KB each). Even with 100 agencies, yearly storage would be under 1 GB.

---

## Security Notes

- Service account key (`gdrive_credentials.json`) must NEVER be committed to Git
- The key should be injected via Docker secrets or environment variable in production
- Each agency's folder can optionally be shared with the admin's email for direct access
- All uploads are to a centrally-owned Drive, not individual user accounts

---

## Status: 🔲 NOT YET IMPLEMENTED

Waiting for Google Cloud service account credentials to be provided before building.
