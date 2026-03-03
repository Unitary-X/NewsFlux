"""
Redis client for managing password reset tokens and other ephemeral data.
Uses Redis with automatic expiration instead of in-memory storage.
"""
import redis
import os
from datetime import timedelta
import json

# Initialize Redis client
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = redis.from_url(redis_url, decode_responses=True)

# Key prefixes
PASSWORD_RESET_TOKEN_PREFIX = "password_reset_token:"
PASSWORD_RESET_USERNAME_PREFIX = "password_reset_username:"


def store_password_reset_token(username: str, token: str, expiry_hours: int = 1) -> None:
    """
    Store a password reset token in Redis with automatic expiration.
    
    Args:
        username: Username requesting password reset
        token: Generated reset token
        expiry_hours: Hours until token expires (default 1 hour)
    """
    expiry_seconds = expiry_hours * 3600
    
    # Store token -> username mapping (for lookup)
    redis_client.setex(
        f"{PASSWORD_RESET_TOKEN_PREFIX}{token}",
        expiry_seconds,
        username
    )
    
    # Store most recent token for username (for user cooldown/rate limiting if needed)
    redis_client.setex(
        f"{PASSWORD_RESET_USERNAME_PREFIX}{username}",
        expiry_seconds,
        token
    )


def get_username_by_reset_token(token: str) -> str | None:
    """
    Retrieve the username associated with a reset token.
    
    Args:
        token: Reset token to look up
        
    Returns:
        Username if token exists and is valid, None otherwise
    """
    username = redis_client.get(f"{PASSWORD_RESET_TOKEN_PREFIX}{token}")
    return username


def invalidate_reset_token(token: str) -> None:
    """
    Invalidate a reset token after successful use.
    
    Args:
        token: Token to invalidate
    """
    # Delete both the token->username and username->token mappings
    username = redis_client.get(f"{PASSWORD_RESET_TOKEN_PREFIX}{token}")
    if username:
        redis_client.delete(f"{PASSWORD_RESET_TOKEN_PREFIX}{token}")
        redis_client.delete(f"{PASSWORD_RESET_USERNAME_PREFIX}{username}")


def get_reset_token_by_username(username: str) -> str | None:
    """
    Get the most recent reset token for a username (if it exists and hasn't expired).
    
    Args:
        username: Username to look up
        
    Returns:
        Token if exists, None otherwise
    """
    return redis_client.get(f"{PASSWORD_RESET_USERNAME_PREFIX}{username}")


def check_redis_connection() -> bool:
    """
    Check if Redis is accessible.
    
    Returns:
        True if connection successful, False otherwise
    """
    try:
        redis_client.ping()
        return True
    except Exception:
        return False
