"""
Secure Server-Side Speech API Router for SEVA VAANI.
Enforces security, privacy, and modular evaluation:
- Never exposes upstream API keys (BHASHINI_API_KEY, etc.) to the browser (Req 6 & 7)
- Processes audio in-memory with zero permanent disk storage (Req 8)
- Provides multi-model benchmark endpoint on identical audio samples (Req 9)
- Normalizes transcripts while strictly preserving original transcripts and named entities (Req 2 & 3)
"""

from __future__ import annotations
import base64
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Body
from pydantic import BaseModel, Field

from app.services.speech_pipeline import speech_pipeline, SpeechPipelineOrchestrator
from app.services.transcript_normalizer import TranscriptNormalizer
from app.providers.lid_provider import ScriptAndLexicalLIDProvider
from app.providers.accent_evaluator import AccentEvaluationModule
from app.providers.stt_provider import (
    MockSTTProvider,
    BrowserSTTFallback,
    BhashiniSTTProvider,
    LocalWhisperSTTProvider
)
from app.providers.tts_provider import BrowserTTSFallback, MockTTSProvider, BhashiniTTSProvider
from app.core.config import settings

router = APIRouter(prefix="/api/speech", tags=["Modular Speech Architecture"])


class TranscribeRequest(BaseModel):
    audio_base64: Optional[str] = Field(None, description="Base64-encoded audio bytes")
    language: str = Field("hi", description="Target language code (hi, mr, en)")
    client_transcript: Optional[str] = Field(None, description="Client Web Speech transcript fallback")
    field_hint: Optional[str] = Field(None, description="Current form field for contextual vocabulary biasing")


class SynthesizeRequest(BaseModel):
    text: str = Field(..., description="Text prompt to synthesize")
    language: str = Field("hi", description="Target language code (hi, mr, en)")
    rate: float = Field(0.92, description="Speech rate")
    pitch: float = Field(1.0, description="Speech pitch")


class IdentifyLanguageRequest(BaseModel):
    text: str = Field(..., description="Spoken or typed utterance to identify")


class NormalizeRequest(BaseModel):
    text: str = Field(..., description="Raw transcript to normalize")
    language: str = Field("hi", description="Language code")


class CompareModelsRequest(BaseModel):
    audio_base64: str = Field(..., description="Base64-encoded audio clip")
    reference_transcript: str = Field(..., description="Ground truth reference transcript for WER/CER calculation")
    language: str = Field("hi", description="Language code")


class PipelineTurnRequest(BaseModel):
    session_id: str = Field(..., description="Form application session UUID")
    audio_base64: Optional[str] = Field(None, description="Audio payload in base64")
    client_transcript: Optional[str] = Field(None, description="Spoken transcript from client")
    language_hint: Optional[str] = Field(None, description="Language hint")
    field_hint: Optional[str] = Field(None, description="Current form field for contextual vocabulary biasing")


class NameSpellingRequest(BaseModel):
    name: str = Field(..., description="Indian personal name to decompose and verify")
    language: str = Field("hi", description="Language code (hi, mr, en)")
    slow: bool = Field(False, description="Whether to include slower speech readback")


class NameCrossCheckRequest(BaseModel):
    spoken_name: str = Field(..., description="Spoken name transcript")
    document_name: str = Field(..., description="Document OCR extracted name")
    language: str = Field("hi", description="Language code (hi, mr, en)")


@router.get("/providers")
def list_providers() -> Dict[str, Any]:
    """
    Returns registered speech providers and their honest classification.
    NEVER exposes secrets, passwords, or upstream API keys to client.
    """
    return {
        "stt": {
            "current_active": speech_pipeline.stt.name,
            "provider_type": speech_pipeline.stt.provider_type,
            "is_mock": speech_pipeline.stt.is_mock,
            "available_providers": [
                {"name": "browser_native", "type": "browser_fallback", "is_mock": False},
                {"name": "bhashini", "type": "cloud_api", "is_mock": False, "configured": bool(settings.BHASHINI_API_KEY)},
                {"name": "faster_whisper", "type": "local_neural", "is_mock": False},
                {"name": "mock", "type": "mock", "is_mock": True}
            ]
        },
        "tts": {
            "current_active": speech_pipeline.tts.name,
            "provider_type": speech_pipeline.tts.provider_type,
            "is_mock": speech_pipeline.tts.is_mock,
            "available_providers": [
                {"name": "browser_native", "type": "browser_fallback", "is_mock": False},
                {"name": "bhashini", "type": "cloud_api", "is_mock": False, "configured": bool(settings.BHASHINI_API_KEY)},
                {"name": "mock", "type": "mock", "is_mock": True}
            ]
        },
        "lid": {
            "current_active": speech_pipeline.lid.name,
            "supported_languages": ["hi", "mr", "en", "hi-en"]
        },
        "privacy": {
            "storage_policy": "zero_permanent_disk_storage",
            "ephemeral_ram_processing": True
        }
    }


@router.post("/transcribe")
def transcribe_audio(payload: TranscribeRequest) -> Dict[str, Any]:
    """
    Secure server-side speech recognition endpoint.
    Handles base64 audio payload and returns recognized transcript.
    Applies contextual vocabulary biasing and hotwords if field_hint is provided.
    """
    audio_bytes = None
    if payload.audio_base64:
        try:
            audio_bytes = base64.b64decode(payload.audio_base64)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid audio_base64 encoding")

    ctx_prompt = None
    hotwords = None
    if payload.field_hint:
        from app.services.contextual_vocabulary import ContextualVocabularyService
        ctx_prompt = ContextualVocabularyService.get_context_prompt_for_field(payload.field_hint, payload.language)
        hotwords = ContextualVocabularyService.get_hotwords_for_field(payload.field_hint)

    result = speech_pipeline.stt.transcribe(
        audio_bytes=audio_bytes or b"",
        language=payload.language,
        client_transcript=payload.client_transcript,
        initial_prompt=ctx_prompt,
        hotwords=hotwords
    )
    return result


@router.post("/synthesize")
def synthesize_speech(payload: SynthesizeRequest) -> Dict[str, Any]:
    """
    Secure server-side text-to-speech synthesis endpoint.
    Prepares audio bytes or client-side speech synthesis parameters.
    """
    return speech_pipeline.tts.synthesize(
        text=payload.text,
        language=payload.language,
        rate=payload.rate,
        pitch=payload.pitch
    )


@router.post("/identify-language")
def identify_language(payload: IdentifyLanguageRequest) -> Dict[str, Any]:
    """
    Language identification endpoint.
    Detects language, script, code-switching, and flags unsupported languages.
    """
    return speech_pipeline.lid.identify(payload.text)


@router.post("/normalize-transcript")
def normalize_transcript(payload: NormalizeRequest) -> Dict[str, Any]:
    """
    Inverse Text Normalization (ITN) endpoint.
    Preserves original transcript alongside normalized version and logs entity protections.
    """
    return speech_pipeline.normalizer.normalize(payload.text, language=payload.language)


@router.post("/compare-models")
def compare_models(payload: CompareModelsRequest) -> Dict[str, Any]:
    """
    Requirement 9: Side-by-side comparative model evaluation on identical audio sample.
    Calculates WER, CER, and latency across candidate models.
    """
    try:
        audio_bytes = base64.b64decode(payload.audio_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid audio_base64 format")

    candidate_providers = [
        MockSTTProvider(predefined_transcript=payload.reference_transcript),
        BrowserSTTFallback(),
        BhashiniSTTProvider()
    ]

    return AccentEvaluationModule.evaluate_models_on_sample(
        audio_bytes=audio_bytes,
        reference_transcript=payload.reference_transcript,
        providers=candidate_providers,
        language=payload.language
    )


@router.post("/pipeline-turn")
def execute_pipeline_turn(payload: PipelineTurnRequest) -> Dict[str, Any]:
    """
    Full end-to-end 8-stage multimodal voice turn execution:
    Audio -> STT -> LID -> Normalizer -> FormEngine -> Response -> TTS.
    """
    audio_bytes = None
    if payload.audio_base64:
        try:
            audio_bytes = base64.b64decode(payload.audio_base64)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid audio_base64 encoding")

    return speech_pipeline.process_turn(
        session_id=payload.session_id,
        audio_bytes=audio_bytes,
        client_transcript=payload.client_transcript,
        language_hint=payload.language_hint,
        field_hint=payload.field_hint
    )


@router.get("/contextual-vocabulary/{field_name}")
def get_field_contextual_vocabulary(field_name: str, language: str = "hi") -> Dict[str, Any]:
    """
    Retrieves contextual vocabulary biasing prompt and hotword list for a specific public-service form field.
    """
    from app.services.contextual_vocabulary import ContextualVocabularyService
    return {
        "field_name": field_name,
        "language": language,
        "initial_prompt": ContextualVocabularyService.get_context_prompt_for_field(field_name, language),
        "hotwords": ContextualVocabularyService.get_hotwords_for_field(field_name)
    }


@router.post("/name/spelling-breakdown")
def get_name_spelling_breakdown(payload: NameSpellingRequest) -> Dict[str, Any]:
    """
    Decomposes Indian personal names into character-level units with spaced pronunciation
    and phonetic variant ambiguity detection (e.g. Meenakshi vs Minakshi).
    """
    from app.services.name_pronunciation import NamePronunciationService
    return NamePronunciationService.format_name_confirmation_dialogue(
        payload.name, language=payload.language, slow=payload.slow
    )


@router.post("/name/cross-check")
def cross_check_name(payload: NameCrossCheckRequest) -> Dict[str, Any]:
    """
    Compares spoken name transcript against document OCR extracted name with Aadhaar masking.
    Never silently overwrites: provides explicit citizen options.
    """
    from app.services.name_pronunciation import NamePronunciationService
    return NamePronunciationService.compare_spoken_vs_document_name(
        payload.spoken_name, payload.document_name, language=payload.language
    )

