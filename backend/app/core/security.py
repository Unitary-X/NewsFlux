from datetime import datetime, timedelta
from typing import Optional, Any
from jose import jwt
from passlib.context import CryptContext
from cryptography.fernet import Fernet
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Initialize encryption cipher for sensitive tokens
# In production, this key should be environment variable
ENCRYPTION_KEY = settings.SECRET_KEY.encode()[:32].ljust(32, b'0')  # Ensure 32 bytes
cipher_suite = Fernet(Fernet.generate_key())  # Use SECRET_KEY for deterministic key


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def encrypt_token(token: str) -> str:
    """Encrypt sensitive token (e.g., Google OAuth refresh token)"""
    from cryptography.fernet import Fernet
    import base64
    key = base64.urlsafe_b64encode(ENCRYPTION_KEY)
    cipher = Fernet(key)
    encrypted = cipher.encrypt(token.encode())
    return encrypted.decode()

def decrypt_token(encrypted_token: str) -> str:
    """Decrypt sensitive token"""
    from cryptography.fernet import Fernet
    import base64
    key = base64.urlsafe_b64encode(ENCRYPTION_KEY)
    cipher = Fernet(key)
    decrypted = cipher.decrypt(encrypted_token.encode())
    return decrypted.decode()

def create_access_token(subject: Any, role: str, tenant_id: Optional[str] = None, expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire, 
        "sub": str(subject),
        "role": role,
        "tenant_id": str(tenant_id) if tenant_id else None,
        "type": "access"
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(subject: Any, role: str, tenant_id: Optional[str] = None) -> str:
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "role": role,
        "tenant_id": str(tenant_id) if tenant_id else None,
        "type": "refresh"
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> dict:
    """Decode and validate JWT token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired")
    except jwt.JWTError:
        raise ValueError("Invalid token")
