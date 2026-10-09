"""
User Model for SEVA VAANI.
Stores citizen and operator accounts with Argon2id password hashes.
"""

from __future__ import annotations
import uuid
from datetime import datetime
from typing import List, TYPE_CHECKING
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.auth_session import AuthSession
    from app.models.service_session import ServiceSession


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utcnow_iso() -> str:
    return datetime.utcnow().isoformat()


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[str] = mapped_column(String(35), default=utcnow_iso, nullable=False)
    updated_at: Mapped[str] = mapped_column(String(35), default=utcnow_iso, onupdate=utcnow_iso, nullable=False)

    # Relationships
    auth_sessions: Mapped[List["AuthSession"]] = relationship(
        "AuthSession", back_populates="user", cascade="all, delete-orphan"
    )
    service_sessions: Mapped[List["ServiceSession"]] = relationship(
        "ServiceSession", back_populates="user", cascade="all, delete-orphan"
    )
