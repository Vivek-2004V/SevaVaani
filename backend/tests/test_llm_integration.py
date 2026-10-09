"""
Unit & Integration Tests for LLM Service Adapter in SEVA VAANI.
Verifies structured output, active-field bounding, deterministic fallback,
timeout resilience, malformed output recovery, and safety invariants.
"""

from __future__ import annotations
import os
import sys
import pytest
from unittest.mock import patch, MagicMock

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.schemas.llm import LLMExtractionRequest, LLMExtractionResponse
from app.services.llm_adapter import (
    BaseLLMAdapter,
    MockDeterministicLLMAdapter,
    OpenAICompatibleLLMAdapter,
    get_llm_adapter
)
from app.services.validator import FieldValidator
from app.services.form_engine import FormEngine
from app.models.database import init_db

@pytest.fixture(autouse=True)
def setup_db():
    init_db()


def test_mock_llm_adapter_correct_extraction_hindi():
    """Verify mock LLM adapter correctly extracts Hindi candidate values."""
    adapter = MockDeterministicLLMAdapter()
    req = LLMExtractionRequest(
        field_name="full_name",
        transcript="मेरा नाम राहुल पाटिल है",
        language="hi"
    )
    res = adapter.extract_field_candidate(req)

    assert res.field == "full_name"
    assert res.value in ["राहुल पाटिल", "Rahul Patil"]
    assert res.confidence_flag == "needs_confirmation"
    assert res.confidence >= 0.85


def test_mock_llm_adapter_correct_extraction_marathi():
    """Verify mock LLM adapter correctly extracts Marathi candidate values."""
    adapter = MockDeterministicLLMAdapter()
    req = LLMExtractionRequest(
        field_name="full_name",
        transcript="माझे नाव राहुल देशमुख आहे",
        language="mr"
    )
    res = adapter.extract_field_candidate(req)

    assert res.field == "full_name"
    assert res.value == "राहुल देशमुख"
    assert res.confidence_flag == "needs_confirmation"


def test_llm_adapter_wrong_field_rejected():
    """Verify that if an LLM returns a different field name, it is caught and rejected."""
    adapter = OpenAICompatibleLLMAdapter(api_key="mock-test-key", base_url="https://mock-llm.local/v1")

    # Mock response returning a wrong field ('income' instead of 'full_name')
    mock_payload = {
        "choices": [{
            "message": {
                "content": '{"field": "annual_income", "value": "180000", "confidence": 0.95}'
            }
        }]
    }

    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_resp = MagicMock()
        mock_resp.read.return_value = str(mock_payload).replace("'", '"').encode("utf-8")
        mock_resp.__enter__.return_value = mock_resp
        mock_urlopen.return_value = mock_resp

        req = LLMExtractionRequest(
            field_name="full_name",
            transcript="मेरा नाम राहुल है",
            language="hi"
        )
        res = adapter.extract_field_candidate(req)

        # Must enforce active field bounding: field must remain 'full_name'
        assert res.field == "full_name"
        assert res.value in ["राहुल", "Rahul"]


def test_llm_extracted_value_subject_to_backend_validation():
    """Verify that candidate extracted by LLM is validated by FieldValidator."""
    adapter = MockDeterministicLLMAdapter()
    
    # 1. Valid phone
    valid_req = LLMExtractionRequest(field_name="mobile", transcript="मेरा मोबाइल नंबर 9876543210 है", language="hi")
    valid_res = adapter.extract_field_candidate(valid_req)
    is_valid, err = FieldValidator.validate("mobile", valid_res.value, "hi")
    assert is_valid is True
    assert err is None

    # 2. Invalid phone (9 digits)
    invalid_req = LLMExtractionRequest(field_name="mobile", transcript="मेरा नंबर 987654321 है", language="hi")
    invalid_res = adapter.extract_field_candidate(invalid_req)
    is_valid, err = FieldValidator.validate("mobile", invalid_res.value, "hi")
    assert is_valid is False
    assert err is not None


def test_llm_malformed_json_fallback():
    """Verify that malformed JSON response from LLM provider falls back safely."""
    adapter = OpenAICompatibleLLMAdapter(api_key="mock-key", base_url="https://mock-llm.local/v1")

    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_resp = MagicMock()
        mock_resp.read.return_value = b"NOT VALID JSON <garbage text>"
        mock_resp.__enter__.return_value = mock_resp
        mock_urlopen.return_value = mock_resp

        req = LLMExtractionRequest(
            field_name="full_name",
            transcript="Mera naam Suresh Sharma hai",
            language="hi"
        )
        res = adapter.extract_field_candidate(req)

        assert res.field == "full_name"
        assert res.value == "Suresh Sharma"


def test_llm_timeout_and_unreachable_provider_fallback():
    """Verify timeout / network error during LLM invocation falls back safely."""
    import urllib.error
    adapter = OpenAICompatibleLLMAdapter(api_key="mock-key", base_url="https://timeout-llm.local/v1", timeout_seconds=0.1)

    with patch("urllib.request.urlopen", side_effect=urllib.error.URLError("Connection timed out")):
        req = LLMExtractionRequest(
            field_name="academic_year",
            transcript="तीसरा साल",
            language="hi"
        )
        res = adapter.extract_field_candidate(req)

        assert res.field == "academic_year"
        assert res.value == "3"


def test_missing_credentials_defaults_to_mock_adapter():
    """Verify missing credentials automatically and safely resolves to mock adapter."""
    with patch.dict(os.environ, {"LLM_PROVIDER": "mock", "LLM_API_KEY": ""}):
        adapter = get_llm_adapter()
        assert isinstance(adapter, MockDeterministicLLMAdapter)


def test_llm_safety_invariant_zero_unconfirmed_commits():
    """Verify that extracting an LLM candidate never commits to confirmed_fields without explicit confirmation."""
    engine = FormEngine()
    session = engine.create_session(language="hi")
    s_id = session["session_id"]

    # Turn processing extracts candidate
    turn = engine.process_turn(s_id, "मेरा नाम राहुल कुमार है", "voice")
    assert turn["status"] == "need_confirmation"
    assert turn["candidate_value"] in ["राहुल कुमार", "Rahul Kumar"]

    # Invariant: confirmed_fields in database MUST NOT contain full_name yet
    state = engine.get_session_state(s_id)
    assert "full_name" not in state["confirmed_fields"]

    # Only upon explicit confirmation is it committed
    conf = engine.confirm_candidate(s_id, "full_name", "confirm")
    assert conf["status"] == "saved_next_field"
    assert conf["session_state"]["confirmed_fields"]["full_name"] in ["राहुल कुमार", "Rahul Kumar"]
