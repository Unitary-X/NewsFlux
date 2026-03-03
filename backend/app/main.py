from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.core.middleware import TenantMiddleware
from app.core.init_db import init_db
from app.core.config import settings, validate_configuration
from app.core.rate_limiting import setup_rate_limiting
from app.core.redis_client import check_redis_connection
from app.api.dependencies import test_database_connection
import logging

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Validate configuration at startup
    try:
        validate_configuration()
        logger.info("Configuration validation passed")
    except ValueError as e:
        logger.error(f"Configuration validation failed: {str(e)}")
        raise
    
    # Check Redis connectivity
    try:
        if not check_redis_connection():
            raise ConnectionError("Unable to connect to Redis")
        logger.info("Redis connection established")
    except Exception as e:
        logger.error(f"Redis connection failed: {str(e)}")
        raise
    
    # Check database connectivity
    try:
        if not test_database_connection():
            raise ConnectionError("Unable to connect to database")
        logger.info("Database connection verified")
    except Exception as e:
        logger.error(f"Database connection verification failed: {str(e)}")
        raise
    
    # Auto-create tables for SQLite (local dev without alembic)
    if settings.DATABASE_URL.startswith("sqlite"):
        from app.db.base_class import Base
        from app.api.dependencies import engine
        import app.models.models  # noqa: ensure models are registered
        Base.metadata.create_all(bind=engine)
        logger.info("SQLite tables created")
    
    # Initialize the core  database schema records on startup
    init_db()
    logger.info("Database initialized")
    yield

app = FastAPI(title="NewsFlux Backend", description="Multi-Tenant B2B SaaS Backend", version="1.0.0", lifespan=lifespan)

# Setup rate limiting
setup_rate_limiting(app)

# Setup CORS - restrict to frontend domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],  # Only allow the frontend URL
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Insert strict isolation mechanism
app.add_middleware(TenantMiddleware)

# Global exception handler for unhandled errors
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """
    Catch unhandled exceptions and return generic error message to client
    while logging the full error server-side for debugging
    """
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

@app.get("/health")
def read_health():
    return {"status": "ok", "message": "NewsFlux Backend is running!"}

from app.api.v1 import auth, admin, worker, superadmin, backup

# Add API routers:
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin Portal"])
app.include_router(worker.router, prefix="/api/v1/worker", tags=["Worker PWA"])
app.include_router(superadmin.router, prefix="/api/v1/superadmin", tags=["Platform Admin"])
app.include_router(backup.router, tags=["Google Drive Backup"])

