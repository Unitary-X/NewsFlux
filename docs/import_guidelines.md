"""
Module and Import Guidelines for NewsFlux Backend

## Module Structure Overview

The NewsFlux backend is organized into distinct modules with clear responsibilities:

```
app/
├── api/              # API route handlers (FastAPI routers)
│   ├── v1/
│   │   ├── auth.py       # Authentication endpoints
│   │   ├── admin.py      # Admin panel endpoints
│   │   ├── worker.py     # Worker app endpoints
│   │   ├── backup.py     # Backup/export endpoints
│   │   └── superadmin.py # Super admin endpoints
│   └── dependencies.py   # Shared dependencies (get_db, roles, etc.)
│
├── core/             # Core utilities and configuration
│   ├── config.py         # Settings and environment config
│   ├── security.py       # JWT, password hashing
│   ├── init_db.py        # Database bootstrap
│   ├── middleware.py     # Tenant isolation middleware
│   ├── audit.py          # Audit logging utilities
│   ├── redis_client.py   # Redis integration
│   ├── rate_limiting.py  # Request rate limiting
│   ├── error_handlers.py # Error handling utilities
│   └── utils.py          # General utilities (UUID validation, etc.)
│
├── db/               # Database layer
│   └── base_class.py     # SQLAlchemy base class
│
├── models/           # SQLAlchemy ORM models
│   ├── __init__.py       # Model exports
│   └── models.py         # All model definitions
│
├── schemas/          # Pydantic validation schemas
│   ├── __init__.py       # Schema exports
│   ├── auth.py           # Auth request/response schemas
│   ├── admin.py          # Admin schemas
│   ├── worker.py         # Worker schemas
│   └── settings.py       # Config schemas
│
└── services/         # Business logic layer
    ├── email_service.py      # Email operations
    ├── email_tasks.py        # Celery email tasks
    ├── gdrive_service.py     # Google Drive operations
    ├── google_drive.py       # OAuth2 flow
    ├── excel_export.py       # Excel generation
    ├── backup_scheduler.py   # Scheduled backups
    └── billing_job.py        # Billing operations

main.py              # FastAPI app initialization
seed.py              # Database seeding
```

## Import Best Practices

### 1. Use Explicit Module Imports

❌ **Bad**: Wildcard imports (harder to trace, can cause conflicts)
```python
from app.models import *
from app.core import *
```

✅ **Good**: Explicit imports (clear what you're using)
```python
from app.models import User, Agency, Newspaper
from app.core import settings, validate_uuid, get_password_hash
```

### 2. Use Module __init__.py Files

The `__init__.py` files in each module expose the key public API:

```python
# app/core/__init__.py exposes these
from app.core import settings, validate_uuid, get_password_hash

# app/models/__init__.py exposes these
from app.models import User, Agency, Customer, Newspaper

# app.schemas/__init__.py exposes these  
from app.schemas import LoginRequest, AgencyRegisterRequest, Token
```

### 3. Import Organization

Within a module, organize imports in this order:

```python
# 1. Standard library
from datetime import datetime
import logging

# 2. Third-party libraries
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

# 3. Internal app imports
from app.core import settings, get_password_hash, validate_uuid
from app.models import User, Agency
from app.schemas import LoginRequest, Token
from app.api.dependencies import get_db, require_role
```

### 4. Relative vs Absolute Imports

For internal imports, prefer absolute imports (clearer and less fragile):

❌ **Bad**: Relative imports
```python
from ..core import settings
from ...models import User
```

✅ **Good**: Absolute imports
```python
from app.core import settings
from app.models import User
```

### 5. API Route Organization

In endpoint modules, import only what's needed:

```python
# backend/app/api/v1/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

# Import specific dependencies
from app.api.dependencies import get_db
from app.models import User, Agency
from app.schemas import LoginRequest, Token
from app.core import settings, get_password_hash, create_access_token

router = APIRouter()

@router.post("/login", response_model=Token)
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    # Implementation
    pass
```

## Dependency Injection Pattern

Services accept all dependencies as parameters (don't rely on global state):

```python
# ✅ Good: Dependencies injected
def create_backup(db: Session = Depends(get_db), settings: Settings = Depends(get_settings)):
    # Use db and settings directly
    pass

# ❌ Bad: Using globals
from app import db  # Don't do this
def create_backup():
    db.query(...)  # Harder to test, couples to global state
```

## Testing Imports

For unit tests, import only the functions you're testing:

```python
# test_security.py
from app.core.security import get_password_hash, verify_password

def test_password_hashing():
    hashed = get_password_hash("mypassword")
    assert verify_password("mypassword", hashed)
```

## Documentation on Imports

When exposing public APIs via `__init__.py`:

```python
# app/core/__init__.py
"""
Core utilities for NewsFlux backend.

Public API:
- settings: Application configuration object
- validate_uuid(): Safely validate UUID strings
- get_password_hash(): Hash a password securely
- verify_password(): Check a password against hash
"""

from .config import settings
from .security import get_password_hash, verify_password
from .utils import validate_uuid

__all__ = [
    'settings',
    'perform_hash',
    'verify_password', 
    'validate_uuid',
]
```

## Common Import Patterns

### In API Routes
```python
from app.api.dependencies import get_db, require_role
from app.core import settings, validate_uuid
from app.models import User, Customer
from app.schemas import UserRequest, UserResponse
```

### In Services
```python
from app.core import settings
from app.models import Invoice, Customer
import logging
```

### In Models
```python
from app.db import Base
from sqlalchemy import Column, String, DateTime
from uuid import UUID
```

## Circular Import Prevention

If you encounter circular imports, restructure to avoid them:

❌ **Circular**: 
```python
# models.py imports from schemas
# schemas.py imports from models
```

✅ **Fixed**: 
```python
# models.py has no import from schemas
# schemas.py can import from models (one-way dependency)
# Or create a third file that both can import from
```

## Migration Path

When refactoring imports:

1. Only export public APIs via `__init__.py`
2. Use explicit imports, not wildcards
3. Update documentation if API changes
4. Test imports work in both dev and prod environments
