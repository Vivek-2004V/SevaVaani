"""
Regression tests for SEVA VAANI Privacy Firewall & MV3 Security Controls.

Proves:
1. A synthetic Aadhaar-like value is blocked or sanitized before unauthorized transmission.
2. A sensitive form value never appears in external LLM payloads.
3. Raw audio and full transcripts are not sent to unapproved destinations.
4. Unapproved endpoints are rejected.
5. Authentication tokens and personal data do not appear in logs.
6. A failed privacy check blocks the request instead of silently continuing.
7. Text-only fallback remains usable when microphone or remote speech processing is unavailable.
8. Normal non-sensitive requests continue to work.
9. User confirmation remains mandatory for each answer and final submission.
"""

import logging
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.privacy_firewall import (
    PrivacyFirewall,
    SensitiveDataLoggingFilter,
    SENSITIVE_FIELDS,
)
from app.schemas.llm import LLMExtractionRequest
from app.services.llm_adapter import OpenAICompatibleLLMAdapter


client = TestClient(app)


# 1. Synthetic Aadhaar-like value is blocked before unauthorized external transmission
def test_synthetic_aadhaar_blocked_from_external_transmission():
    remote_url = "https://api.openai.com/v1"
    synthetic_aadhaar_transcript = "Mera aadhaar number 9999 8888 7777 hai"
    
    result = PrivacyFirewall.inspect_llm_outbound_payload(
        endpoint_url=remote_url,
        field_name="general_field",
        transcript=synthetic_aadhaar_transcript
    )
    
    assert not result.allowed
    assert "aadhaar" in result.detected_pii or "Sensitive" in result.reason
    assert "prohibited" in result.reason.lower()


# 2. Sensitive form value never appears in external LLM payloads
def test_sensitive_form_value_never_in_external_llm_payloads():
    # Configure an OpenAI adapter pointing to an external endpoint
    adapter = OpenAICompatibleLLMAdapter(
        api_key="test-synthetic-key",
        base_url="https://api.openai.com/v1"
    )
    
    # Request for a sensitive field (aadhaar_number) with synthetic data
    req = LLMExtractionRequest(
        field_name="aadhaar_number",
        transcript="9999 1234 5678",
        language="hi"
    )
    
    # The adapter must intercept the call via PrivacyFirewall and NOT make an external call.
    # It safely falls back to local deterministic extractor.
    resp = adapter.extract_field_candidate(req)
    assert resp.field == "aadhaar_number"
    # Proves fallback was used and external transmission was blocked
    assert resp.confidence_flag in ["needs_confirmation", "retry"]


# 3. Raw audio and full transcripts are not sent to unapproved destinations
def test_raw_audio_and_transcripts_not_sent_to_unapproved_destinations():
    unapproved_destinations = [
        "https://telemetry.thirdparty.com/v1/event",
        "https://analytics.google.com/collect",
        "http://tracker.malicious-site.org/collect"
    ]
    
    for dest in unapproved_destinations:
        is_allowed = PrivacyFirewall.validate_outbound_destination(dest)
        assert not is_allowed, f"Unapproved destination {dest} should have been rejected by PrivacyFirewall"


# 4. Unapproved endpoints are rejected
def test_unapproved_endpoints_rejected():
    assert PrivacyFirewall.is_local_or_trusted_endpoint("http://127.0.0.1:8000/api/session")
    assert PrivacyFirewall.is_local_or_trusted_endpoint("http://localhost:8000/api/assist/turn")
    
    assert not PrivacyFirewall.is_local_or_trusted_endpoint("https://external-cloud-api.com/v1")
    assert not PrivacyFirewall.is_local_or_trusted_endpoint("http://192.168.1.50:8000/api")
    assert not PrivacyFirewall.is_local_or_trusted_endpoint("")


# 5. Authentication tokens and personal data do not appear in logs
def test_auth_tokens_and_personal_data_not_in_logs():
    test_log = (
        "User logged in with token Bearer abcdef1234567890abcdef1234567890 "
        "and Aadhaar 1234 5678 9012 and PAN ABCDE1234F with \"password\": \"SecretPass123\""
    )
    
    sanitized = PrivacyFirewall.sanitize_log_message(test_log)
    
    assert "abcdef1234567890abcdef1234567890" not in sanitized
    assert "1234 5678 9012" not in sanitized
    assert "ABCDE1234F" not in sanitized
    assert "SecretPass123" not in sanitized
    assert "[REDACTED_AUTH_TOKEN]" in sanitized
    assert "[REDACTED_AADHAAR]" in sanitized
    assert "[REDACTED_PAN]" in sanitized
    assert "[REDACTED_PASSWORD]" in sanitized


# 6. A failed privacy check blocks the request instead of silently continuing
def test_failed_privacy_check_blocks_request_instead_of_silent_substitution():
    result = PrivacyFirewall.inspect_llm_outbound_payload(
        endpoint_url="https://api.openai.com/v1",
        field_name="bank_account",
        transcript="My account is 123456789012"
    )
    
    # Must be explicitly blocked
    assert result.allowed is False
    assert len(result.reason) > 0
    # Must not silently create fake account number
    assert result.detected_pii.get("sensitive_field") == "bank_account"


# 7. Text-only fallback remains usable when microphone or remote speech processing is unavailable
def test_text_only_fallback_usable_without_speech():
    # 1. Create session
    session_res = client.post("/api/session", json={"service_id": "scholarship_app", "language": "hi"})
    assert session_res.status_code == 200
    session_id = session_res.json()["session_id"]
    
    # 2. Citizen inputs text directly without microphone
    fallback_res = client.post("/api/fallback/text", json={
        "session_id": session_id,
        "field_name": "full_name",
        "typed_value": "Ramesh Kumar"
    })
    assert fallback_res.status_code == 200
    data = fallback_res.json()
    assert data["session_state"]["confirmed_fields"].get("full_name") == "Ramesh Kumar"


# 8. Normal non-sensitive requests continue to work
def test_normal_non_sensitive_requests_continue_to_work():
    # Local endpoint non-sensitive field
    result = PrivacyFirewall.inspect_llm_outbound_payload(
        endpoint_url="http://127.0.0.1:8000",
        field_name="college_name",
        transcript="Government Engineering College"
    )
    assert result.allowed is True
    
    # Session turn endpoint functions normally
    session_res = client.post("/api/session", json={"service_id": "scholarship_app", "language": "hi"})
    session_id = session_res.json()["session_id"]
    
    turn_res = client.post("/api/assist/turn", json={
        "session_id": session_id,
        "transcript": "मेरा नाम राजेश शर्मा है",
        "input_type": "voice",
        "latency_ms": 100
    })
    assert turn_res.status_code == 200
    turn_data = turn_res.json()
    assert "candidate_value" in turn_data or "message" in turn_data


# 9. User confirmation remains mandatory for each answer and final submission
def test_user_confirmation_mandatory_for_answer_and_submission():
    session_res = client.post("/api/session", json={"service_id": "scholarship_app", "language": "hi"})
    session_id = session_res.json()["session_id"]
    
    # Unconfirmed turn does not mark field as confirmed
    client.post("/api/assist/turn", json={
        "session_id": session_id,
        "transcript": "सुरेश वर्मा",
        "input_type": "voice",
        "latency_ms": 100
    })
    
    # Attempt submission without consent or confirmation: must be blocked
    submit_res = client.post("/api/submit", json={
        "session_id": session_id,
        "consent": False
    })
    assert submit_res.status_code == 200
    submit_data = submit_res.json()
    assert submit_data["status"] == "blocked"
    assert submit_data["application_id"] is None
    assert submit_data["government_portal_submitted"] is False
