from dataclasses import dataclass
from typing import Optional, Dict, Any

from app.models.user import User, generate_uuid, utcnow_iso
from app.models.auth_session import AuthSession
from app.models.service_session import ServiceSession
from app.models.form_answer import FormAnswer, ConsentRecord, DocumentVerification

@dataclass
class SessionModel:
    id: str
    service_id: str
    language: str
    status: str
    current_field: Optional[str]
    attempts: int
    created_at: str
    updated_at: str

@dataclass
class FieldValueModel:
    id: str
    session_id: str
    field_name: str
    candidate_value: Optional[str]
    confirmed_value: Optional[str]
    confidence: float
    confirmed: bool
    attempts: int
    created_at: str
    updated_at: str

@dataclass
class TurnModel:
    id: str
    session_id: str
    field_name: str
    input_type: str
    transcript: str
    confidence: float
    action: str
    latency_ms: int
    created_at: str

@dataclass
class HelpTicketModel:
    id: str
    session_id: str
    field_name: Optional[str]
    reason: str
    status: str
    created_at: str

@dataclass
class ApplicationModel:
    id: str
    session_id: str
    service_id: str
    consent: bool
    status: str
    data_json: str
    submitted_at: str

__all__ = [
    "User",
    "AuthSession",
    "ServiceSession",
    "FormAnswer",
    "ConsentRecord",
    "DocumentVerification",
    "generate_uuid",
    "utcnow_iso",
    "SessionModel",
    "FieldValueModel",
    "TurnModel",
    "HelpTicketModel",
    "ApplicationModel",
]
