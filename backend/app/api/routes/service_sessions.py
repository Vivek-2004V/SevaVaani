"""
Service Sessions and Form Answers API Routes for SEVA VAANI.
Re-exports and provides canonical routes for managing citizen service sessions and answers.
"""

from __future__ import annotations
from app.api.service_sessions import (
    router,
    CreateSessionRequest,
    SaveAnswerRequest,
    ConfirmAnswerRequest,
    ConsentRequest,
    AnswerResponse,
    SessionDetailResponse
)

__all__ = [
    "router",
    "CreateSessionRequest",
    "SaveAnswerRequest",
    "ConfirmAnswerRequest",
    "ConsentRequest",
    "AnswerResponse",
    "SessionDetailResponse"
]
