"""
Google Drive Backup API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import uuid

from app.api.dependencies import get_current_user, get_db
from app.models.models import User, Agency, Backup
from app.services.google_drive import GoogleDriveService, backup_agency_files_to_gdrive
from app.core.config import settings
from app.core.audit import log_audit
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/backup", tags=["backup"])

# ============= SCHEMAS =============

class BackupMetadata(BaseModel):
    id: str
    backup_name: str
    backup_type: str
    status: str
    file_size_bytes: Optional[int]
    gdrive_web_link: Optional[str]
    created_at: str
    completed_at: Optional[str]

    class Config:
        from_attributes = True


# ============= OAuth Endpoints =============

@router.get("/google/auth-url")
def get_google_auth_url(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get Google OAuth authorization URL
    
    User must have admin/superadmin role with agency
    """
    # Verify user has agency (admin only)
    if current_user.role not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Only admins can manage backups")

    agency = db.query(Agency).filter(Agency.id == current_user.tenant_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")

    try:
        gdrive_service = GoogleDriveService()
        auth_url, state = gdrive_service.get_auth_url()
        
        return {
            "auth_url": auth_url,
            "state": state,
            "message": "Redirect user to this URL to authenticate with Google"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate auth URL: {str(e)}")


@router.get("/google/callback")
def google_oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Handle Google OAuth callback
    Exchange code for access/refresh tokens
    """
    if current_user.role not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Only admins can manage backups")

    agency = db.query(Agency).filter(Agency.id == current_user.tenant_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")

    try:
        gdrive_service = GoogleDriveService()
        tokens = gdrive_service.exchange_code_for_token(code, state)
        
        # Create Drive service and get user's root folder
        drive = gdrive_service.get_drive_service(tokens['access_token'])
        
        # Create backup folder in user's Drive
        backup_folder_id = gdrive_service.create_backup_folder(drive)
        
        # Store encrypted refresh token and folder ID in agency
        from app.core.security import encrypt_token
        encrypted_token = encrypt_token(tokens['refresh_token'])
        
        agency.gdrive_refresh_token = encrypted_token
        agency.gdrive_folder_id = backup_folder_id
        agency.gdrive_connected_at = datetime.utcnow()
        db.commit()
        
        # Audit log
        log_audit(db, current_user.id, 'GDRIVE_CONNECTED', 'agencies', {
            'agency_id': str(agency.id),
            'folder_id': backup_folder_id
        })
        
        return {
            "success": True,
            "message": "Google Drive successfully connected",
            "backup_folder_id": backup_folder_id
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OAuth callback failed: {str(e)}")


@router.post("/disconnect-google")
def disconnect_google_drive(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disconnect Google Drive from agency"""
    if current_user.role not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Only admins can manage backups")

    agency = db.query(Agency).filter(Agency.id == current_user.tenant_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")

    agency.gdrive_refresh_token = None
    agency.gdrive_folder_id = None
    db.commit()
    
    # Audit log
    log_audit(db, current_user.id, 'GDRIVE_DISCONNECTED', 'agencies', {
        'agency_id': str(agency.id)
    })
    
    return {"success": True, "message": "Google Drive disconnected"}


# ============= Backup Management Endpoints =============

@router.post("/trigger-backup")
def trigger_manual_backup(
    backup_type: str = Query("files", description="Type: 'files' or 'database'"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually trigger backup to Google Drive
    Requires admin role
    """
    if current_user.role not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Only admins can trigger backups")

    try:
        # Create backup record
        backup = Backup(
            id=uuid.uuid4(),
            agency_id=current_user.tenant_id,
            backup_name=f"manual_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            backup_type=backup_type,
            status='pending'
        )
        db.add(backup)
        db.commit()
        
        # Trigger backup (this would be a Celery task in production)
        success, message = backup_agency_files_to_gdrive(
            db,
            current_user.tenant_id,
            current_user.id
        )
        
        if success:
            backup.status = 'completed'
            backup.completed_at = datetime.utcnow()
        else:
            backup.status = 'failed'
            backup.error_message = message
        
        db.commit()
        
        return {
            "success": success,
            "message": message,
            "backup_id": str(backup.id)
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Backup failed: {str(e)}"
        }


@router.get("/list", response_model=List[BackupMetadata])
def list_backups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """
    List backup history for agency
    Super admin can see all agencies' backups
    """
    if current_user.role == 'super_admin':
        backups = db.query(Backup).order_by(
            Backup.created_at.desc()
        ).limit(limit).offset(offset).all()
    else:
        backups = db.query(Backup).filter(
            Backup.agency_id == current_user.tenant_id
        ).order_by(
            Backup.created_at.desc()
        ).limit(limit).offset(offset).all()
    
    return [BackupMetadata.from_orm(b) for b in backups]


@router.delete("/delete/{backup_id}")
def delete_backup(
    backup_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete backup (both locally and from Google Drive)
    Admin only
    """
    if current_user.role not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Only admins can delete backups")

    backup = db.query(Backup).filter(Backup.id == backup_id).first()
    if not backup:
        raise HTTPException(status_code=404, detail="Backup not found")

    # Check permissions (admin can only delete own agency backups)
    if current_user.role == 'admin' and backup.agency_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="No permission to delete this backup")

    try:
        # Delete from Google Drive if file_id exists
        if backup.gdrive_file_id:
            agency = db.query(Agency).filter(Agency.id == backup.agency_id).first()
            if agency and agency.gdrive_refresh_token:
                from app.core.security import decrypt_token
                try:
                    refresh_token = decrypt_token(agency.gdrive_refresh_token)
                    gdrive_service = GoogleDriveService()
                    access_token = gdrive_service.refresh_access_token(refresh_token)
                    drive = gdrive_service.get_drive_service(access_token)
                    gdrive_service.delete_remote_file(drive, backup.gdrive_file_id)
                except Exception:
                    pass  # Silently fail, backup record is still deleted

        # Delete from database
        db.delete(backup)
        db.commit()
        
        # Audit log
        log_audit(db, current_user.id, 'BACKUP_DELETED', 'backups', {
            'backup_id': backup_id,
            'backup_name': backup.backup_name
        })
        
        return {
            "success": True,
            "message": f"Backup '{backup.backup_name}' deleted successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")


@router.get("/status/{backup_id}")
def get_backup_status(
    backup_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get backup status and metadata"""
    backup = db.query(Backup).filter(Backup.id == backup_id).first()
    if not backup:
        raise HTTPException(status_code=404, detail="Backup not found")
    
    # Check permissions
    if current_user.role != 'super_admin' and backup.agency_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="No permission to view this backup")
    
    return BackupMetadata.from_orm(backup)
