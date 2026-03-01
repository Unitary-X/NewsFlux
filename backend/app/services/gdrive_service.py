"""
Google Drive Service — OAuth2 flow for agency admins + file upload.
Uses the `drive.file` scope so the app can only access files it creates.
"""
import json
import base64
import logging
from typing import Optional
from cryptography.fernet import Fernet
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.http import MediaInMemoryUpload

from app.core.config import settings

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/drive.file"]

# ── Token encryption ─────────────────────────────────────────────
# Derive a Fernet key from the app SECRET_KEY (first 32 bytes, base64-encoded)

def _get_fernet() -> Fernet:
    key_bytes = settings.SECRET_KEY.encode()[:32].ljust(32, b"\0")
    return Fernet(base64.urlsafe_b64encode(key_bytes))


def encrypt_token(token: str) -> str:
    return _get_fernet().encrypt(token.encode()).decode()


def decrypt_token(encrypted: str) -> str:
    return _get_fernet().decrypt(encrypted.encode()).decode()


# ── OAuth2 flow ──────────────────────────────────────────────────

def get_oauth_flow() -> Flow:
    client_config = {
        "web": {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
        }
    }
    flow = Flow.from_client_config(client_config, scopes=SCOPES)
    flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
    return flow


def get_authorization_url() -> str:
    flow = get_oauth_flow()
    url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",  # Force consent to always get refresh_token
    )
    return url


def exchange_code_for_tokens(code: str) -> dict:
    flow = get_oauth_flow()
    flow.fetch_token(code=code)
    creds = flow.credentials
    return {
        "access_token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
    }


# ── Drive operations ─────────────────────────────────────────────

def _build_drive_service(refresh_token_encrypted: str):
    """Build a Drive service from an encrypted refresh token."""
    refresh_token = decrypt_token(refresh_token_encrypted)
    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        scopes=SCOPES,
    )
    return build("drive", "v3", credentials=creds)


def ensure_folder(service, parent_id: Optional[str], folder_name: str) -> str:
    """Find or create a folder. Returns the folder ID."""
    query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    if parent_id:
        query += f" and '{parent_id}' in parents"

    results = service.files().list(
        q=query, spaces="drive", fields="files(id, name)", pageSize=1,
    ).execute()

    files = results.get("files", [])
    if files:
        return files[0]["id"]

    # Create folder
    metadata = {
        "name": folder_name,
        "mimeType": "application/vnd.google-apps.folder",
    }
    if parent_id:
        metadata["parents"] = [parent_id]

    folder = service.files().create(body=metadata, fields="id").execute()
    return folder["id"]


def upload_file(
    refresh_token_encrypted: str,
    agency_name: str,
    subfolder: str,  # "Daily Updates", "Monthly Analysis", "Yearly Analysis"
    filename: str,
    file_bytes: bytes,
    mime_type: str = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
) -> dict:
    """Upload a file to the agency's Drive folder structure. Returns file metadata."""
    service = _build_drive_service(refresh_token_encrypted)

    # Create folder hierarchy: NewsFlux Backups / {Agency} / {subfolder}
    root_id = ensure_folder(service, None, "NewsFlux Backups")
    agency_id = ensure_folder(service, root_id, agency_name)
    sub_id = ensure_folder(service, agency_id, subfolder)

    # Check if file already exists (overwrite)
    query = f"name='{filename}' and '{sub_id}' in parents and trashed=false"
    existing = service.files().list(
        q=query, spaces="drive", fields="files(id)", pageSize=1,
    ).execute().get("files", [])

    media = MediaInMemoryUpload(file_bytes, mimetype=mime_type)

    if existing:
        # Update existing file
        result = service.files().update(
            fileId=existing[0]["id"], media_body=media,
        ).execute()
    else:
        # Create new file
        metadata = {"name": filename, "parents": [sub_id]}
        result = service.files().create(
            body=metadata, media_body=media, fields="id, name, webViewLink",
        ).execute()

    return {
        "file_id": result.get("id"),
        "file_name": filename,
        "web_link": result.get("webViewLink", ""),
    }


def get_folder_id(refresh_token_encrypted: str, agency_name: str) -> Optional[str]:
    """Get the root backup folder ID for this agency (if exists)."""
    service = _build_drive_service(refresh_token_encrypted)
    query = "name='NewsFlux Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    results = service.files().list(
        q=query, spaces="drive", fields="files(id)", pageSize=1,
    ).execute()
    root_files = results.get("files", [])
    if not root_files:
        return None

    query = f"name='{agency_name}' and '{root_files[0]['id']}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
    agency_results = service.files().list(
        q=query, spaces="drive", fields="files(id)", pageSize=1,
    ).execute()
    agency_files = agency_results.get("files", [])
    return agency_files[0]["id"] if agency_files else None


def list_backup_files(refresh_token_encrypted: str, agency_name: str, subfolder: str, limit: int = 20) -> list:
    """List recent backup files in a subfolder."""
    service = _build_drive_service(refresh_token_encrypted)

    root_id = ensure_folder(service, None, "NewsFlux Backups")
    agency_id = ensure_folder(service, root_id, agency_name)
    sub_id = ensure_folder(service, agency_id, subfolder)

    results = service.files().list(
        q=f"'{sub_id}' in parents and trashed=false",
        spaces="drive",
        fields="files(id, name, createdTime, size, webViewLink)",
        orderBy="createdTime desc",
        pageSize=limit,
    ).execute()

    return results.get("files", [])
