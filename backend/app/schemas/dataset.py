"""
Dataset Schemas for Consent-Based Native Speaker Speech Pipeline (Prompt 3).
Defines schemas for metadata, quality gates, consent tracking, and training manifests.
"""

from __future__ import annotations
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


class LanguageSegment(BaseModel):
    """Segment in a code-switched or multilingual transcript."""
    text: str = Field(..., description="Transcript text snippet")
    language: str = Field(..., description="Language code: hi, mr, en, etc.")
    script: str = Field(..., description="Script: Devanagari, Latin, etc.")
    start_char: Optional[int] = None
    end_char: Optional[int] = None


class ConsentRecord(BaseModel):
    """Explicit informed consent metadata."""
    consent_id: str
    speaker_id_pseudonymous: str
    consent_timestamp: float
    consent_status: Literal["active", "withdrawn", "expired", "pending"] = "active"
    permitted_purposes: List[str] = Field(
        default=["speech_recognition_training", "accent_evaluation", "public_service_accessibility"]
    )
    terms_version: str = "v1.0"
    withdrawal_timestamp: Optional[float] = None
    expiry_timestamp: Optional[float] = None


class AudioQualityReport(BaseModel):
    """Quality metrics computed on audio sample."""
    is_valid: bool
    byte_size: int
    duration_sec: float
    sample_rate: int
    format: str
    snr_db: float
    clipping_ratio: float
    rms_energy: float
    quality_flags: List[str] = Field(default_factory=list)


class DatasetSample(BaseModel):
    """
    Core dataset record schema adhering strictly to Prompt 3 requirements:
    - recording_id
    - speaker_id_pseudonymous
    - language
    - self_reported_region_optional
    - self_reported_dialect_optional
    - recording_environment
    - audio_path
    - verified_transcript
    - transcript_language_segments
    - transcription_reviewer_status
    - consent_status
    - dataset_split
    - quality_flags
    """
    recording_id: str = Field(..., description="Unique UUID for this audio recording")
    speaker_id_pseudonymous: str = Field(..., description="Salted pseudonymous speaker identifier")
    language: str = Field(..., description="Primary language: hi, mr, en, hi-en, mr-en")
    self_reported_region_optional: Optional[str] = Field(None, description="Voluntarily reported region (e.g. Vidarbha, Malwa)")
    self_reported_dialect_optional: Optional[str] = Field(None, description="Voluntarily reported dialect (e.g. Varhadi, Bundelkhandi)")
    recording_environment: str = Field("quiet_room", description="Recording acoustic environment")
    audio_path: str = Field(..., description="Restricted storage path to audio file")
    audio_format: str = Field("wav", description="Audio container format: wav, webm, flac")
    sample_rate: int = Field(16000, description="Audio sample rate in Hz")
    duration_sec: float = Field(0.0, description="Audio duration in seconds")
    audio_hash_sha256: str = Field(..., description="Content hash for deduplication")

    raw_transcript: Optional[str] = Field(None, description="Initial ASR or draft transcript")
    verified_transcript: str = Field(..., description="Ground-truth human-verified transcript preserving native script")
    transcript_language_segments: List[LanguageSegment] = Field(default_factory=list)
    transcription_reviewer_status: Literal["pending", "verified", "rejected"] = "pending"

    consent_status: Literal["active", "withdrawn", "pending", "expired"] = "active"
    license_type: str = Field("Consent-Restricted Research & Public Service Agreement")
    dataset_split: Literal["train", "validation", "test", "quarantine"] = "quarantine"
    quality_flags: List[str] = Field(default_factory=list)

    dataset_version: str = Field("1.0.0", description="Dataset manifest version")
    annotation_version: str = Field("v1.0", description="Annotation guideline version")
    created_at: float = Field(..., description="Unix timestamp of ingestion")
    updated_at: float = Field(..., description="Unix timestamp of last modification")


class IngestSampleRequest(BaseModel):
    """Payload to ingest a new speech sample with consent."""
    speaker_real_token: str = Field(..., description="Speaker session token for pseudonymization (air-gapped)")
    language: str = Field("hi", description="Language code")
    self_reported_region: Optional[str] = None
    self_reported_dialect: Optional[str] = None
    recording_environment: str = "quiet_room"
    verified_transcript: str = Field(..., description="Accurate transcript preserving native script")
    reviewer_status: Literal["pending", "verified", "rejected"] = "verified"
    audio_base64: str = Field(..., description="Base64 encoded audio payload")
    consent_acknowledged: bool = Field(..., description="Explicit affirmation of informed consent")
    dataset_split_preference: Optional[Literal["train", "validation", "test"]] = "train"


class WithdrawConsentRequest(BaseModel):
    """Payload to request complete withdrawal and purging."""
    speaker_real_token: str = Field(..., description="Speaker identifier requesting withdrawal")
    purge_audio_files: bool = Field(True, description="Whether to securely delete physical audio from disk")
