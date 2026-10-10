from pydantic import BaseModel
from typing import Optional, Any, Union

class ConfirmRequest(BaseModel):
    session_id: str
    field_name: Optional[str] = None
    confirmed: Optional[Union[bool, str]] = None
    action: Optional[str] = None  # "confirm", "reject", "edit_spelling", "update_candidate"
    updated_value: Optional[str] = None
    source: Optional[str] = "voice_recognition"
    verification_status: Optional[str] = "unverified"
    document_type: Optional[str] = None

class FallbackTextRequest(BaseModel):
    session_id: str
    field: Optional[str] = None
    field_name: Optional[str] = None
    value: Optional[str] = None
    typed_value: Optional[str] = None

class HelpRequest(BaseModel):
    session_id: Optional[str] = None
    field_name: Optional[str] = None
    reason: str = "repeated_failures_or_citizen_request"
    category: Optional[str] = "other"
    description: Optional[str] = None
    language: Optional[str] = "hi"
