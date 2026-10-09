"""
AuthSession Model for SEVA VAANI.
Stores hashed authentication tokens with explicit revocation timestamps.
"""

from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utcnow_iso() -> str:
    return datetime.utcnow().isoformat()


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    expires_at: Mapped[str] = mapped_column(String(35), nullable=False)
    created_at: Mapped[str] = mapped_column(String(35), default=utcnow_iso, nullable=False)
    revoked_at: Mapped[Optional[str]] = mapped_column(String(35), nullable=True)

    # Relationship
    user: Mapped["User"] = relationship("User", back_populates="auth_sessions")
