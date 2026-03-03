"""
Secure error handling utilities for API responses
Hides internal server details from clients while logging them properly
"""

import logging
from fastapi import HTTPException
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

class SecureHTTPException(HTTPException):
    """
    Custom HTTPException that logs internal details but returns generic message to client
    """
    def __init__(self, status_code: int, detail: str, internal_detail: str = None):
        super().__init__(status_code=status_code, detail=detail)
        self.internal_detail = internal_detail or detail


def log_and_hide_error(error: Exception, context: str = "API Error", status_code: int = 500):
    """
    Log the full error internally while returning a generic message to the client
    
    Args:
        error: The original exception
        context: Context description for logging
        status_code: HTTP status code to return
        
    Returns:
        HTTPException with generic message
    """
    # Log the full error internally (for debugging)
    logger.error(f"{context}: {str(error)}", exc_info=True)
    
    # Return generic message to client
    generic_message = "An error occurred processing your request"
    if status_code == 400:
        generic_message = "Invalid request"
    elif status_code == 401:
        generic_message = "Authentication failed"
    elif status_code == 403:
        generic_message = "Access denied"
    elif status_code == 404:
        generic_message = "Resource not found"
    elif status_code == 409:
        generic_message = "Conflict with existing data"
    elif status_code == 500:
        generic_message = "Internal server error"
    elif status_code == 503:
        generic_message = "Service temporarily unavailable"
    
    raise HTTPException(status_code=status_code, detail=generic_message)


def handle_database_error(error: Exception):
    """Handle database errors securely"""
    logger.error(f"Database error: {str(error)}", exc_info=True)
    raise HTTPException(status_code=500, detail="Database operation failed")


def handle_external_api_error(error: Exception, api_name: str):
    """Handle external API errors (Google Drive, email, etc.) securely"""
    logger.error(f"{api_name} API error: {str(error)}", exc_info=True)
    raise HTTPException(status_code=503, detail=f"Unable to reach {api_name} service")


def handle_validation_error(error: Exception):
    """Handle validation errors securely"""
    logger.warning(f"Validation error: {str(error)}")
    raise HTTPException(status_code=400, detail="Invalid input provided")
