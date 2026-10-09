"""
Authentication & User Management API Routes for SEVA VAANI.
Re-exports and provides canonical routes for user authentication.
"""

from __future__ import annotations
from app.api.auth import (
    router,
    RegisterRequest,
    LoginRequest,
    UserResponse,
    LoginResponse,
    get_token_from_header,
    get_current_user,
    get_optional_current_user
)

__all__ = [
    "router",
    "RegisterRequest",
    "LoginRequest",
    "UserResponse",
    "LoginResponse",
    "get_token_from_header",
    "get_current_user",
    "get_optional_current_user",
]
