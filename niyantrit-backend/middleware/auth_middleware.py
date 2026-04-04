from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from typing import List, Optional
from auth import verify_token
from database import SessionLocal
from models import User
import os

security = HTTPBearer()

def get_db():
    """Dependency for getting database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    credentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Verify JWT token and return current user.
    Raises HTTPException if token is invalid or user not found.
    """
    token = credentials.credentials
    
    token_data = verify_token(token)
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.email == token_data.email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive"
        )
    
    return user

def require_role(*roles: str):
    """
    Dependency factory for role-based access control.
    Usage: @app.post("/admin-endpoint", dependencies=[Depends(require_role("Admin"))])
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires one of these roles: {', '.join(roles)}"
            )
        return current_user
    
    return role_checker

def require_any_role(current_user: User = Depends(get_current_user)) -> User:
    """Allow any authenticated user."""
    return current_user

# Specific role requirements
def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Only Admin can access."""
    if current_user.role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

def require_official(current_user: User = Depends(get_current_user)) -> User:
    """Official or Admin can access."""
    if current_user.role not in ["Official", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Official access required"
        )
    return current_user

def require_citizen_or_contractor(current_user: User = Depends(get_current_user)) -> User:
    """Citizen or Contractor can access."""
    if current_user.role not in ["Citizen", "Contractor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Citizen or Contractor access required"
        )
    return current_user
