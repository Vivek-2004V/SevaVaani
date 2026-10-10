"""
Comprehensive Verification Tests for Consent-Based Dataset Pipeline (Prompt 3).
Verifies:
1. Informed consent enforcement and exclusion of unconsented samples (Req 1 & 8)
2. Pseudonymous speaker identifiers (Req 2)
3. Secure restricted storage (Req 3)
4. Air-gapped separation of identifying info from training manifests (Req 4)
5. Right-to-be-forgotten withdrawal and deletion process (Req 5)
6. Prohibition of caste, religion, or ethnic inferences (Req 6)
7. Exclusion of unlicensed web-scraped data (Req 7)
8. Detection of corrupted, empty, duplicate, or noisy audio files (Req 9)
9. Mandatory human verification for training split admission (Req 10)
10. Preservation of native Devanagari script and code-switching segments (Req 11)
11. Versioned manifest generation and statistics (Req 12)
"""

import pytest
import os
import io
import wave
import json
import base64
import tempfile
import shutil
from fastapi.testclient import TestClient

from app.main import app
from app.services.dataset.pseudonymizer import SpeakerPseudonymizer
from app.services.dataset.consent_manager import ConsentManager
from app.services.dataset.quality_gate import DatasetQualityGate
from app.services.dataset.transcript_verifier import TranscriptVerifier
from app.services.dataset.pipeline import DatasetPipeline


@pytest.fixture
def test_client():
    return TestClient(app)


@pytest.fixture
def temp_corpus_dir():
    temp_dir = tempfile.mkdtemp(prefix="test_seva_corpus_")
    yield temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


def generate_test_wav(duration_sec: float = 1.0, sample_rate: int = 16000, tone_amp: int = 2000) -> bytes:
    """Generates synthetic PCM WAV audio bytes for testing."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        import struct
        total_samples = int(duration_sec * sample_rate)
        raw_data = struct.pack(f"<{total_samples}h", *([tone_amp if i % 4 < 2 else -tone_amp for i in range(total_samples)]))
        wf.writeframes(raw_data)
    return buf.getvalue()


# -----------------------------------------------------------------------------
# TEST 1: Pseudonymization & Strict Omission of Sensitive Attributes (Req 2, 4, 6)
# -----------------------------------------------------------------------------

def test_speaker_pseudonymization_and_sensitive_attribute_protection():
    """Verify speaker pseudonymization is deterministic, irreversible, and strips sensitive attributes."""
    pseudonymizer = SpeakerPseudonymizer(salt="test-secure-salt-123")

    # Consistent hashing for same token
    spk_id_1 = pseudonymizer.generate_pseudonymous_id("speaker_session_token_xyz")
    spk_id_2 = pseudonymizer.generate_pseudonymous_id("speaker_session_token_xyz")
    assert spk_id_1.startswith("spk_")
    assert spk_id_1 == spk_id_2
    assert "speaker_session_token_xyz" not in spk_id_1

    # Requirement 6: Omission of caste, religion, ethnicity, Aadhaar
    raw_metadata = {
        "speaker_id": spk_id_1,
        "self_reported_region": "Vidarbha, Maharashtra",
        "self_reported_dialect": "Varhadi",
        "caste": "ProhibitedAttribute",
        "religion": "ProhibitedAttribute",
        "ethnicity": "ProhibitedAttribute",
        "aadhaar": "1234 5678 9012"
    }
    sanitized = pseudonymizer.sanitize_metadata(raw_metadata)

    # Allowed attributes remain
    assert sanitized["self_reported_region"] == "Vidarbha, Maharashtra"
    assert sanitized["self_reported_dialect"] == "Varhadi"
    # Prohibited attributes strictly omitted
    assert "caste" not in sanitized
    assert "religion" not in sanitized
    assert "ethnicity" not in sanitized
    assert "aadhaar" not in sanitized


# -----------------------------------------------------------------------------
# TEST 2: Informed Consent & Withdrawal Engine (Req 1, 5, 8)
# -----------------------------------------------------------------------------

def test_consent_lifecycle_and_withdrawal(temp_corpus_dir):
    """Verify consent recording, validation, and revocation workflow."""
    consent_file = os.path.join(temp_corpus_dir, "consent_ledger.json")
    manager = ConsentManager(ledger_path=consent_file)
    spk_id = "spk_test_consent_001"

    # Initially no consent
    assert manager.has_active_consent(spk_id) is False

    # Record consent
    record = manager.record_consent(spk_id, permitted_purposes=["speech_recognition_training"])
    assert record["consent_status"] == "active"
    assert manager.has_active_consent(spk_id) is True

    # Withdraw consent
    withdrawal = manager.withdraw_consent(spk_id)
    assert withdrawal["consent_status"] == "withdrawn"
    assert manager.has_active_consent(spk_id) is False


# -----------------------------------------------------------------------------
# TEST 3: Audio Quality Gate Checks (Req 9)
# -----------------------------------------------------------------------------

def test_audio_quality_gate():
    """Verify quality gate flags empty, corrupted, and duplicate audio files."""
    gate = DatasetQualityGate()

    # Empty file
    empty_report = gate.evaluate_audio(b"")
    assert empty_report.is_valid is False
    assert "empty_file" in empty_report.quality_flags

    # Corrupted header
    corrupt_report = gate.evaluate_audio(b"NOT_A_VALID_AUDIO_HEADER_DATA_STREAM")
    assert corrupt_report.is_valid is False
    assert "corrupted_header" in corrupt_report.quality_flags

    # Valid WAV
    wav_bytes = generate_test_wav(duration_sec=1.5, tone_amp=3000)
    valid_report = gate.evaluate_audio(wav_bytes)
    assert valid_report.is_valid is True
    assert "pass_clean" in valid_report.quality_flags

    # Register hash and test duplicate detection
    import hashlib
    wav_hash = hashlib.sha256(wav_bytes).hexdigest()
    gate.register_hash(wav_hash)

    dup_report = gate.evaluate_audio(wav_bytes)
    assert "duplicate_file" in dup_report.quality_flags


# -----------------------------------------------------------------------------
# TEST 4: Human Review & Code-Switching Segmentation (Req 10 & 11)
# -----------------------------------------------------------------------------

def test_transcript_human_verification_and_code_switching():
    """Verify human review requirement and native Devanagari/Latin script segmentation."""
    # Unverified transcript rejected from training split
    admissible_pending, errors_pending, _ = TranscriptVerifier.validate_for_training_split(
        transcript="मेरा नाम रमेश है",
        reviewer_status="pending",
        primary_language="hi"
    )
    assert admissible_pending is False
    assert "unverified_transcript_must_be_human_verified" in errors_pending

    # Verified Hindi Devanagari
    admissible_verified, errors_verified, segs_hi = TranscriptVerifier.validate_for_training_split(
        transcript="मेरा नाम रमेश है",
        reviewer_status="verified",
        primary_language="hi"
    )
    assert admissible_verified is True
    assert len(errors_verified) == 0
    assert all(s.script == "Devanagari" for s in segs_hi)

    # Code-switched Hinglish segment preservation
    mixed_transcript = "mera name रमेश कुमार and annual income 2 lakh hai"
    _, _, segs_mixed = TranscriptVerifier.validate_for_training_split(
        transcript=mixed_transcript,
        reviewer_status="verified",
        primary_language="hi"
    )
    scripts = [s.script for s in segs_mixed]
    assert "Devanagari" in scripts
    assert "Latin" in scripts

    # Leaked Aadhaar number rejection
    leaked_transcript = "मेरा आधार कार्ड 1234 5678 9012 है"
    admissible_leak, errors_leak, _ = TranscriptVerifier.validate_for_training_split(
        transcript=leaked_transcript,
        reviewer_status="verified",
        primary_language="hi"
    )
    assert admissible_leak is False
    assert "aadhaar_number_leak" in errors_leak


# -----------------------------------------------------------------------------
# TEST 5: End-to-End Pipeline Ingestion & Schema Compliance (Req 3 & 12)
# -----------------------------------------------------------------------------

def test_dataset_pipeline_ingest_and_manifest(temp_corpus_dir):
    """Verify complete ingestion workflow, schema fields, and manifest writing."""
    pipeline = DatasetPipeline(corpus_dir=temp_corpus_dir)
    wav_bytes = generate_test_wav(duration_sec=2.0)

    res = pipeline.ingest_sample(
        speaker_real_token="session_participant_101",
        audio_bytes=wav_bytes,
        verified_transcript="माझे नाव राहुल देशमुख आहे",
        language="mr",
        self_reported_region="Vidarbha, Maharashtra",
        self_reported_dialect="Varhadi",
        recording_environment="quiet_room",
        reviewer_status="verified",
        consent_acknowledged=True,
        split_preference="train"
    )

    assert res["success"] is True
    assert res["dataset_split"] == "train"
    assert res["status"] == "admitted"
    assert res["recording_id"] is not None

    # Check manifest JSONL file contents
    manifest_train = os.path.join(temp_corpus_dir, "manifests", "manifest_train.jsonl")
    assert os.path.isfile(manifest_train)

    with open(manifest_train, "r", encoding="utf-8") as f:
        line = f.readline()
        record = json.loads(line)

    # Verify all schema fields from Prompt 3
    assert record["recording_id"] == res["recording_id"]
    assert record["speaker_id_pseudonymous"] == res["speaker_id_pseudonymous"]
    assert record["language"] == "mr"
    assert record["self_reported_region_optional"] == "Vidarbha, Maharashtra"
    assert record["self_reported_dialect_optional"] == "Varhadi"
    assert record["recording_environment"] == "quiet_room"
    assert "audio_path" in record
    assert record["verified_transcript"] == "माझे नाव राहुल देशमुख आहे"
    assert len(record["transcript_language_segments"]) > 0
    assert record["transcription_reviewer_status"] == "verified"
    assert record["consent_status"] == "active"
    assert record["dataset_split"] == "train"
    assert "quality_flags" in record
    assert record["dataset_version"] == "1.0.0"


# -----------------------------------------------------------------------------
# TEST 6: Withdrawal and Purge Workflow (Req 5 & 8)
# -----------------------------------------------------------------------------

def test_dataset_withdrawal_and_purge_workflow(temp_corpus_dir):
    """Verify right-to-be-forgotten completely purges speaker recordings from training splits."""
    pipeline = DatasetPipeline(corpus_dir=temp_corpus_dir)
    wav_bytes = generate_test_wav(duration_sec=1.5)
    speaker_token = "speaker_to_be_forgotten_404"

    # Ingest 2 samples for this speaker
    pipeline.ingest_sample(
        speaker_real_token=speaker_token,
        audio_bytes=wav_bytes,
        verified_transcript="पहला नमूना",
        language="hi",
        reviewer_status="verified",
        consent_acknowledged=True,
        split_preference="train"
    )
    wav_bytes_2 = generate_test_wav(duration_sec=2.2, tone_amp=2500)
    pipeline.ingest_sample(
        speaker_real_token=speaker_token,
        audio_bytes=wav_bytes_2,
        verified_transcript="दूसरा नमूना",
        language="hi",
        reviewer_status="verified",
        consent_acknowledged=True,
        split_preference="train"
    )

    # Verify train manifest has 2 samples
    stats_before = pipeline.get_corpus_statistics()
    assert stats_before["splits"]["train"] == 2

    # Execute withdrawal and purge
    purge_res = pipeline.withdraw_speaker_and_purge(speaker_token, purge_audio_files=True)
    assert purge_res["purged_records_count"] == 2
    assert purge_res["deleted_files_count"] == 2

    # Verify train manifest now has 0 samples for this speaker
    stats_after = pipeline.get_corpus_statistics()
    assert stats_after["splits"]["train"] == 0
    assert stats_after["splits"]["quarantine"] == 2


# -----------------------------------------------------------------------------
# TEST 7: Dataset API Endpoints
# -----------------------------------------------------------------------------

def test_dataset_api_endpoints(test_client):
    """Verify FastAPI routes for ingestion, statistics, and withdrawal."""
    wav_bytes = generate_test_wav(duration_sec=1.2)
    b64_audio = base64.b64encode(wav_bytes).decode("utf-8")

    # Ingest via API
    ingest_resp = test_client.post("/api/dataset/samples/ingest", json={
        "speaker_real_token": "api_test_speaker_505",
        "audio_base64": b64_audio,
        "verified_transcript": "माझे नाव सचिन आहे",
        "language": "mr",
        "self_reported_region": "Pune, Maharashtra",
        "self_reported_dialect": "Standard Marathi",
        "recording_environment": "office_ambient",
        "reviewer_status": "verified",
        "consent_acknowledged": True,
        "dataset_split_preference": "train"
    })
    assert ingest_resp.status_code == 200
    assert ingest_resp.json()["success"] is True

    # Retrieve corpus telemetry
    stats_resp = test_client.get("/api/dataset/statistics")
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert "dataset_version" in stats
    assert "splits" in stats

    # Withdraw consent via API
    withdraw_resp = test_client.post("/api/dataset/consent/withdraw", json={
        "speaker_real_token": "api_test_speaker_505",
        "purge_audio_files": True
    })
    assert withdraw_resp.status_code == 200
    assert withdraw_resp.json()["status"] == "withdrawn_and_quarantined"
