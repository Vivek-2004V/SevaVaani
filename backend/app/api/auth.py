"""
Authentication & User Management API Routes for SEVA VAANI.
Implements:
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- POST /api/auth/logout
- DELETE /api/auth/me
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.db.engine import get_db
from app.db.models import User
from app.services.auth_service import AuthService

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ═══════════════════════════════════════════════════════════════════
# Schemas
# ═══════════════════════════════════════════════════════════════════
class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    is_active: bool
    created_at: str


class LoginResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    expires_at: str
    user: UserResponse


# ═══════════════════════════════════════════════════════════════════
# Authentication Dependencies
# ═══════════════════════════════════════════════════════════════════
def get_token_from_header(authorization: Optional[str] = Header(None)) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


def get_current_user(
    token: Optional[str] = Depends(get_token_from_header),
    db: Session = Depends(get_db)
) -> User:
    """Enforces authentication; returns active User or raises 401."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header",
            headers={"WWW-Authenticate": "Bearer"}
        )
    user = AuthService.get_user_from_token(db, token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid, expired, or revoked token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user


def get_optional_current_user(
    token: Optional[str] = Depends(get_token_from_header),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Returns User if valid bearer token present, else None."""
    if not token:
        return None
    return AuthService.get_user_from_token(db, token)


# ═══════════════════════════════════════════════════════════════════
# Endpoints
# ═══════════════════════════════════════════════════════════════════
@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=UserResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Registers a new user with normalized email and Argon2id hash."""
    try:
        user = AuthService.register_user(db, payload.email, payload.password)
        return UserResponse(
            id=user.id,
            email=user.email,
            is_active=user.is_active,
            created_at=user.created_at
        )
    except ValueError as e:
        err_msg = str(e)
        if "already registered" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Registration failed")


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticates credentials and returns a secure 256-bit session token."""
    try:
        user = AuthService.authenticate_user(db, payload.email, payload.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"}
            )

        raw_token, auth_session = AuthService.create_auth_session(db, user.id)
        return LoginResponse(
            token=raw_token,
            token_type="bearer",
            expires_at=auth_session.expires_at,
            user=UserResponse(
                id=user.id,
                email=user.email,
                is_active=user.is_active,
                created_at=user.created_at
            )
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Authentication failed")


@router.get("/me", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    """Retrieves profile of the currently authenticated citizen/operator."""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        is_active=current_user.is_active,
        created_at=current_user.created_at
    )


@router.post("/logout")
def logout(
    token: Optional[str] = Depends(get_token_from_header),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Explicitly revokes the current session token."""
    if token:
        AuthService.revoke_session(db, token)
    return {"status": "logged_out", "message": "Session revoked successfully"}


@router.delete("/me")
def delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Permanently deletes the citizen's account and cascades to all child records (Data Minimization)."""
    success = AuthService.delete_user_account(db, current_user.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return {"status": "deleted", "message": "User account and all associated records permanently erased"}
