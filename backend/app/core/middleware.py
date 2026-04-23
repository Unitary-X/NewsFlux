from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from jose import jwt, JWTError
from app.core.config import settings
import logging
import uuid

logger = logging.getLogger(__name__)

class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Allow open routes like login and docs
        open_routes = [
            "/health", 
            "/api/v1/auth/login", 
            "/api/v1/auth/register", 
            "/docs", 
            "/openapi.json", 
            "/api/v1/backup/google/callback",
            "/api/v1/superadmin/backup/gdrive/callback"
        ]
        if request.url.path in open_routes:
            return await call_next(request)

        auth_header = request.headers.get("Authorization")
        
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse(status_code=401, content={"detail": "Missing or invalid Authorization header"})

        token = auth_header.split(" ")[1]

        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            tenant_id_raw = payload.get("tenant_id")
            role = payload.get("role")
            
            # Convert tenant_id string to UUID object for SQLAlchemy Uuid columns
            if tenant_id_raw:
                try:
                    request.state.tenant_id = uuid.UUID(tenant_id_raw)
                except (ValueError, AttributeError):
                    request.state.tenant_id = tenant_id_raw
            else:
                request.state.tenant_id = None
            
            request.state.role = role
            request.state.user_id = payload.get("sub")
            
        except JWTError:
            return JSONResponse(status_code=401, content={"detail": "Invalid or expired token"})
            
        # Optional: You can add an enforcement layer here. 
        # If the route isn't meant for Super Admins, ensure tenant_id exists.
        if not request.state.tenant_id and role != "super_admin":
             return JSONResponse(status_code=403, content={"detail": "Data bleeding prevented. Valid Tenant ID required for this sub-role."})

        response = await call_next(request)
        return response
