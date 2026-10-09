from __future__ import annotations
from typing import Any, Optional
from pydantic import BaseModel, Field

class LLMExtractionRequest(BaseModel):
    field_name: str = Field(..., description="The currently active form field to extract.")
    transcript: str = Field(..., description="Citizen's spoken or typed utterance.")
    language: str = Field(default="hi", description="Language tag: hi, mr, or en.")
    allowed_values: Optional[list[str]] = Field(default=None, description="Allowed enum values if applicable.")

class LLMExtractionResponse(BaseModel):
    field: str = Field(..., description="Target form field.")
    value: Optional[Any] = Field(default=None, description="Extracted candidate value or None.")
    confidence: float = Field(default=0.9, ge=0.0, le=1.0, description="Confidence score.")
    confidence_flag: str = Field(default="needs_confirmation", description="Flag: needs_confirmation, retry, or low_confidence.")
    explanation: Optional[str] = Field(default="", description="Extraction rationale.")
    raw_transcript: str = Field(default="", description="Original transcript passed in.")
