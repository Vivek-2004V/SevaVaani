from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class SessionCreate(BaseModel):
    service_id: str = "scholarship_app"
    language: str = "hi"  # "hi" or "mr"

class TurnInput(BaseModel):
    session_id: str
    transcript: str
    input_type: str = "voice"  # "voice" or "simulated_voice"
    latency_ms: Optional[int] = 0

class ConfirmInput(BaseModel):
    session_id: str
    field_name: str
    action: str  # "confirm" (YES), "reject" (NO), "clarify"

class FallbackTextInput(BaseModel):
    session_id: str
    field_name: str
    typed_value: str

class HelpTicketRequest(BaseModel):
    session_id: str
    field_name: Optional[str] = None
    reason: str = "repeated_failure_or_user_request"

class SubmitInput(BaseModel):
    session_id: str
    consent: bool

class LanguageSwitchInput(BaseModel):
    session_id: str
    language: str  # "hi" or "mr"

class TurnResponse(BaseModel):
    session_id: str
    field_name: str
    status: str  # "need_confirmation", "retry", "text_fallback", "human_help", "invalid"
    candidate_value: Optional[Any] = None
    confidence: float
    message: str
    audio_text: str
    attempts: int
    allowed_actions: List[str]

class SessionStateResponse(BaseModel):
    session_id: str
    service_id: str
    language: str
    current_field: Optional[str]
    status: str
    confirmed_fields: Dict[str, Any]
    candidate_field: Optional[Dict[str, Any]] = None
    active_field_definition: Optional[Dict[str, Any]] = None
    current_prompt: Optional[str] = None
    progress: Dict[str, Any]

class MetricsResponse(BaseModel):
    total_sessions: int
    completed_sessions: int
    completion_rate_pct: float
    total_turns: int
    total_retries: int
    avg_retries_per_session: float
    text_fallback_count: int
    human_help_tickets: int
    median_latency_ms: float
    unconfirmed_critical_submitted: int
    field_extraction_accuracy_pct: float
    validation_accuracy_pct: float
