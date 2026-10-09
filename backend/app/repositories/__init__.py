"""
Repositories Package for SEVA VAANI.
Encapsulates database access for ORM models and legacy compatibility repositories.
"""

from app.repositories.base import BaseRepository
from app.repositories.service_session_repository import ServiceSessionRepository
from app.repositories.form_answer_repository import FormAnswerRepository, ConsentRecordRepository
from app.repositories.user_repository import UserRepository
from app.db.repositories import (
    SessionRepository,
    FieldValueRepository,
    TurnRepository,
    HelpTicketRepository,
    ApplicationRepository
)

__all__ = [
    "BaseRepository",
    "ServiceSessionRepository",
    "FormAnswerRepository",
    "ConsentRecordRepository",
    "UserRepository",
    "SessionRepository",
    "FieldValueRepository",
    "TurnRepository",
    "HelpTicketRepository",
    "ApplicationRepository"
]
