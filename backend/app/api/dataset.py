"""
Dataset Management API Router for SEVA VAANI (Prompt 3).
Provides secure server-side endpoints for consent-based speech sample ingestion,
right-to-be-forgotten withdrawal, and versioned manifest telemetry.
"""

from __future__ import annotations
import base64
from typing import Dict, Any, Optional, Literal
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.schemas.dataset import IngestSampleRequest, WithdrawConsentRequest
from app.services.dataset.pipeline import dataset_pipeline

router = APIRouter(prefix="/api/dataset", tags=["Consent-Based Dataset Pipeline"])


@router.post("/samples/ingest")
def ingest_speech_sample(payload: IngestSampleRequest) -> Dict[str, Any]:
    """
    Ingests a newly contributed speech recording with explicit informed consent.
    Evaluates audio quality gate and human transcript verification.
    """
    try:
        audio_bytes = base64.b64decode(payload.audio_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid audio_base64 encoding")

    result = dataset_pipeline.ingest_sample(
        speaker_real_token=payload.speaker_real_token,
        audio_bytes=audio_bytes,
        verified_transcript=payload.verified_transcript,
        language=payload.language,
        self_reported_region=payload.self_reported_region,
        self_reported_dialect=payload.self_reported_dialect,
        recording_environment=payload.recording_environment,
        reviewer_status=payload.reviewer_status,
        consent_acknowledged=payload.consent_acknowledged,
        split_preference=payload.dataset_split_preference or "train"
    )

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Ingestion rejected"))

    return result


@router.post("/consent/withdraw")
def withdraw_consent(payload: WithdrawConsentRequest) -> Dict[str, Any]:
    """
    Requirement 5: Processes complete withdrawal and deletion of a speaker's data.
    Purges recordings and quarantines records from active training splits.
    """
    return dataset_pipeline.withdraw_speaker_and_purge(
        speaker_real_token=payload.speaker_real_token,
        purge_audio_files=payload.purge_audio_files
    )


@router.get("/statistics")
def get_corpus_statistics() -> Dict[str, Any]:
    """
    Returns aggregate corpus statistics, including language distribution,
    regional breakdown, and split volumes.
    """
    return dataset_pipeline.get_corpus_statistics()
