from pydantic import BaseModel
from typing import Optional, Any, Union

class ConfirmRequest(BaseModel):
    session_id: str
    field_name: Optional[str] = None
    confirmed: Optional[Union[bool, str]] = None
    action: Optional[str] = None  # "confirm" or "reject"

class FallbackTextRequest(BaseModel):
    session_id: str
    field: Optional[str] = None
    field_name: Optional[str] = None
    value: Optional[str] = None
    typed_value: Optional[str] = None

class HelpRequest(BaseModel):
    session_id: str
    field_name: Optional[str] = None
    reason: str = "repeated_failures_or_citizen_request"
