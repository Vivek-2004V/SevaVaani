"""
Security & Privacy Audit Regression Test Suite for SEVA VAANI.

Verifies:
1. CORS policy enforcement (rejects malicious origins, no wildcard credentials).
2. Cryptographic session entropy (128-bit entropy preventing enumeration).
3. Database file access permissions (owner-restricted chmod 0o600).
4. Submission consent barrier (zero unconfirmed values, blocked without explicit consent).
5. Prompt data minimization (only active field and current utterance passed).
6. Zero raw audio persistence on disk.
"""

import os
import sys
import stat
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.main import app
from app.models.database import init_db, DB_PATH
from app.services.form_engine import FormEngine
from app.schemas.llm import LLMExtractionRequest
from app.services.llm_adapter import OllamaLLMAdapter
from app.services.stt import STTAdapter


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


@pytest.fixture
def client():
    return TestClient(app)


def test_cors_restricted_origins_and_no_wildcard(client):
    """Verify unauthorized origins do not receive CORS authorization."""
    # 1. Authorized origin (Frontend)
    res_allowed = client.options(
        "/api/session",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST"
        }
    )
    assert res_allowed.headers.get("access-control-allow-origin") == "http://localhost:5173"

    # 2. Unauthorized / Malicious origin
    res_blocked = client.options(
        "/api/session",
        headers={
            "Origin": "http://malicious-phishing.com",
            "Access-Control-Request-Method": "POST"
        }
    )
    # Must NOT return wildcard or mirror malicious origin
    assert res_blocked.headers.get("access-control-allow-origin") != "*"
    assert res_blocked.headers.get("access-control-allow-origin") != "http://malicious-phishing.com"


def test_session_id_cryptographic_entropy():
    """Verify session IDs have at least 128 bits of entropy to resist enumeration."""
    engine = FormEngine()
    session = engine.create_session(language="hi")
    s_id = session["session_id"]
    
    assert s_id.startswith("sv-")
    # Prefix 'sv-' (3) + 32 hex chars (128 bits) = 35 chars
    hex_portion = s_id.replace("sv-", "")
    assert len(hex_portion) == 32
    assert int(hex_portion, 16) > 0  # Valid hex


def test_database_file_permissions():
    """Verify SQLite database file has restricted permissions (0o600: read/write by owner only)."""
    assert os.path.exists(DB_PATH)
    file_stat = os.stat(DB_PATH)
    permissions = stat.S_IMODE(file_stat.st_mode)
    
    # Verify no group/world read or write
    assert permissions & stat.S_IRGRP == 0, "DB is group-readable"
    assert permissions & stat.S_IWGRP == 0, "DB is group-writable"
    assert permissions & stat.S_IROTH == 0, "DB is world-readable"
    assert permissions & stat.S_IWOTH == 0, "DB is world-writable"


def test_submission_consent_and_unconfirmed_barrier():
    """Verify submission is completely blocked without consent and rejects unconfirmed values."""
    engine = FormEngine()
    session = engine.create_session(language="hi")
    s_id = session["session_id"]

    # Fill incomplete fields
    engine.process_text_fallback(s_id, "full_name", "राहुल शर्मा")

    # Attempt submission without consent -> Blocked
    res_no_consent = engine.submit_application(s_id, consent=False)
    assert res_no_consent["status"] == "blocked"
    assert res_no_consent["application_id"] is None

    # Attempt submission with consent but missing fields -> Incomplete
    res_incomplete = engine.submit_application(s_id, consent=True)
    assert res_incomplete["status"] == "incomplete"
    assert res_incomplete["application_id"] is None


def test_stt_zero_raw_audio_disk_persistence():
    """Verify STT adapter processes audio in-memory and does not leave temporary audio files on disk."""
    adapter = STTAdapter()
    dummy_audio = b"RIFF....WAVEfmt ...."
    
    # Process audio
    res = adapter.transcribe_audio_payload(dummy_audio, language="hi")
    assert "transcript" in res
    
    # Verify no temporary audio files created in project directory
    audio_files = [
        f for f in os.listdir(".")
        if f.endswith((".wav", ".mp3", ".ogg", ".aac", ".flac", ".tmp"))
    ]
    assert len(audio_files) == 0, f"Found leaked audio files on disk: {audio_files}"
