from pydantic import BaseModel
from typing import Optional

class SubmissionRequest(BaseModel):
    session_id: str
    consent: bool

class SubmissionResponse(BaseModel):
    status: str
    application_id: Optional[str] = None
    submitted_at: Optional[str] = None
    persistence_scope: Optional[str] = "saved_in_backend"
    government_portal_submitted: bool = False
    government_portal_status: Optional[str] = "no_direct_integration"
    is_duplicate: bool = False
    message: str
    session_state: Optional[dict] = None
