"""
ServiceSession Model for SEVA VAANI.
Represents an active multi-step citizen public service workflow.
"""

from __future__ import annotations
from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.form_answer import FormAnswer, ConsentRecord


def utcnow_iso() -> str:
    return datetime.utcnow().isoformat()


class ServiceSession(Base):
    __tablename__ = "service_sessions"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    language: Mapped[str] = mapped_column(String(10), nullable=False, default="hi")
    service_type: Mapped[str] = mapped_column(String(100), nullable=False, default="scholarship_app")
    current_step: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="in_progress")
    created_at: Mapped[str] = mapped_column(String(35), default=utcnow_iso, nullable=False)
    updated_at: Mapped[str] = mapped_column(String(35), default=utcnow_iso, onupdate=utcnow_iso, nullable=False)

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", back_populates="service_sessions")
    answers: Mapped[List["FormAnswer"]] = relationship(
        "FormAnswer", back_populates="service_session", cascade="all, delete-orphan"
    )
    consent_records: Mapped[List["ConsentRecord"]] = relationship(
        "ConsentRecord", back_populates="service_session", cascade="all, delete-orphan"
    )
