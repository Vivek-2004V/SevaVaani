"""
Service Sessions and Form Answers API Routes for SEVA VAANI.
Implements persistent multi-step form sessions, explicit confirmation barriers,
user ownership verification, and auditable consent persistence.
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.engine import get_db
from app.db.models import (
    User, ServiceSession, FormAnswer, ConsentRecord,
    generate_uuid, utcnow_iso
)
from app.api.auth import get_current_user, get_optional_current_user
from app.services.form_engine import FormEngine

router = APIRouter(prefix="/api/service-sessions", tags=["Service Sessions"])
engine = FormEngine()


# ═══════════════════════════════════════════════════════════════════
# Schemas
# ═══════════════════════════════════════════════════════════════════
class CreateSessionRequest(BaseModel):
    service_type: str = "scholarship_app"
    language: str = "hi"


class SaveAnswerRequest(BaseModel):
    field_key: str
    answer_value: Optional[str] = None
    is_confirmed: bool = False


class ConfirmAnswerRequest(BaseModel):
    field_key: str
    confirmed: bool


class ConsentRequest(BaseModel):
    consent_type: str = "final_submission"
    granted: bool


class AnswerResponse(BaseModel):
    id: int
    field_key: str
    answer_value: Optional[str]
    is_confirmed: bool
    created_at: str
    updated_at: str


class SessionDetailResponse(BaseModel):
    id: str
    user_id: Optional[str]
    service_type: str
    language: str
    current_step: Optional[str]
    status: str
    created_at: str
    updated_at: str
    answers: List[AnswerResponse]
    consent_records: List[Dict[str, Any]]


# ═══════════════════════════════════════════════════════════════════
# Helper: Verify Session Ownership
# ═══════════════════════════════════════════════════════════════════
def verify_session_ownership(
    session: ServiceSession,
    user: Optional[User]
) -> None:
    """
    If a service session is associated with an authenticated user account,
    ensures only that user can access or modify it.
    """
    if session.user_id is not None:
        if not user or session.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to access or modify this session"
            )


# ═══════════════════════════════════════════════════════════════════
# Endpoints
# ═══════════════════════════════════════════════════════════════════
@router.post("", status_code=status.HTTP_201_CREATED)
def create_service_session(
    payload: CreateSessionRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a new service session in SQLite.
    Automatically links to authenticated user if signed in, or supports guest citizen access.
    """
    now = utcnow_iso()
    session_id = f"sv-{generate_uuid().replace('-', '')}"
    initial_field = engine.fields[0]["name"] if engine.fields else "full_name"

    service_session = ServiceSession(
        id=session_id,
        user_id=current_user.id if current_user else None,
        language=payload.language,
        service_type=payload.service_type,
        current_step=initial_field,
        status="in_progress",
        created_at=now,
        updated_at=now
    )
    db.add(service_session)
    db.commit()
    db.refresh(service_session)

    # Synchronize with form_engine legacy sessions table for voice engine compatibility
    from sqlalchemy import text
    db.execute(
        text(
            """
            INSERT INTO sessions (session_id, user_id, service_id, language, current_field, status, created_at, updated_at)
            VALUES (:session_id, :user_id, :service_id, :language, :current_field, :status, :created_at, :updated_at)
            """
        ),
        {
            "session_id": session_id,
            "user_id": current_user.id if current_user else None,
            "service_id": payload.service_type,
            "language": payload.language,
            "current_field": initial_field,
            "status": "in_progress",
            "created_at": now,
            "updated_at": now
        }
    )
    db.commit()

    field_def = engine.get_field_def(initial_field)
    prompt = engine.get_localized_field_text(field_def, "prompt", payload.language) if field_def else ""

    return {
        "session_id": service_session.id,
        "service_type": service_session.service_type,
        "language": service_session.language,
        "current_step": service_session.current_step,
        "status": service_session.status,
        "user_id": service_session.user_id,
        "prompt": prompt,
        "created_at": service_session.created_at
    }


@router.get("/my", response_model=List[Dict[str, Any]])
def get_user_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves all service sessions owned by the authenticated user."""
    sessions = db.scalars(
        select(ServiceSession)
        .where(ServiceSession.user_id == current_user.id)
        .order_by(ServiceSession.created_at.desc())
    ).all()

    return [
        {
            "id": s.id,
            "service_type": s.service_type,
            "language": s.language,
            "current_step": s.current_step,
            "status": s.status,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
            "answers_count": len(s.answers)
        }
        for s in sessions
    ]


@router.get("/{session_id}", response_model=SessionDetailResponse)
def get_session_detail(
    session_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves detailed state of a service session, enforcing user ownership."""
    session = db.scalar(select(ServiceSession).where(ServiceSession.id == session_id))
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    verify_session_ownership(session, current_user)

    answers_list = [
        AnswerResponse(
            id=a.id,
            field_key=a.field_key,
            answer_value=a.answer_value,
            is_confirmed=a.is_confirmed,
            created_at=a.created_at,
            updated_at=a.updated_at
        )
        for a in session.answers
    ]

    consent_list = [
        {
            "id": c.id,
            "consent_type": c.consent_type,
            "granted": c.granted,
            "created_at": c.created_at
        }
        for c in session.consent_records
    ]

    return SessionDetailResponse(
        id=session.id,
        user_id=session.user_id,
        service_type=session.service_type,
        language=session.language,
        current_step=session.current_step,
        status=session.status,
        created_at=session.created_at,
        updated_at=session.updated_at,
        answers=answers_list,
        consent_records=consent_list
    )


@router.post("/{session_id}/answers", status_code=status.HTTP_200_OK)
def save_answer(
    session_id: str,
    payload: SaveAnswerRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Saves or updates a field answer.
    By default is_confirmed is False until explicit citizen confirmation.
    """
    session = db.scalar(select(ServiceSession).where(ServiceSession.id == session_id))
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    verify_session_ownership(session, current_user)

    now = utcnow_iso()
    answer = db.scalar(
        select(FormAnswer).where(
            FormAnswer.service_session_id == session_id,
            FormAnswer.field_key == payload.field_key
        )
    )

    if answer:
        answer.answer_value = payload.answer_value
        answer.is_confirmed = payload.is_confirmed
        answer.updated_at = now
    else:
        answer = FormAnswer(
            service_session_id=session_id,
            field_key=payload.field_key,
            answer_value=payload.answer_value,
            is_confirmed=payload.is_confirmed,
            created_at=now,
            updated_at=now
        )
        db.add(answer)

    session.updated_at = now
    db.commit()
    db.refresh(answer)

    return {
        "status": "saved",
        "session_id": session_id,
        "field_key": answer.field_key,
        "answer_value": answer.answer_value,
        "is_confirmed": answer.is_confirmed,
        "updated_at": answer.updated_at
    }


@router.post("/{session_id}/confirm", status_code=status.HTTP_200_OK)
def confirm_answer(
    session_id: str,
    payload: ConfirmAnswerRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Explicit Confirmation Barrier:
    Marks field answer as confirmed (is_confirmed = True) ONLY when citizen explicitly confirms.
    If rejected (confirmed = False), discards candidate value and keeps is_confirmed = False.
    """
    session = db.scalar(select(ServiceSession).where(ServiceSession.id == session_id))
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    verify_session_ownership(session, current_user)

    now = utcnow_iso()
    answer = db.scalar(
        select(FormAnswer).where(
            FormAnswer.service_session_id == session_id,
            FormAnswer.field_key == payload.field_key
        )
    )

    if not answer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Answer not found for field")

    if payload.confirmed:
        answer.is_confirmed = True
        answer.updated_at = now
        # Advance step if needed
        next_field = engine.get_next_field_name(payload.field_key)
        session.current_step = next_field
        session.updated_at = now
    else:
        # Rejected: candidate discarded
        answer.answer_value = None
        answer.is_confirmed = False
        answer.updated_at = now

    db.commit()
    db.refresh(answer)

    return {
        "status": "confirmed" if payload.confirmed else "rejected",
        "session_id": session_id,
        "field_key": answer.field_key,
        "is_confirmed": answer.is_confirmed,
        "next_step": session.current_step
    }


@router.post("/{session_id}/consent", status_code=status.HTTP_201_CREATED)
def record_consent(
    session_id: str,
    payload: ConsentRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Persists auditable final submission consent separate from individual field confirmations.
    """
    session = db.scalar(select(ServiceSession).where(ServiceSession.id == session_id))
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    verify_session_ownership(session, current_user)

    consent = ConsentRecord(
        service_session_id=session_id,
        consent_type=payload.consent_type,
        granted=payload.granted,
        created_at=utcnow_iso()
    )
    db.add(consent)
    db.commit()
    db.refresh(consent)

    return {
        "status": "consent_recorded",
        "session_id": session_id,
        "consent_id": consent.id,
        "consent_type": consent.consent_type,
        "granted": consent.granted,
        "created_at": consent.created_at
    }
