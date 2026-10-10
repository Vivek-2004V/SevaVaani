"""
Context-Aware Form Guidance API Router for SEVA VAANI.

Empowers low-literacy users and citizens struggling with complex government terminology:
- Plain-language field explanations in Hindi, Marathi, and English.
- Real-world practical examples.
- Conversational spoken text for voice read-aloud.
- Guidance on spelling verification vs voice recognition confirmation.
"""

from __future__ import annotations
from typing import Dict, Any, Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.services.field_guidance import field_guidance_service

router = APIRouter(prefix="/api/guidance", tags=["Form Guidance & Low-Literacy Support"])


class ExplainFieldRequest(BaseModel):
    field_name: str = Field(..., description="Target form field name")
    language: str = Field("hi", description="Language code: hi, mr, en")


@router.get("/explain/{field_name}")
def get_field_explanation(
    field_name: str,
    language: str = Query("hi", description="Language code: hi, mr, en")
) -> Dict[str, Any]:
    """
    Returns simple explanation, example, and spoken read-aloud text for a specific field.
    """
    return field_guidance_service.get_field_guidance(field_name, language)


@router.post("/explain")
def post_field_explanation(payload: ExplainFieldRequest) -> Dict[str, Any]:
    """
    POST route for retrieving field guidance.
    """
    return field_guidance_service.get_field_guidance(payload.field_name, payload.language)
