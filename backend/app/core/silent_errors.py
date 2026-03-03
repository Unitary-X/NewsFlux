"""
Silent error logging utilities for non-critical errors.

This module provides helpers for logging errors that don't break user-facing functionality
but should still be tracked for monitoring and debugging.

Silent errors are logged but not surfaced to the user. Examples:
- Failed email send while creating user (user created successfully)
- Failed cache operation (fallback to database)
- Failed analytics event (request still processed)
- External API timeouts (graceful degradation)
"""

import logging
import functools
from typing import Callable, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


def log_silent_error(
    error: Exception,
    context: str,
    user_id: Optional[str] = None,
    additional_info: Optional[dict] = None,
    level: str = "warning"
) -> None:
    """
    Log an error that doesn't interrupt user experience.
    
    Use this for non-critical operations that failed but don't affect the main request.
    Examples:
    - Email send failures
    - Cache operation failures  
    - Analytics event failures
    - Optional integrations (email, slack, etc.)
    
    Args:
        error: The exception that occurred
        context: Description of what was being attempted (e.g., "send welcome email")
        user_id: Optional user ID for tracing (helps with debugging user-specific issues)
        additional_info: Optional dictionary of context data
        level: Log level - "debug", "info", "warning" (default), "error"
    
    Returns:
        None - This function never raises
    
    Example:
        try:
            send_email(user.email, template)
        except SMTPException as e:
            log_silent_error(e, "send welcome email", user_id=user.id)
            # Continue without raising
    """
    try:
        log_func = getattr(logger, level.lower(), logger.warning)
        
        # Build log message
        msg = f"Silent error during {context}: {error.__class__.__name__}"
        if user_id:
            msg += f" (user_id: {user_id})"
        
        # Include additional context
        extra_context = {
            "error_type": error.__class__.__name__,
            "error_message": str(error),
            "context": context,
        }
        if user_id:
            extra_context["user_id"] = user_id
        if additional_info:
            extra_context.update(additional_info)
        
        log_func(msg, extra=extra_context, exc_info=True)
    except Exception as logging_error:
        # Prevent logging from breaking the app
        print(f"Failed to log silent error: {logging_error}", flush=True)


def silent_operation(
    context: str,
    default_return: Any = None,
    log_level: str = "warning"
) -> Callable:
    """
    Decorator for operations that shouldn't crash the main request if they fail.
    
    Silently logs any exceptions and returns a default value instead of raising.
    Perfect for:
    - Optional integrations (email, analytics, slack)
    - Cache operations that have database fallbacks
    - Cleanup operations
    
    Args:
        context: Description of operation (e.g., "send slack notification")
        default_return: Value to return if operation fails (default: None)
        log_level: Log level for errors (default: "warning")
    
    Returns:
        Decorated function that never raises, only logs
    
    Example:
        @silent_operation("send welcome email")
        def send_email(user):
            sendmail(user.email)  # If this fails, just log it
    
    Example with return value:
        @silent_operation("fetch from cache", default_return=[])
        def get_cached_customers(user_id):
            return redis.get(f"customers:{user_id}")
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            try:
                return func(*args, **kwargs)
            except Exception as e:
                # Extract user_id if available in args/kwargs
                user_id = kwargs.get('user_id') or kwargs.get('tenant_id')
                log_silent_error(e, context, user_id=user_id, level=log_level)
                return default_return
        return wrapper
    return decorator


def log_non_critical_operation(operation_name: str, user_id: Optional[str] = None):
    """
    Context manager for non-critical operations.
    
    Catches and logs any exceptions without raising.
    Useful for try-except blocks that shouldn't break the main flow.
    
    Args:
        operation_name: Name of the operation for logging
        user_id: Optional user ID for context
    
    Returns:
        Context manager
    
    Example:
        with log_non_critical_operation("send analytics event", user_id=user.id):
            analytics.track("user_login", {"agency_id": agency.id})
            # Even if analytics fails, request continues
    """
    class NonCriticalOperation:
        def __enter__(self):
            return self
        
        def __exit__(self, exc_type, exc_val, exc_tb):
            if exc_type is not None:
                err = exc_val or Exception(f"Unknown error in {operation_name}")
                log_silent_error(err, operation_name, user_id=user_id)
            return True  # Suppress exception
    
    return NonCriticalOperation()


class SilentErrorCollector:
    """
    Collect multiple non-critical errors for batch logging.
    
    Useful when you want to attempt multiple operations and log all failures
    without stopping at the first error.
    
    Example:
        errors = SilentErrorCollector(context="user registration")
        try:
            send_welcome_email(user)
        except Exception as e:
            errors.add(e)
        
        try:
            create_slack_notification(user)
        except Exception as e:
            errors.add(e)
        
        errors.log_all()  # Log all collected errors at once
    """
    
    def __init__(self, context: str, user_id: Optional[str] = None):
        self.context = context
        self.user_id = user_id
        self.errors: list = []
    
    def add(self, error: Exception, operation: str = "") -> None:
        """
        Add an error to the collection.
        
        Args:
            error: Exception that occurred
            operation: Optional description of what was being attempted
        """
        self.errors.append({
            "error": error,
            "operation": operation,
            "timestamp": datetime.utcnow()
        })
    
    def log_all(self, log_level: str = "warning") -> int:
        """
        Log all collected errors.
        
        Args:
            log_level: Log level for all errors
        
        Returns:
            Number of errors logged
        """
        for item in self.errors:
            error = item["error"]
            operation = item["operation"]
            msg = f"{self.context}"
            if operation:
                msg += f" > {operation}"
            
            log_silent_error(error, msg, user_id=self.user_id, level=log_level)
        
        return len(self.errors)
    
    def has_errors(self) -> bool:
        """Check if any errors were collected."""
        return len(self.errors) > 0
    
    def clear(self) -> None:
        """Clear collected errors."""
        self.errors = []


# Examples of where to use silent error logging in the codebase:
SILENT_ERROR_PATTERNS = """
# 1. Email operations
try:
    await send_email(user.email, "welcome")
except Exception as e:
    log_silent_error(e, "send welcome email", user_id=user.id)

# 2. External API calls with fallbacks
try:
    gdrive_backup = create_gdrive_backup(agency)
except Exception as e:
    log_silent_error(e, "create google drive backup", user_id=user.id)
    # Fall back to local storage instead

# 3. Analytics and metrics
with log_non_critical_operation("track user login", user_id=user.id):
    metrics.track("login", {"agency": user.tenant_id})

# 4. Cache invalidation
@silent_operation("invalidate user cache", default_return=None)
def clear_cache(user_id):
    redis.delete(f"user:{user_id}")

# 5. Batch operations with error collection
errors = SilentErrorCollector("user registration", user_id=new_user.id)
try:
    send_welcome_email(new_user)
except Exception as e:
    errors.add(e, "send welcome email")

try:
    create_onboarding_tasks(new_user)
except Exception as e:
    errors.add(e, "create onboarding tasks")

errors.log_all()
"""
