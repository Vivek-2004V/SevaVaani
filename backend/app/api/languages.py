from __future__ import annotations
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List

from app.services.language_registry import LanguageRegistry
from app.services.lid_adapter import IndicLanguageDetector

router = APIRouter(prefix="/api/languages", tags=["Language Registry & Detection"])

class DetectLanguageRequest(BaseModel):
    text: str

@router.get("", response_model=List[Dict[str, Any]])
def get_language_registry():
    """Returns the centralized language registry containing all 22 Schedule 8 languages and capabilities."""
    return LanguageRegistry.list_all()

@router.get("/{code}")
def get_language_capabilities(code: str):
    """Returns capability matrix for a specific language code."""
    lang = LanguageRegistry.get_by_code(code)
    if not lang:
        raise HTTPException(status_code=404, detail=f"Language '{code}' not recognized in registry.")
    caps = LanguageRegistry.get_capabilities(code)
    return {
        "language": lang,
        "capabilities": caps
    }

@router.post("/detect")
def detect_language(payload: DetectLanguageRequest):
    """Performs language identification on incoming utterance text."""
    return IndicLanguageDetector.detect_language(payload.text)
