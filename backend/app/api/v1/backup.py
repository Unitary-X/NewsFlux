"""
Google Drive Backup API Endpoints
Uses request.state for auth (set by TenantMiddleware).
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import uuid

from app.api.dependencies import get_db, require_role
from app.models.models import Agency, Backup
from app.services.google_drive import GoogleDriveService, backup_agency_files_to_gdrive
from app.core.config import settings
from app.core.audit import log_audit
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/backup")


# ============= SCHEMAS =============

class BackupOut(BaseModel):
    id: str
    backup_name: str
    backup_type: str
    status: str
    file_size_bytes: Optional[int] = None
    gdrive_web_link: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None

    class Config:
        from_attributes = True


def _backup_to_dict(b: Backup) -> dict:
    return {
        "id": str(b.id),
        "backup_name": b.backup_name,
        "backup_type": b.backup_type,
        "status": b.status,
        "file_size_bytes": b.file_size_bytes,
        "gdrive_web_link": b.gdrive_web_link,
        "created_at": b.created_at.isoformat() if b.created_at else None,
        "completed_at": b.completed_at.isoformat() if b.completed_at else None,
    }


# ============= Connection Status =============

@router.get("/status", dependencies=[Depends(require_role(["admin", "super_admin"]))])
def get_gdrive_status(request: Request, db: Session = Depends(get_db)):
    """Check if Google Drive is connected for this agency"""
    # Check if Google Drive integration is configured on the server
    enabled = bool(
        getattr(settings, 'GOOGLE_CLIENT_ID', None)
        and getattr(settings, 'GOOGLE_CLIENT_SECRET', None)
    )
    if not enabled:
        return {"connected": False, "enabled": False}

    tid = request.state.tenant_id
    agency = db.query(Agency).filter(Agency.id == tid).first()
    if not agency:
        return {"connected": False, "enabled": True}

    connected = bool(agency.gdrive_refresh_token and agency.gdrive_folder_id)
    result = {"connected": connected, "enabled": True}
    if connected and agency.gdrive_connected_at:
        result["connected_at"] = agency.gdrive_connected_at.isoformat()
    return result


# ============= OAuth Endpoints =============

@router.get("/google/auth-url", dependencies=[Depends(require_role(["admin", "super_admin"]))])
def get_google_auth_url(request: Request, db: Session = Depends(get_db)):
    """Get Google OAuth authorization URL"""
    tid = request.state.tenant_id
    user_id = request.state.user_id

    agency = db.query(Agency).filter(Agency.id == tid).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")

    try:
        gdrive_service = GoogleDriveService()
        auth_url, state = gdrive_service.get_auth_url()

        # Store state → tenant mapping so the callback can find the agency
        # We encode tenant_id + user_id in the state param stored in DB
        agency.gdrive_oauth_state = f"{state}|{tid}|{user_id}"
        db.commit()

        return {"auth_url": auth_url, "state": state}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate auth URL: {str(e)}")


@router.get("/google/callback")
def google_oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    Handle Google OAuth callback.
    This is hit by a browser redirect from Google — no Bearer token.
    We look up the agency via the state parameter stored earlier.
    """
    # Find agency by state
    agency = db.query(Agency).filter(
        Agency.gdrive_oauth_state.like(f"{state}|%")
    ).first()
    if not agency:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")

    # Extract user_id from stored state
    parts = (agency.gdrive_oauth_state or "").split("|")
    user_id = parts[2] if len(parts) >= 3 else None

    # Clear state
    agency.gdrive_oauth_state = None

    try:
        gdrive_service = GoogleDriveService()
        tokens = gdrive_service.exchange_code_for_token(code, state)

        drive = gdrive_service.get_drive_service(tokens['access_token'])
        backup_folder_id = gdrive_service.create_backup_folder(drive)

        from app.core.security import encrypt_token
        agency.gdrive_refresh_token = encrypt_token(tokens['refresh_token'])
        agency.gdrive_folder_id = backup_folder_id
        agency.gdrive_connected_at = datetime.utcnow()
        db.commit()

        if user_id:
            log_audit(db, user_id, 'GDRIVE_CONNECTED', 'agencies', {
                'agency_id': str(agency.id),
                'folder_id': backup_folder_id,
            })

        # Redirect user back to the frontend backup page
        frontend_url = settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else "http://localhost:5173"
        return RedirectResponse(url=f"{frontend_url}/admin/backup?connected=true")

    except Exception as e:
        frontend_url = settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else "http://localhost:5173"
        return RedirectResponse(url=f"{frontend_url}/admin/backup?error=oauth_failed")


@router.post("/disconnect-google", dependencies=[Depends(require_role(["admin", "super_admin"]))])
def disconnect_google_drive(request: Request, db: Session = Depends(get_db)):
    """Disconnect Google Drive from agency"""
    tid = request.state.tenant_id
    user_id = request.state.user_id

    agency = db.query(Agency).filter(Agency.id == tid).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")

    agency.gdrive_refresh_token = None
    agency.gdrive_folder_id = None
    agency.gdrive_connected_at = None
    db.commit()

    log_audit(db, user_id, 'GDRIVE_DISCONNECTED', 'agencies', {
        'agency_id': str(agency.id),
    })

    return {"success": True, "message": "Google Drive disconnected"}


# ============= Backup Management =============

@router.post("/trigger-backup", dependencies=[Depends(require_role(["admin", "super_admin"]))])
def trigger_manual_backup(
    request: Request,
    db: Session = Depends(get_db),
    backup_type: str = Query("files", description="Type: 'files' or 'database'"),
):
    """Manually trigger a backup to Google Drive"""
    tid = request.state.tenant_id
    user_id = request.state.user_id

    backup_record = Backup(
        id=uuid.uuid4(),
        agency_id=tid,
        backup_name=f"manual_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
        backup_type=backup_type,
        status="pending",
    )
    db.add(backup_record)
    db.commit()

    try:
        success, message = backup_agency_files_to_gdrive(db, tid, user_id)

        if success:
            backup_record.status = "completed"
            backup_record.completed_at = datetime.utcnow()
        else:
            backup_record.status = "failed"
            backup_record.error_message = message

        db.commit()
        return {"success": success, "message": message, "backup_id": str(backup_record.id)}
    except Exception as e:
        backup_record.status = "failed"
        backup_record.error_message = str(e)
        db.commit()
        return {"success": False, "message": f"Backup failed: {str(e)}"}


@router.get("/list", dependencies=[Depends(require_role(["admin", "super_admin"]))])
def list_backups(
    request: Request,
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """List backup history for the current agency"""
    tid = request.state.tenant_id
    role = request.state.role

    query = db.query(Backup)
    if role != "super_admin":
        query = query.filter(Backup.agency_id == tid)

    rows = query.order_by(Backup.created_at.desc()).limit(limit).offset(offset).all()
    return [_backup_to_dict(b) for b in rows]


@router.delete("/delete/{backup_id}", dependencies=[Depends(require_role(["admin", "super_admin"]))])
def delete_backup(
    backup_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """Delete a backup record and optionally from Google Drive"""
    tid = request.state.tenant_id
    role = request.state.role
    user_id = request.state.user_id

    backup_rec = db.query(Backup).filter(Backup.id == backup_id).first()
    if not backup_rec:
        raise HTTPException(status_code=404, detail="Backup not found")

    if role != "super_admin" and backup_rec.agency_id != tid:
        raise HTTPException(status_code=403, detail="No permission to delete this backup")

    # Try to delete from Google Drive
    if backup_rec.gdrive_file_id:
        agency = db.query(Agency).filter(Agency.id == backup_rec.agency_id).first()
        if agency and agency.gdrive_refresh_token:
            from app.core.security import decrypt_token
            try:
                refresh_token = decrypt_token(agency.gdrive_refresh_token)
                gdrive_service = GoogleDriveService()
                access_token = gdrive_service.refresh_access_token(refresh_token)
                drive = gdrive_service.get_drive_service(access_token)
                gdrive_service.delete_remote_file(drive, backup_rec.gdrive_file_id)
            except Exception:
                pass  # Still delete the DB record

    name = backup_rec.backup_name
    db.delete(backup_rec)
    db.commit()

    log_audit(db, user_id, 'BACKUP_DELETED', 'backups', {
        'backup_id': backup_id,
        'backup_name': name,
    })

    return {"success": True, "message": f"Backup '{name}' deleted"}
