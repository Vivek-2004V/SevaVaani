"""
Voice Assistant & Multimodal Turn Routes for SEVA VAANI.
Aggregates voice dialog turns, speech transcription, field confirmations, and text fallback.
"""

from __future__ import annotations
from fastapi import APIRouter, HTTPException, UploadFile, File

from app.schemas.turn import TurnRequest
from app.schemas.field import ConfirmRequest, FallbackTextRequest, HelpRequest
from app.services.voice_assistant import voice_assistant
from app.services.form_engine import FormEngine
from app.providers.stt_provider import BrowserSTTFallback
from app.api.turns import router as turns_router
from app.api.confirmations import router as confirmations_router
from app.api.fallback import router as fallback_router

router = APIRouter(tags=["Voice Assistant Dialog"])

# Mount composite sub-routers for turns, confirmation gates, and fallbacks
router.include_router(turns_router)
router.include_router(confirmations_router)
router.include_router(fallback_router)

__all__ = ["router"]
