from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class SessionCreateRequest(BaseModel):
    service_id: str = "scholarship_application"
    language: str = "hi"  # "hi" or "mr"

class SessionLanguageRequest(BaseModel):
    session_id: str
    language: str  # "hi" or "mr"

class SessionResponse(BaseModel):
    session_id: str
    service_id: str
    language: str
    status: str
    current_field: Optional[str]
    first_prompt: Optional[str] = None
    prompt: Optional[str] = None

class PendingCandidate(BaseModel):
    field: str
    value: Any
    confidence: float

class SessionStateResponse(BaseModel):
    session_id: str
    service_id: str
    language: str
    status: str
    current_field: Optional[str]
    attempts: int
    pending_candidate: Optional[PendingCandidate] = None
    values: Dict[str, Any] = {}
    current_prompt: Optional[str] = None
    progress: Dict[str, Any] = {}
