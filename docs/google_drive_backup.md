# Google Drive Backup Integration - Setup Guide

## Overview
This guide walks through setting up OAuth 2.0 Google Drive backup integration for the NewsFlux platform. Users can securely connect their Google accounts and enable automatic daily backups of their uploaded files.

## Prerequisites
- Google Cloud Project with Drive API enabled
- OAuth 2.0 credentials (Client ID, Client Secret)
- Backend running with PostgreSQL
- Frontend running on localhost:5173 (or configured domain)

## Step 1: Create Google Cloud Project

### 1.1 Create Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **Create Project**
3. Enter "NewsFlux Backups" as project name
4. Click **Create**

### 1.2 Enable Google Drive API
1. In the left sidebar, go to **APIs & Services** > **Library**
2. Search for "Google Drive API"
3. Click on it and press **Enable**

### 1.3 Create OAuth 2.0 Credentials
1. Go to **APIs & Services** > **Credentials**
2. Click **+ Create Credentials** > **OAuth Client ID**
3. If prompted, configure **OAuth consent screen**:
   - Choose "External" user type
   - Fill in app name: "NewsFlux"
   - Add your email as support email
   - Add scopes: `https://www.googleapis.com/auth/drive.file`
4. For OAuth Client ID:
   - Choose **Web application**
   - Name: "NewsFlux Backend"
   - Add Authorized redirect URIs:
     - `http://localhost:8000/api/v1/backup/google/callback` (development)
     - `https://yourdomain.com/api/v1/backup/google/callback` (production)
   - Click **Create**

### 1.4 Copy Credentials
You'll see your OAuth credentials. Copy:
- **Client ID**
- **Client Secret**

## Step 2: Configure Backend Environment

Add these to your `.env` file:

```bash
# Google OAuth for Drive Backup
GOOGLE_OAUTH_CLIENT_ID=your_client_id_here
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret_here
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/api/v1/backup/google/callback
GDRIVE_ENABLED=true
UPLOAD_DIR=./uploads
```

## Step 3: Database Migration

Create and run migration for Backup table:

```bash
cd backend
alembic revision --autogenerate -m "Add Backup model"
alembic upgrade head
```

The migration will create:
- `backups` table with columns:
  - `id` (UUID, primary key)
  - `agency_id` (UUID, foreign key to agencies)
  - `backup_name` (String)
  - `backup_type` (String: 'files', 'database', 'both')
  - `status` (String: 'pending', 'completed', 'failed')
  - `file_size_bytes` (Integer)
  - `gdrive_file_id` (String - Google Drive file ID)
  - `gdrive_web_link` (Text - Link to view/download)
  - `error_message` (Text - Error details if failed)
  - `created_at`, `completed_at` (DateTime)

## Step 4: Test OAuth Flow

### 4.1 Start Backend
```bash
cd backend
. .venv/Scripts/Activate.ps1  # Windows
source .venv/bin/activate      # Linux/Mac
uvicorn app.main:app --reload
```

### 4.2 Start Frontend
```bash
cd frontend
npm run dev
```

### 4.3 Test Connection
1. Navigate to `http://localhost:5173/admin/backup`
2. Log in as admin
3. Click "Connect Google Drive"
4. You'll be redirected to Google's OAuth consent screen
5. Grant permission to access your Drive
6. You should be redirected back with a success message
7. A "NewsFlux Backups" folder will be created in your Google Drive

## Step 5: Enable Scheduled Backups (Celery)

### 5.1 Start Redis (if not already running)
```bash
redis-server
```

### 5.2 Start Celery Worker
```bash
cd backend
celery -A app.core.celery_app worker -l info
```

### 5.3 Start Celery Beat (Scheduler)
```bash
cd backend
celery -A app.core.celery_app beat -l info
```

**Celery will automatically run:**
- `backup.files.daily` - Every 24 hours (configurable via crontab)
- `backup.cleanup_old` - Monthly cleanup of backups older than 90 days

## Step 6: API Endpoints Reference

### Get OAuth Authorization URL
```bash
GET /api/v1/backup/google/auth-url
Authorization: Bearer <token>

Response:
{
  "auth_url": "https://accounts.google.com/o/oauth2/auth?...",
  "state": "state_token_for_validation"
}
```

### OAuth Callback (Automatic)
```bash
GET /api/v1/backup/google/callback?code=<code>&state=<state>
```
Automatically exchanges code for token and creates backup folder.

### Disconnect Google Drive
```bash
POST /api/v1/backup/disconnect-google
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Google Drive disconnected"
}
```

### Trigger Manual Backup
```bash
POST /api/v1/backup/trigger-backup?backup_type=files
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Backup 'newsflux_backup_...' completed successfully",
  "backup_id": "uuid"
}
```

### List Backups
```bash
GET /api/v1/backup/list?limit=50&offset=0
Authorization: Bearer <token>

Response:
[
  {
    "id": "uuid",
    "backup_name": "newsflux_backup_agency_id_timestamp.zip",
    "backup_type": "files",
    "status": "completed",
    "file_size_bytes": 1024000,
    "gdrive_web_link": "https://drive.google.com/file/d/...",
    "created_at": "2024-03-02T10:00:00Z",
    "completed_at": "2024-03-02T10:05:00Z"
  }
]
```

### Delete Backup
```bash
DELETE /api/v1/backup/delete/{backup_id}
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Backup 'name' deleted successfully"
}
```

### Get Backup Status
```bash
GET /api/v1/backup/status/{backup_id}
Authorization: Bearer <token>
```

## Step 7: Backend Folder Structure

```
backend/
├── app/
│   ├── api/v1/
│   │   └── backup.py              # OAuth & backup endpoints
│   ├── core/
│   │   ├── config.py              # Updated with Google OAuth settings
│   │   ├── security.py            # Updated with token encryption
│   │   ├── celery_app.py          # Celery config with beat schedule
│   │   └── audit.py               # Audit logging
│   ├── models/
│   │   └── models.py              # Added Backup model
│   └── services/
│       ├── google_drive.py        # Google Drive & OAuth service
│       └── backup_scheduler.py    # Celery tasks
```

## Step 8: Frontend Features

### Backup Page (`/admin/backup`)
- **Connect Google Drive**: OAuth flow with Google
- **Backup Now**: Manual trigger
- **Backup History**: List all backups with:
  - Backup name and Google Drive link
  - Status (pending/completed/failed)
  - File size in MB
  - Date created and relative time (e.g., "2 hours ago")
  - Delete option
- **Disconnect**: Remove Google Drive access

### Features
- ✅ OAuth 2.0 authentication
- ✅ Automatic daily backups
- ✅ Manual backup on demand
- ✅ Backup history & management
- ✅ Direct links to Google Drive files
- ✅ Encrypted credential storage
- ✅ i18n support (English & Tamil)
- ✅ Admin-only access control

## Security Considerations

### Token Encryption
Refresh tokens are encrypted using Fernet symmetric encryption before storage in the database. The encryption key is derived from your `SECRET_KEY`.

### OAuth Client Secret
**NEVER** commit `GOOGLE_OAUTH_CLIENT_SECRET` to version control. Always use environment variables.

### Scope Limitation
OAuth scope is limited to `https://www.googleapis.com/auth/drive.file` which allows:
- Creating files and folders
- Uploading files
- Accessing files created by the app
- Does NOT allow access to all user's Drive files

### Credential Refresh
If refresh token expires:
- User is notified to reconnect
- Existing backup records remain in database
- Manual reconnection via "Connect Google Drive" button

## Troubleshooting

### Issue: "Client ID is invalid"
**Solution**: Verify `GOOGLE_OAUTH_CLIENT_ID` in `.env` matches exactly with Google Cloud Console

### Issue: "Redirect URI mismatch"
**Solution**: Ensure redirect URI in Google Cloud Console matches `GOOGLE_OAUTH_REDIRECT_URI` in `.env`

### Issue: Backups not running automatically
**Solution**: 
1. Verify Redis is running: `redis-cli ping` → should return `PONG`
2. Check Celery worker is running
3. Check Celery Beat scheduler is running
4. View logs: `celery -A app.core.celery_app worker -l debug`

### Issue: "Permission denied" when uploading to Google Drive
**Solution**: 
1. User must have permission to create files in their Drive
2. Approve all scopes during OAuth consent
3. Check quota limits in Google Cloud Console

### Issue: Old backups not deleted
**Solution**: 
1. Ensure Celery Beat is running the cleanup task
2. Manually trigger: 
   ```python
   from app.services.backup_scheduler import cleanup_old_backups
   cleanup_old_backups.delay(days_to_keep=90)
   ```

## Production Deployment Checklist

- [ ] Update `GOOGLE_OAUTH_REDIRECT_URI` to production domain
- [ ] Add production domain to Google Cloud Console authorized URIs
- [ ] Set `GDRIVE_ENABLED=true` in production environment
- [ ] Configure Redis with authentication for production
- [ ] Set up Celery worker & beat as systemd services
- [ ] Configure backup cleanup schedule (crontab alternative)
- [ ] Monitor backup failures via logging
- [ ] Set up email notifications for failed backups
- [ ] Document backup recovery procedures
- [ ] Test OAuth flow with production credentials
- [ ] Verify HTTPS is enforced for all API calls

## Recovery Procedure

If user needs to recover files from backups:

1. Go to Google Drive
2. Open "NewsFlux Backups" folder
3. Select desired backup ZIP file
4. Download it locally
5. Extract ZIP to recover files

## Next Steps

- Implement database backup alongside file backups
- Add backup scheduling UI for admins (e.g., per-agency custom times)
- Implement S3/Azure backup as alternative to Google Drive
- Add backup versioning and retention policies
- Create backup restoration UI
- Add monitoring dashboard for backup health
