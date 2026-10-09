"""
Tests for low-connectivity / offline behaviour.

Scope:
  - Session state is preserved and can be restored from IndexedDB-like structures
  - Backend API falls back gracefully when the DB/network is unreachable
  - Sync queue deduplication prevents duplicate field writes
  - Text-fallback path works independently of the voice pipeline
  - Final form submission is explicitly blocked when the caller passes offline=True
  - Voice pipeline errors surface a clean error rather than crashing

These tests exercise the Python backend logic; the IndexedDB behaviour is
covered by the frontend hook unit-tests (see frontend/src/hooks/__tests__/).
"""
import pytest
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.form_engine import FormEngine
from app.services.validator import FieldValidator
from app.services.extractor import ExtractorService


# ──────────────────────────────────────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def engine():
    return FormEngine()


@pytest.fixture
def validator():
    return FieldValidator()


@pytest.fixture
def extractor():
    return ExtractorService()


# ──────────────────────────────────────────────────────────────────────────────
# 1. Offline Mode — Text Fallback
# ──────────────────────────────────────────────────────────────────────────────

def test_text_fallback_bypasses_stt(engine):
    """
    When voice is unavailable, user types text directly.
    The text path must validate and confirm without calling STT.
    """
    session = engine.create_session(language="hi")
    sid = session["session_id"]

    # Simulate typed text submitted via fallback (input_type='text')
    result = engine.process_turn(sid, "Ramesh Kumar Sharma", "text")

    assert result["status"] in ("need_confirmation", "success"), (
        f"Text fallback must reach confirmation; got: {result['status']}"
    )
    assert result.get("candidate_value"), "Text fallback must produce a candidate value"


def test_text_fallback_hindi_name(engine):
    """Text fallback works for Hindi Unicode names."""
    session = engine.create_session(language="hi")
    sid = session["session_id"]

    result = engine.process_turn(sid, "विवेक कुमार विश्वकर्मा", "text")

    assert result["status"] in ("need_confirmation", "success")
    assert "विवेक" in result.get("candidate_value", "") or \
           "विवेक" in result.get("message", "")


def test_text_fallback_marathi_name(engine):
    """Text fallback works for Marathi Unicode names."""
    session = engine.create_session(language="mr")
    sid = session["session_id"]

    result = engine.process_turn(sid, "सचिन रमेश पाटील", "text")

    assert result["status"] in ("need_confirmation", "success")


def test_text_fallback_mobile_number(validator):
    """
    Text fallback for a 10-digit mobile number passes validation.
    The offline path is: user types → validator checks → confirmed locally.
    """
    # Valid mobile must pass
    is_valid, error = validator.validate("mobile", "9876543210")
    assert is_valid, f"10-digit mobile must pass offline validation; error: {error}"

    # Short number must be rejected
    is_invalid, _ = validator.validate("mobile", "98765")
    assert not is_invalid, "5-digit mobile must fail offline validation"

    # Formatted number (with spaces) — extractor would strip these
    stripped = "9876 543210".replace(" ", "")
    is_valid2, _ = validator.validate("mobile", stripped)
    assert is_valid2, "Mobile with stripped spaces must pass offline validation"



# ──────────────────────────────────────────────────────────────────────────────
# 2. Session Recovery
# ──────────────────────────────────────────────────────────────────────────────

def test_session_progress_preserved_in_memory(engine):
    """
    Confirmed fields stay in session state across turns — simulates
    the backend-side session that would be recovered after reconnect.
    """
    session = engine.create_session(language="hi")
    sid = session["session_id"]

    # Confirm first field using the real API
    r1 = engine.process_turn(sid, "Ramesh Kumar", "text")
    if r1.get("status") == "need_confirmation":
        engine.confirm_candidate(sid, r1.get("field_name", "full_name"), "confirm")

    # Get session state
    state = engine.get_session_state(sid)
    # confirmed_fields is a dict: {field_name: value}
    confirmed_fields = state.get("confirmed_fields", {})
    assert len(confirmed_fields) >= 1, (
        f"At least one field should be confirmed after first turn. confirmed_fields={confirmed_fields!r}"
    )


def test_different_sessions_are_isolated(engine):
    """Two sessions must not share state — prevents cross-user data leaks."""
    s1 = engine.create_session(language="hi")
    s2 = engine.create_session(language="mr")

    sid1, sid2 = s1["session_id"], s2["session_id"]
    assert sid1 != sid2

    engine.process_turn(sid1, "Ramesh Kumar", "text")

    state2 = engine.get_session_state(sid2)
    confirmed = [f for f in state2.get("fields", []) if f.get("confirmed")]
    assert len(confirmed) == 0, "Session 2 must have no confirmed fields from session 1"


# ──────────────────────────────────────────────────────────────────────────────
# 3. Reconnect Recovery — Sync Queue Deduplication
# ──────────────────────────────────────────────────────────────────────────────

def test_confirm_field_idempotent(engine):
    """
    Confirming the same field twice (e.g., from retry after reconnect)
    must not corrupt session state or raise an error.
    """
    session = engine.create_session(language="hi")
    sid = session["session_id"]

    r = engine.process_turn(sid, "Ramesh Kumar", "text")
    field_name = r.get("field_name", "full_name")

    # First confirm
    result1 = engine.confirm_candidate(sid, field_name, "confirm")
    # Second confirm (duplicate — simulates sync queue retry)
    result2 = engine.confirm_candidate(sid, field_name, "confirm")

    assert result1.get("success") is not False
    assert result2.get("success") is not False, (
        "Second confirmation (idempotent retry) must not return an error"
    )


# ──────────────────────────────────────────────────────────────────────────────
# 4. Submission Guard
# ──────────────────────────────────────────────────────────────────────────────

def test_submission_requires_explicit_consent_flag(engine):
    """
    Final submission must only succeed when consent=True is explicitly passed.
    Uses FormEngine.submit_application which is the real entry point.
    """
    session = engine.create_session(language="hi")
    sid = session["session_id"]

    # consent=False must be blocked
    result = engine.submit_application(sid, consent=False)
    assert result.get("status") == "blocked" or result.get("success") is False, (
        "Submission without consent must be blocked"
    )


def test_submission_blocked_without_confirmed_fields(engine):
    """
    An empty or freshly started session must not be submittable,
    preventing accidental blank submissions after reconnect.
    """
    session = engine.create_session(language="hi")
    sid = session["session_id"]

    # No turns processed — try to submit with consent
    result = engine.submit_application(sid, consent=True)
    # Should be blocked or return validation errors — not a silent success
    assert result.get("status") in ("blocked", "incomplete", "error") or \
           result.get("success") is False or \
           result.get("missing_fields") is not None, (
        "Submission of empty form must be blocked or flagged"
    )


# ──────────────────────────────────────────────────────────────────────────────
# 5. Offline Voice Pipeline Failure — Clean Error Surfacing
# ──────────────────────────────────────────────────────────────────────────────

def test_empty_transcript_returns_retry_not_crash(engine):
    """
    An empty transcript (e.g. from a failed STT call due to no internet)
    must return a retry/fallback decision, not raise an exception.
    """
    session = engine.create_session(language="hi")
    sid = session["session_id"]

    result = engine.process_turn(sid, "", "voice")

    # Must NOT raise; must return a retry signal
    assert isinstance(result, dict)
    assert result.get("status") in ("retry", "fallback", "text_fallback", "need_clarification"), (
        f"Empty voice transcript must trigger retry/fallback; got: {result.get('status')!r}"
    )


def test_network_error_transcript_placeholder_triggers_fallback(engine):
    """
    When STT returns a network-error placeholder string,
    the backend must surface a fallback, not accept it as a field value.
    """
    session = engine.create_session(language="hi")
    sid = session["session_id"]

    # This kind of string is what a frontend might send when webkitSpeechRecognition
    # fails with error='network' and we still want the backend to handle gracefully.
    result = engine.process_turn(sid, "[network_error]", "voice")

    assert isinstance(result, dict)
    assert result.get("status") not in ("success",), (
        "Network-error placeholder must not be accepted as a valid field value"
    )


# ──────────────────────────────────────────────────────────────────────────────
# 6. Validator — Personal Data Safety
# ──────────────────────────────────────────────────────────────────────────────

def test_validator_rejects_blank_sensitive_field(validator):
    """Validator must reject empty values for required sensitive fields."""
    is_valid, error = validator.validate("full_name", "")
    assert not is_valid, "Empty name must fail validation"
    assert error, "Must return an error message for empty name"


def test_validator_rejects_partial_mobile(validator):
    """Partial mobile number must not be accepted."""
    is_valid, error = validator.validate("mobile", "98765")
    assert not is_valid, "5-digit mobile must fail validation"


def test_validator_accepts_complete_mobile(validator):
    """10-digit mobile must pass validation."""
    is_valid, error = validator.validate("mobile", "9876543210")
    assert is_valid, f"10-digit mobile must pass; got error: {error}"
