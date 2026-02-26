from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.middleware import TenantMiddleware

app = FastAPI(title="NewsFlux Backend", description="Multi-Tenant B2B SaaS Backend", version="1.0.0")

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

from seed import seed_database

@app.get("/seed")
def run_seed():
    seed_database()
    return {"message": "Database seeded successfully"}
