from pydantic import BaseModel
from typing import Optional, Any, List

class TurnRequest(BaseModel):
    session_id: str
    transcript: str
    input_type: str = "voice"
    latency_ms: Optional[int] = 0

class TurnResponse(BaseModel):
    action: str  # CONFIRM | RETRY | TEXT_FALLBACK | HUMAN_HELP | INVALID
    field: str
    value: Optional[Any] = None
    confidence: float
    prompt: str
    audio_prompt: Optional[str] = None
    attempts: int = 1
    session_state: Optional[dict] = None
