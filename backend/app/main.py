from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.middleware import TenantMiddleware
from app.core.init_db import init_db
from app.core.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables for SQLite (local dev without alembic)
    if settings.DATABASE_URL.startswith("sqlite"):
        from app.db.base_class import Base
        from app.api.dependencies import engine
        import app.models.models  # noqa: ensure models are registered
        Base.metadata.create_all(bind=engine)
    # Initialize the core database schema records on startup
    init_db()
    yield

app = FastAPI(title="NewsFlux Backend", description="Multi-Tenant B2B SaaS Backend", version="1.0.0", lifespan=lifespan)
# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev. In Prod: restrict domain to newsflux frontend deployments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Insert strict isolation mechanism
app.add_middleware(TenantMiddleware)

@app.get("/health")
def read_health():
    return {"status": "ok", "message": "NewsFlux Backend is running!"}

from app.api.v1 import auth, admin, worker, superadmin

# Add API routers:
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin Portal"])
app.include_router(worker.router, prefix="/api/v1/worker", tags=["Worker PWA"])
app.include_router(superadmin.router, prefix="/api/v1/superadmin", tags=["Platform Admin"])

