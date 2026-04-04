from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from pydantic import BaseModel
import os
import hashlib
import bcrypt
from dotenv import load_dotenv

load_dotenv()

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("FATAL: SECRET_KEY environment variable is not set. Cannot start application without a configured secret.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Password hashing configuration
PASSWORD_HASH_PREFIX = "bcrypt_sha256$"

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None
    role: Optional[str] = None

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenRequest(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "Citizen"
    phone: Optional[str] = None

def hash_password(password: str) -> str:
    """Hash a password with SHA-256 pre-hash + bcrypt.

    bcrypt only accepts up to 72 bytes of input. Pre-hashing avoids
    silent truncation and supports long passphrases consistently.
    """
    prehashed_password = _prehash_password(password)
    hashed = bcrypt.hashpw(prehashed_password, bcrypt.gensalt()).decode("utf-8")
    return f"{PASSWORD_HASH_PREFIX}{hashed}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against current or legacy hash formats."""
    if not plain_password or not hashed_password:
        return False

    try:
        # Current format: bcrypt_sha256$<bcrypt-hash>
        if hashed_password.startswith(PASSWORD_HASH_PREFIX):
            stored_hash = hashed_password[len(PASSWORD_HASH_PREFIX):].encode("utf-8")
            return bcrypt.checkpw(_prehash_password(plain_password), stored_hash)

        # Backward compatibility for existing records created with plain bcrypt.
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except (ValueError, TypeError):
        return False

def _prehash_password(password: str) -> bytes:
    """Return deterministic bytes suitable for bcrypt input."""
    return hashlib.sha256(password.encode("utf-8")).digest()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token with token-type claim."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[TokenData]:
    """Verify a JWT access token and return token data."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Validate token type for access tokens
        token_type = payload.get("type")
        if token_type == "refresh":
            # Refresh tokens are not valid where access tokens are required
            return None
        
        # Extract and validate claims
        email: Optional[str] = payload.get("sub")
        user_id_raw: Optional[str] = payload.get("user_id")
        role: Optional[str] = payload.get("role")
        
        if email is None or not isinstance(email, str):
            return None
        
        # Convert and validate user_id to int
        try:
            user_id: int = int(user_id_raw)
        except (ValueError, TypeError):
            return None
        
        if role is None or not isinstance(role, str):
            return None
        
        return TokenData(email=email, user_id=user_id, role=role)
    except JWTError:
        return None

def create_tokens(user_id: int, email: str, role: str) -> Token:
    """Create both access and refresh tokens for a user."""
    access_token = create_access_token({
        "sub": email,
        "user_id": user_id,
        "role": role
    })
    
    refresh_token = create_refresh_token({
        "sub": email,
        "user_id": user_id,
        "role": role
    })
    
    return Token(access_token=access_token, refresh_token=refresh_token)
