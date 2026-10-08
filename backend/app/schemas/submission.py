from pydantic import BaseModel
from typing import Optional

class SubmissionRequest(BaseModel):
    session_id: str
    consent: bool

class SubmissionResponse(BaseModel):
    status: str
    application_id: Optional[str] = None
    submitted_at: Optional[str] = None
    message: str
    session_state: Optional[dict] = None
