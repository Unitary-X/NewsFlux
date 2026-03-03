"""
Database configuration and base classes.

This module contains:
- base_class.py: Base class for all SQLAlchemy models
- Database engine initialization
- SQLAlchemy session configuration

All models should inherit from the base class defined in this module.
"""

from .base_class import Base

__all__ = [
    'Base',
]
