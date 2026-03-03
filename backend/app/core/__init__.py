"""
Core utilities and configurations for the NewsFlux application.

This module contains:
- Configuration management (config.py)
- Security utilities (security.py)
- Database initialization (init_db.py)
- Middleware for tenant isolation
- Audit logging and decorators
- Rate limiting setup
- Error handlers
"""

# Expose key utilities for easier importing
from .config import settings, validate_configuration
from .security import get_password_hash, verify_password, create_access_token, create_refresh_token, decode_token
from .init_db import init_db
from .redis_client import check_redis_connection
from .utils import validate_uuid, validate_uuid_optional, is_valid_uuid

__all__ = [
    # Configuration
    'settings',
    'validate_configuration',
    # Security
    'get_password_hash',
    'verify_password',
    'create_access_token',
    'create_refresh_token',
    'decode_token',
    # Database
    'init_db',
    # Redis
    'check_redis_connection',
    # Utilities
    'validate_uuid',
    'validate_uuid_optional',
    'is_valid_uuid',
]
