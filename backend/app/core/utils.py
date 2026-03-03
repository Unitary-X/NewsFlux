"""
Utility functions for common validations and conversions.
"""
from uuid import UUID, InvalidUUID
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)


def validate_uuid(uuid_string: str, field_name: str = "ID") -> UUID:
    """
    Safely validate and parse a UUID string.
    
    Args:
        uuid_string: String to validate as UUID
        field_name: Name of the field for error messages (e.g., "Template ID", "Agency ID")
        
    Returns:
        UUID object if valid
        
    Raises:
        HTTPException: 400 Bad Request if invalid UUID format
    """
    if not uuid_string:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} cannot be empty"
        )
    
    try:
        return UUID(uuid_string)
    except (ValueError, InvalidUUID, TypeError) as e:
        logger.warning(f"Invalid {field_name.lower()}: {uuid_string}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name} format. Must be a valid UUID (e.g., 550e8400-e29b-41d4-a716-446655440000)"
        )


def validate_uuid_optional(uuid_string: str | None, field_name: str = "ID") -> UUID | None:
    """
    Safely validate and parse an optional UUID string.
    
    Args:
        uuid_string: String to validate as UUID, or None
        field_name: Name of the field for error messages
        
    Returns:
        UUID object if provided and valid, None if not provided
        
    Raises:
        HTTPException: 400 Bad Request if provided but invalid UUID format
    """
    if not uuid_string:
        return None
    
    return validate_uuid(uuid_string, field_name)


def is_valid_uuid(uuid_string: str | None) -> bool:
    """
    Check if a string is a valid UUID without raising exceptions.
    
    Args:
        uuid_string: String to check
        
    Returns:
        True if valid UUID, False otherwise
    """
    if not uuid_string:
        return False
    
    try:
        UUID(uuid_string)
        return True
    except (ValueError, InvalidUUID, TypeError):
        return False
