"""
Automated Test Suite for Local Ollama LLM Integration in SEVA VAANI.

Verifies:
1. Ollama adapter configuration and model binding.
2. Ollama server check and health introspection.
3. Successful structured JSON extraction with active-field schema.
4. Resilience when Ollama server is offline / connection refused.
5. Resilience when model is not downloaded or times out.
6. Malformed JSON handling and markdown stripping.
7. Wrong-field protection (LLM cannot arbitrarily switch fields).
8. Hindi & Marathi utterance processing.
9. Safety invariant: LLM extracted value is strictly unconfirmed until citizen affirmation.
"""

import os
import sys
import json
import pytest
from unittest.mock import patch, MagicMock
import urllib.error

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.llm_adapter import OllamaLLMAdapter, get_llm_adapter
from app.schemas.llm import LLMExtractionRequest
from app.services.form_engine import FormEngine
from app.models.database import init_db


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


def test_ollama_adapter_initialization_defaults():
    """Verify Ollama adapter initializes with proper local defaults."""
    adapter = OllamaLLMAdapter()
    assert "11434" in adapter.base_url
    assert adapter.model in ["qwen3:4b", "llama3", os.getenv("OLLAMA_MODEL", "qwen3:4b")]
    assert adapter.timeout_seconds > 0


def test_ollama_server_check_offline_handling():
    """Verify check_server_status returns available=False when daemon is offline."""
    adapter = OllamaLLMAdapter(base_url="http://127.0.0.1:99999")
    status = adapter.check_server_status()
    assert status["available"] is False
    assert "error" in status
    assert status["model_present"] is False


def test_ollama_successful_json_extraction_hindi():
    """Verify successful Ollama chat extraction with valid JSON response in Hindi."""
    adapter = OllamaLLMAdapter(model="qwen3:4b")
    
    mock_ollama_response = {
        "model": "qwen3:4b",
        "message": {
            "role": "assistant",
            "content": json.dumps({
                "field": "full_name",
                "value": "राहुल रमेश पाटील",
                "confidence": 0.95,
                "confidence_flag": "needs_confirmation",
                "explanation": "Extracted candidate name from Hindi utterance"
            })
        }
    }

    mock_resp = MagicMock()
    mock_resp.read.return_value = json.dumps(mock_ollama_response).encode("utf-8")
    mock_resp.__enter__.return_value = mock_resp

    with patch("urllib.request.urlopen", return_value=mock_resp):
        req = LLMExtractionRequest(
            session_id="test_s1",
            field_name="full_name",
            transcript="मेरा नाम राहुल रमेश पाटील है",
            language="hi"
        )
        res = adapter.extract_field_candidate(req)

        assert res.field == "full_name"
        assert res.value == "राहुल रमेश पाटील"
        assert res.confidence == 0.95
        assert res.confidence_flag == "needs_confirmation"


def test_ollama_successful_json_extraction_marathi():
    """Verify successful Ollama chat extraction in Marathi."""
    adapter = OllamaLLMAdapter(model="qwen3:4b")
    
    mock_ollama_response = {
        "model": "qwen3:4b",
        "message": {
            "role": "assistant",
            "content": json.dumps({
                "field": "district",
                "value": "पुणे",
                "confidence": 0.92,
                "confidence_flag": "needs_confirmation",
                "explanation": "Extracted district from Marathi utterance"
            })
        }
    }

    mock_resp = MagicMock()
    mock_resp.read.return_value = json.dumps(mock_ollama_response).encode("utf-8")
    mock_resp.__enter__.return_value = mock_resp

    with patch("urllib.request.urlopen", return_value=mock_resp):
        req = LLMExtractionRequest(
            session_id="test_s2",
            field_name="district",
            transcript="माझा जिल्हा पुणे आहे",
            language="mr"
        )
        res = adapter.extract_field_candidate(req)

        assert res.field == "district"
        assert res.value == "पुणे"
        assert res.confidence_flag == "needs_confirmation"


def test_ollama_server_unavailable_falls_back_cleanly():
    """Verify connection failure to Ollama gracefully falls back to deterministic rules."""
    adapter = OllamaLLMAdapter(base_url="http://127.0.0.1:99999")

    # When Ollama is down, it should fall back to deterministic extraction
    req = LLMExtractionRequest(
        session_id="test_s3",
        field_name="mobile",
        transcript="मेरा मोबाइल नंबर 9876543210 है",
        language="hi"
    )
    res = adapter.extract_field_candidate(req)

    assert res.field == "mobile"
    assert res.value == "9876543210"
    assert res.confidence_flag == "needs_confirmation"


def test_ollama_timeout_falls_back_cleanly():
    """Verify timeout when calling Ollama gracefully falls back to deterministic rules."""
    adapter = OllamaLLMAdapter()

    with patch("urllib.request.urlopen", side_effect=urllib.error.URLError("Request timed out")):
        req = LLMExtractionRequest(
            session_id="test_s4",
            field_name="annual_income",
            transcript="Mere ghar ki saal ki income lagbhag ek lakh assi hazaar hai",
            language="hi"
        )
        res = adapter.extract_field_candidate(req)

        assert res.field == "annual_income"
        assert res.value == 180000


def test_ollama_malformed_json_falls_back_cleanly():
    """Verify malformed non-JSON output from Ollama falls back gracefully."""
    adapter = OllamaLLMAdapter()

    mock_ollama_response = {
        "message": {
            "content": "I am not sure, maybe full_name is Rahul" # Not valid JSON
        }
    }

    mock_resp = MagicMock()
    mock_resp.read.return_value = json.dumps(mock_ollama_response).encode("utf-8")
    mock_resp.__enter__.return_value = mock_resp

    with patch("urllib.request.urlopen", return_value=mock_resp):
        req = LLMExtractionRequest(
            session_id="test_s5",
            field_name="full_name",
            transcript="मेरा नाम राहुल है",
            language="hi"
        )
        res = adapter.extract_field_candidate(req)

        assert res.field == "full_name"
        assert "राहुल" in str(res.value)


def test_ollama_wrong_field_rejected():
    """Verify that if Ollama returns a field different from active field, it is rejected."""
    adapter = OllamaLLMAdapter()

    mock_ollama_response = {
        "message": {
            "content": json.dumps({
                "field": "mobile", # Wrong field returned
                "value": "9876543210"
            })
        }
    }

    mock_resp = MagicMock()
    mock_resp.read.return_value = json.dumps(mock_ollama_response).encode("utf-8")
    mock_resp.__enter__.return_value = mock_resp

    with patch("urllib.request.urlopen", return_value=mock_resp):
        req = LLMExtractionRequest(
            session_id="test_s6",
            field_name="full_name",
            transcript="मेरा नाम राहुल है",
            language="hi"
        )
        res = adapter.extract_field_candidate(req)

        assert res.field == "full_name"
        assert "राहुल" in str(res.value) # Fell back to correct active field extraction


def test_ollama_safety_invariant_zero_unconfirmed_commits():
    """Verify Ollama extracted value is NEVER committed directly without user confirmation."""
    with patch.dict(os.environ, {"LLM_PROVIDER": "ollama"}):
        engine = FormEngine()
        session = engine.create_session(language="hi")
        s_id = session["session_id"]

        turn_res = engine.process_turn(s_id, "मेरा नाम राहुल पाटील है")
        
        # Candidate value must be pending confirmation
        assert turn_res["status"] == "need_confirmation"
        assert "राहुल" in str(turn_res["candidate_value"])

        # Check DB directly: must NOT be in confirmed_fields
        state = engine.get_session_state(s_id)
        assert "full_name" not in state["confirmed_fields"]
        assert state["candidate_field"]["candidate_value"] == turn_res["candidate_value"]

        # Explicit confirmation is required to commit
        engine.confirm_candidate(s_id, "full_name", "confirm")
        state_after = engine.get_session_state(s_id)
        assert state_after["confirmed_fields"]["full_name"] == turn_res["candidate_value"]
