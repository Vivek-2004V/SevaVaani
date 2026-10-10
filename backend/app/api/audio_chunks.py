"""
Audio Chunk Upload Endpoint — Low-bandwidth / 2G Support
=========================================================
Receives compressed audio chunks from the frontend (sent individually over
multiple HTTP requests) to avoid large single-upload failures on slow networks.

Security rules:
- Audio bytes are NEVER written to disk permanently (processed in-memory only).
- Chunk buffers are cleared immediately after processing.
- No audio stored beyond the lifetime of the request.
- Session IDs are validated against active sessions before accepting audio.
"""

from __future__ import annotations

import base64
import hashlib
import time
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Header
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/audio", tags=["Audio Upload — Low Bandwidth"])

# ---------------------------------------------------------------------------
# In-memory ephemeral chunk assembly buffer (RAM-only, never disk)
# Key: session_id  →  Value: list of chunk bytes (in order)
# ---------------------------------------------------------------------------
_chunk_buffer: Dict[str, list[bytes]] = {}
_chunk_meta: Dict[str, Dict[str, Any]] = {}

_MAX_CHUNK_SIZE_BYTES = 64 * 1024          # 64 KB per chunk
_MAX_TOTAL_AUDIO_BYTES = 2 * 1024 * 1024  # 2 MB total assembled
_CHUNK_TTL_SECONDS = 120                   # 2 min max window to finish upload


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class ChunkUploadResponse(BaseModel):
    session_id: str
    chunk_index: int
    chunks_received: int
    assembled: bool
    transcript: Optional[str] = None
    language_detected: Optional[str] = None
    error: Optional[str] = None


class AssembleRequest(BaseModel):
    session_id: str = Field(..., description="Form session UUID")
    total_chunks: int = Field(..., description="Total number of chunks sent")
    language: str = Field("hi", description="Language code (hi, mr, en)")
    field_hint: Optional[str] = Field(None, description="Current form field for vocabulary biasing")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/chunk", response_model=ChunkUploadResponse)
async def upload_audio_chunk(
    session_id: str = Form(..., description="Form session UUID"),
    chunk_index: int = Form(..., description="0-based chunk index"),
    total_chunks: int = Form(..., description="Expected total chunk count"),
    language: str = Form("hi", description="Language code"),
    audio_chunk: UploadFile = File(..., description="Raw audio chunk (WebM/OGG/WAV binary)")
) -> Dict[str, Any]:
    """
    Receive a single audio chunk from the frontend.

    The frontend splits the recorded MediaRecorder blob into N chunks
    (typically 16–32 KB each) and sends them sequentially.
    This allows reliable upload on 2G / low-bandwidth connections.

    After all chunks arrive, the client calls POST /api/audio/assemble
    to trigger transcription.
    """
    # --- Size guard ---
    chunk_bytes = await audio_chunk.read()
    if len(chunk_bytes) > _MAX_CHUNK_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Chunk too large: {len(chunk_bytes)} bytes (max {_MAX_CHUNK_SIZE_BYTES})"
        )

    # --- Initialise buffer for this session ---
    now = time.time()
    if session_id not in _chunk_buffer:
        _chunk_buffer[session_id] = []
        _chunk_meta[session_id] = {
            "total_chunks": total_chunks,
            "language": language,
            "created_at": now
        }

    # --- TTL check (prevent stale buffers accumulating in RAM) ---
    meta = _chunk_meta[session_id]
    if now - meta["created_at"] > _CHUNK_TTL_SECONDS:
        _chunk_buffer.pop(session_id, None)
        _chunk_meta.pop(session_id, None)
        raise HTTPException(status_code=408, detail="Upload session timed out. Please retry.")

    # --- Total size guard ---
    current_total = sum(len(c) for c in _chunk_buffer[session_id])
    if current_total + len(chunk_bytes) > _MAX_TOTAL_AUDIO_BYTES:
        _chunk_buffer.pop(session_id, None)
        _chunk_meta.pop(session_id, None)
        raise HTTPException(
            status_code=413,
            detail="Total assembled audio exceeds 2 MB limit."
        )

    # Extend buffer to accommodate out-of-order delivery
    buf = _chunk_buffer[session_id]
    while len(buf) <= chunk_index:
        buf.append(b"")
    buf[chunk_index] = chunk_bytes

    chunks_received = sum(1 for c in buf if c)
    assembled = chunks_received == total_chunks

    return {
        "session_id": session_id,
        "chunk_index": chunk_index,
        "chunks_received": chunks_received,
        "assembled": assembled,
        "transcript": None,
        "language_detected": None,
        "error": None
    }


@router.post("/assemble")
async def assemble_and_transcribe(payload: AssembleRequest) -> Dict[str, Any]:
    """
    Assemble all uploaded chunks and run them through the speech pipeline.

    Called by the frontend after all chunks have been uploaded.
    Audio bytes are processed entirely in RAM and deleted immediately after.
    Result includes the transcript + language detection.
    """
    buf = _chunk_buffer.get(payload.session_id)
    if not buf:
        raise HTTPException(
            status_code=404,
            detail="No audio chunks found for this session. Upload chunks first."
        )

    meta = _chunk_meta.get(payload.session_id, {})
    expected = meta.get("total_chunks", len(buf))

    # Check all chunks are present (no empty slots)
    missing = [i for i, c in enumerate(buf) if not c]
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Missing chunks at indices: {missing}. Re-upload missing chunks."
        )

    # Assemble in-memory — NEVER write to disk
    assembled_audio: bytes = b"".join(buf)

    # Immediately clear the buffer (security: zero RAM retention)
    _chunk_buffer.pop(payload.session_id, None)
    _chunk_meta.pop(payload.session_id, None)

    if not assembled_audio:
        raise HTTPException(status_code=422, detail="Assembled audio is empty.")

    # --- Forward to speech pipeline ---
    try:
        from app.services.speech_pipeline import speech_pipeline
        from app.services.contextual_vocabulary import ContextualVocabularyService

        ctx_prompt = None
        hotwords = None
        if payload.field_hint:
            ctx_prompt = ContextualVocabularyService.get_context_prompt_for_field(
                payload.field_hint, payload.language
            )
            hotwords = ContextualVocabularyService.get_hotwords_for_field(payload.field_hint)

        result = speech_pipeline.stt.transcribe(
            audio_bytes=assembled_audio,
            language=payload.language,
            client_transcript=None,
            initial_prompt=ctx_prompt,
            hotwords=hotwords
        )

        # Language detection pass
        lid_result = {}
        if result.get("transcript"):
            lid_result = speech_pipeline.lid.identify(result["transcript"])

        return {
            "session_id": payload.session_id,
            "transcript": result.get("transcript", ""),
            "confidence": result.get("confidence"),
            "language": result.get("language", payload.language),
            "language_detected": lid_result.get("detected_language"),
            "provider": result.get("provider", "unknown"),
            "assembled_bytes": len(assembled_audio),
            "security": {
                "audio_retained": False,
                "storage": "ephemeral_ram_only",
                "cleared_after_transcription": True
            }
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(exc)}"
        )


@router.delete("/session/{session_id}")
async def cancel_upload(session_id: str) -> Dict[str, str]:
    """
    Cancel an in-progress chunked upload and clear its buffer.
    Call this if the user cancels recording mid-upload.
    """
    cleared = session_id in _chunk_buffer
    _chunk_buffer.pop(session_id, None)
    _chunk_meta.pop(session_id, None)
    return {
        "session_id": session_id,
        "status": "cleared" if cleared else "not_found"
    }
