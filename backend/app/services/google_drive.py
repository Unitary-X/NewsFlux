"""Google Drive OAuth 2.0 and Backup Service"""
import os
import json
import shutil
import zipfile
from datetime import datetime
from typing import Optional, Dict, Tuple
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.exceptions import RefreshError
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload

from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.models import Agency, Backup
from app.core.security import encrypt_token, decrypt_token
from app.core.audit import log_audit


class GoogleDriveService:
    """Manages Google Drive OAuth 2.0 flow and file backup operations"""

    SCOPES = ['https://www.googleapis.com/auth/drive.file']
    
    def __init__(self):
        self.client_id = settings.GOOGLE_CLIENT_ID
        self.client_secret = settings.GOOGLE_CLIENT_SECRET
        self.redirect_uri = settings.GOOGLE_REDIRECT_URI

    def get_oauth_flow(self) -> Flow:
        """Create and return Google OAuth 2.0 flow"""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                    "redirect_uris": [self.redirect_uri],
                }
            },
            scopes=self.SCOPES,
        )
        flow.redirect_uri = self.redirect_uri
        return flow

    def get_auth_url(self) -> Tuple[str, str]:
        """
        Generate Google OAuth authorization URL
        
        Returns:
            Tuple[str, str]: (authorization_url, state) for OAuth 2.0 flow
        """
        flow = self.get_oauth_flow()
        auth_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true'
        )
        return auth_url, state

    def exchange_code_for_token(self, code: str, state: str) -> Dict:
        """
        Exchange authorization code for access/refresh tokens
        
        Args:
            code: Authorization code from OAuth callback
            state: State parameter for validation
            
        Returns:
            Dict containing credentials (access_token, refresh_token, expires_at)
        """
        flow = self.get_oauth_flow()
        flow.fetch_token(code=code)
        credentials = flow.credentials

        return {
            'access_token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'expires_at': credentials.expiry.isoformat() if credentials.expiry else None,
        }

    def refresh_access_token(self, refresh_token: str) -> str:
        """
        Refresh access token using refresh token
        
        Args:
            refresh_token: Long-lived refresh token
            
        Returns:
            str: New access token
            
        Raises:
            RefreshError: If token refresh fails
        """
        credentials = Credentials(
            token=None,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=self.client_id,
            client_secret=self.client_secret,
        )
        credentials.refresh(Request())
        return credentials.token

    def get_drive_service(self, access_token: str):
        """Build Google Drive service with access token"""
        credentials = Credentials(token=access_token)
        return build('drive', 'v3', credentials=credentials)

    def create_backup_folder(self, drive_service, parent_id: Optional[str] = None) -> str:
        """
        Create 'NewsFlux Backups' folder in Google Drive
        
        Args:
            drive_service: Google Drive service instance
            parent_id: Parent folder ID (if None, creates at root)
            
        Returns:
            str: Folder ID of created backup folder
        """
        folder_metadata = {
            'name': 'NewsFlux Backups',
            'mimeType': 'application/vnd.google-apps.folder'
        }
        if parent_id:
            folder_metadata['parents'] = [parent_id]

        folder = drive_service.files().create(
            body=folder_metadata,
            fields='id,webViewLink'
        ).execute()

        return folder.get('id')

    def upload_backup_file(
        self, 
        drive_service, 
        file_path: str, 
        parent_folder_id: str,
        file_name: Optional[str] = None
    ) -> Dict:
        """
        Upload backup file to Google Drive
        
        Args:
            drive_service: Google Drive service instance
            file_path: Local path to backup file
            parent_folder_id: ID of parent folder in Drive
            file_name: Custom file name (defaults to basename of file_path)
            
        Returns:
            Dict: File metadata (id, name, webViewLink, size)
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Backup file not found: {file_path}")

        file_name = file_name or os.path.basename(file_path)
        file_size = os.path.getsize(file_path)

        file_metadata = {
            'name': file_name,
            'parents': [parent_folder_id]
        }

        media = MediaFileUpload(file_path, resumable=True)

        file_obj = drive_service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id,name,webViewLink,size,createdTime'
        ).execute()

        return {
            'id': file_obj.get('id'),
            'name': file_obj.get('name'),
            'web_link': file_obj.get('webViewLink'),
            'size': int(file_obj.get('size', 0)),
            'created_at': file_obj.get('createdTime'),
        }

    def delete_remote_file(self, drive_service, file_id: str) -> bool:
        """Delete file from Google Drive"""
        try:
            drive_service.files().delete(fileId=file_id).execute()
            return True
        except HttpError:
            return False

    def list_backups_in_folder(self, drive_service, folder_id: str) -> list:
        """List all files in a Google Drive folder"""
        try:
            results = drive_service.files().list(
                q=f"'{folder_id}' in parents and trashed=false",
                spaces='drive',
                fields='files(id, name, size, createdTime, webViewLink)',
                pageSize=100,
                orderBy='createdTime desc'
            ).execute()
            return results.get('files', [])
        except HttpError:
            return []


class BackupManager:
    """Manages local backup file creation and compression"""

    def __init__(self, upload_dir: str = None):
        """
        Initialize backup manager
        
        Args:
            upload_dir: Directory containing files to backup (relative to app root)
        """
        self.upload_dir = upload_dir or settings.UPLOAD_DIR
        self.backup_dir = Path('/tmp/newsflux_backups')
        self.backup_dir.mkdir(exist_ok=True)

    def create_backup_zip(self, agency_id: str) -> str:
        """
        Create ZIP file of all uploaded files for agency
        
        Args:
            agency_id: Agency UUID
            
        Returns:
            str: Path to created ZIP file
        """
        agency_upload_dir = os.path.join(self.upload_dir, str(agency_id))
        
        if not os.path.exists(agency_upload_dir):
            # Create empty backup for agencies with no files
            zip_filename = f"newsflux_backup_{agency_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.zip"
            zip_path = self.backup_dir / zip_filename
            with zipfile.ZipFile(zip_path, 'w') as zipf:
                zipf.writestr('README.txt', 'No uploaded files in this period.')
            return str(zip_path)

        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        zip_filename = f"newsflux_backup_{agency_id}_{timestamp}.zip"
        zip_path = self.backup_dir / zip_filename

        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(agency_upload_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, agency_upload_dir)
                    zipf.write(file_path, arcname)

        return str(zip_path)

    def cleanup_local_backup(self, file_path: str) -> None:
        """Delete temporary local backup file"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            pass  # Silently fail, file may already be deleted


def backup_agency_files_to_gdrive(
    db: Session,
    agency_id: str,
    user_id: str = None
) -> Tuple[bool, str]:
    """
    Backup agency uploaded files to Google Drive
    
    Args:
        db: Database session
        agency_id: Agency UUID
        user_id: User triggering backup (for audit log)
        
    Returns:
        Tuple[bool, str]: (success, message)
    """
    try:
        # Get agency with Google Drive config
        agency = db.query(Agency).filter(Agency.id == agency_id).first()
        if not agency:
            return False, "Agency not found"

        if not agency.gdrive_refresh_token:
            return False, "Google Drive not connected for this agency"

        # Decrypt and refresh access token
        encrypted_token = agency.gdrive_refresh_token
        try:
            refresh_token = decrypt_token(encrypted_token)
        except Exception:
            return False, "Failed to decrypt Google Drive credentials"

        gdrive_service = GoogleDriveService()
        try:
            access_token = gdrive_service.refresh_access_token(refresh_token)
        except RefreshError:
            # Refresh token expired, user needs to reconnect
            agency.gdrive_refresh_token = None
            agency.gdrive_folder_id = None
            db.commit()
            return False, "Google Drive credentials expired. Please reconnect."

        drive = gdrive_service.get_drive_service(access_token)

        # Create backup ZIP
        backup_manager = BackupManager()
        zip_file_path = backup_manager.create_backup_zip(str(agency_id))

        # Upload to Google Drive
        upload_result = gdrive_service.upload_backup_file(
            drive,
            zip_file_path,
            agency.gdrive_folder_id
        )

        # Record in database
        backup = Backup(
            agency_id=agency_id,
            backup_name=upload_result['name'],
            gdrive_file_id=upload_result['id'],
            file_size_bytes=upload_result['size'],
            gdrive_web_link=upload_result['web_link'],
            status='completed',
            backup_type='files'
        )
        db.add(backup)
        db.commit()

        # Audit log
        if user_id:
            log_audit(db, user_id, 'BACKUP_CREATED', 'backups',
                      details={'backup_id': str(backup.id), 'file_name': backup.backup_name, 'size_bytes': backup.file_size_bytes},
                      tenant_id=agency_id)

        # Cleanup local temp file
        backup_manager.cleanup_local_backup(zip_file_path)

        return True, f"Backup '{upload_result['name']}' completed successfully"

    except Exception as e:
        return False, f"Backup failed: {str(e)}"
