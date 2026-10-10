"""
FormAnswer and ConsentRecord Models for SEVA VAANI.
Implements the explicit confirmation gate and submission consent records.
"""

from __future__ import annotations
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Boolean, Integer, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.service_session import ServiceSession


def utcnow_iso() -> str:
    return datetime.utcnow().isoformat()


class FormAnswer(Base):
    __tablename__ = "form_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    service_session_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("service_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    field_key: Mapped[str] = mapped_column(String(100), nullable=False)
    answer_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_confirmed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    source: Mapped[str] = mapped_column(String(50), default="manual_entry", nullable=False)
    verification_status: Mapped[str] = mapped_column(String(50), default="unverified", nullable=False)
    document_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_encrypted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[str] = mapped_column(String(35), default=utcnow_iso, nullable=False)
    updated_at: Mapped[str] = mapped_column(String(35), default=utcnow_iso, onupdate=utcnow_iso, nullable=False)

    # Relationship
    service_session: Mapped["ServiceSession"] = relationship("ServiceSession", back_populates="answers")

    __table_args__ = (
        UniqueConstraint("service_session_id", "field_key", name="uq_session_field_answer"),
    )


class ConsentRecord(Base):
    __tablename__ = "consent_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    service_session_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("service_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    consent_type: Mapped[str] = mapped_column(String(100), nullable=False, default="final_submission")
    granted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[str] = mapped_column(String(35), default=utcnow_iso, nullable=False)

    # Relationship
    service_session: Mapped["ServiceSession"] = relationship("ServiceSession", back_populates="consent_records")


class DocumentVerification(Base):
    __tablename__ = "document_verifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("service_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    document_type: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    extracted_fields_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    discrepancy_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    verified_at: Mapped[str] = mapped_column(String(35), default=utcnow_iso, nullable=False)
