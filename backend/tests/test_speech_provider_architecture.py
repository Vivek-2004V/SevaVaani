"""
Comprehensive Verification Tests for Modular Speech Provider Architecture (Prompt 2).
Verifies all 9 core requirements:
1. Hindi, English, Marathi and code-switched Hindi-English support
2. Preservation of original transcript alongside normalized version
3. Strict protection of names, locations, dates, phone numbers, and monetary amounts
4. Unsupported language detection and clarification requests
5. Graceful handling of missing credentials, timeouts, and provider errors
6. Zero credential exposure in client-facing payloads
7. Secure server-side routing
8. Zero permanent storage of raw audio recordings
9. Comparative evaluation of alternative models on identical audio samples
10. Truthful labeling of mock and fallback providers
"""

import pytest
import os
import io
import wave
import base64
from fastapi.testclient import TestClient

from app.main import app
from app.providers.stt_provider import (
    BaseSTTProvider,
    MockSTTProvider,
    BrowserSTTFallback,
    BhashiniSTTProvider,
    LocalWhisperSTTProvider,
    CustomHttpSTTProvider
)
from app.providers.lid_provider import (
    BaseLIDProvider,
    MockLIDProvider,
    ScriptAndLexicalLIDProvider,
    BhashiniLIDProvider
)
from app.providers.tts_provider import (
    BaseTTSProvider,
    MockTTSProvider,
    BrowserTTSFallback,
    BhashiniTTSProvider,
    LocalIndicTTSProvider
)
from app.providers.translation_provider import (
    BaseTranslationProvider,
    MockTranslationProvider,
    IndicRuleTranslationProvider,
    BhashiniTranslationProvider
)
from app.providers.accent_evaluator import AccentEvaluationModule
from app.services.audio_preprocessor import AudioPreprocessor
from app.services.transcript_normalizer import TranscriptNormalizer
from app.services.speech_pipeline import SpeechPipelineOrchestrator


@pytest.fixture
def test_client():
    return TestClient(app)


def generate_dummy_wav_bytes(duration_sec: float = 0.5, sample_rate: int = 16000) -> bytes:
    """Helper to synthesize valid in-memory PCM WAV bytes for testing."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        # Synthesize tone samples
        import struct
        total_samples = int(duration_sec * sample_rate)
        raw_data = struct.pack(f"<{total_samples}h", *([500 if i % 2 == 0 else -500 for i in range(total_samples)]))
        wf.writeframes(raw_data)
    return buf.getvalue()


# -----------------------------------------------------------------------------
# REQUIREMENT 1 & 10: Multilingual Support, Code-switching, Truth in Labeling
# -----------------------------------------------------------------------------

def test_multilingual_lid_and_codeswitching():
    """Verify Hindi, Marathi, English, and Hinglish code-switching detection."""
    lid = ScriptAndLexicalLIDProvider()

    # Pure Hindi
    hi_res = lid.identify("मेरा नाम रमेश है और मैं भोपाल में रहता हूँ")
    assert hi_res["detected_language"] == "hi"
    assert hi_res["is_supported"] is True
    assert hi_res["is_code_switched"] is False

    # Pure Marathi
    mr_res = lid.identify("माझे नाव सचिन आहे आणि मी पुण्यात राहतो")
    assert mr_res["detected_language"] == "mr"
    assert mr_res["is_supported"] is True
    assert mr_res["is_code_switched"] is False

    # Pure English
    en_res = lid.identify("My name is John and I live in Pune")
    assert en_res["detected_language"] == "en"
    assert en_res["is_supported"] is True
    assert en_res["is_code_switched"] is False

    # Code-switched Hinglish (Devanagari + English words)
    hinglish_res = lid.identify("मेरा name रमेश है and income 2 lakh hai")
    assert hinglish_res["is_code_switched"] is True
    assert hinglish_res["is_supported"] is True
    assert hinglish_res["detected_language"] in ["hi-en", "mr-en"]

    # Romanized Hinglish
    rom_hi_res = lid.identify("mera naam Ramesh hai aur income do lakh hai")
    assert rom_hi_res["detected_language"] == "hi-en"
    assert rom_hi_res["is_code_switched"] is True


def test_truth_in_labeling_mock_and_fallback():
    """Verify mock providers are explicitly labeled and never pretend to be real ASR."""
    mock_stt = MockSTTProvider()
    assert mock_stt.is_mock is True
    assert mock_stt.provider_type == "mock"
    stt_res = mock_stt.transcribe(b"dummy")
    assert stt_res["is_mock"] is True
    assert "MOCK_PROVIDER" in stt_res["note"]

    browser_stt = BrowserSTTFallback()
    assert browser_stt.is_mock is False
    assert browser_stt.provider_type == "browser_fallback"

    mock_tts = MockTTSProvider()
    assert mock_tts.is_mock is True
    assert mock_tts.provider_type == "mock"
    tts_res = mock_tts.synthesize("Hello")
    assert tts_res["is_mock"] is True


# -----------------------------------------------------------------------------
# REQUIREMENT 2 & 3: Original Transcript & Protected Entity Preservation
# -----------------------------------------------------------------------------

def test_transcript_normalization_preserves_original_and_entities():
    """
    Verify original transcript is preserved alongside normalized version,
    and named entities (names, districts) are NEVER corrupted into numbers.
    """
    normalizer = TranscriptNormalizer()

    # Case A: Person name + Indian currency in Hindi
    utterance_hi = "मेरा नाम रमेश कुमार है और मेरी आय दो लाख रुपये है"
    res_hi = normalizer.normalize(utterance_hi, language="hi")

    # Requirement 2: Both original and normalized exist
    assert res_hi["original_transcript"] == utterance_hi
    assert "200000" in res_hi["normalized_transcript"]
    # Requirement 3: Person name protected without alteration
    assert "रमेश कुमार" in res_hi["normalized_transcript"]
    assert any(p["text"] == "रमेश कुमार" for p in res_hi["protected_entities_preserved"])
    assert any(t["category"] == "monetary_amount" and t["replacement"] == "200000" for t in res_hi["transformations"])

    # Case B: Marathi place name + currency
    utterance_mr = "मी पुणे जिल्ह्यात राहतो आणि माझे उत्पन्न पन्नास हजार आहे"
    res_mr = normalizer.normalize(utterance_mr, language="mr")
    assert res_mr["original_transcript"] == utterance_mr
    assert "50000" in res_mr["normalized_transcript"]
    assert "पुणे" in res_mr["normalized_transcript"]
    assert any(p["text"] == "पुणे" for p in res_mr["protected_entities_preserved"])

    # Case C: Spoken 10-digit mobile number
    utterance_phone = "मेरा मोबाइल नंबर नौ आठ दो तीन चार पाँच छह सात आठ नौ है"
    res_phone = normalizer.normalize(utterance_phone, language="hi")
    assert "9823456789" in res_phone["normalized_transcript"]
    assert any(t["category"] == "phone_number" for t in res_phone["transformations"])


def test_entity_shielding_in_translation():
    """Verify Translation Provider shields names and districts from machine translation corruption."""
    translator = IndicRuleTranslationProvider()
    protected_entities = ["रमेश कुमार", "भोपाल"]

    res = translator.translate(
        text="मेरा नाम रमेश कुमार है और मेरा जिला भोपाल है",
        source_lang="hi",
        target_lang="mr",
        protected_entities=protected_entities
    )

    # Protected entities must remain exactly intact
    assert "रमेश कुमार" in res["translated_text"]
    assert "भोपाल" in res["translated_text"]
    assert set(protected_entities).issubset(set(res["protected_entities_preserved"]))


# -----------------------------------------------------------------------------
# REQUIREMENT 4: Unsupported Language Detection & Clarification
# -----------------------------------------------------------------------------

def test_unsupported_language_detection_and_clarification():
    """Verify unsupported languages (e.g. French, German, Tamil in default mode) trigger clarification prompts."""
    lid = ScriptAndLexicalLIDProvider()

    # Tamil script (Indic, but requires clarification in Hindi/Marathi/English core mode)
    ta_res = lid.identify("என் பெயர் ரமேஷ் குமார்")
    assert ta_res["is_supported"] is False
    assert ta_res["clarification_needed"] is True
    assert ta_res["clarification_prompt"] is not None

    # Pipeline orchestrator must intercept unsupported language and return clarification prompt
    orchestrator = SpeechPipelineOrchestrator(lid_provider=lid)
    pipe_res = orchestrator.process_turn(
        session_id="dummy_session_unsupported",
        client_transcript="என் பெயர் ரமேஷ் குமார்"
    )
    assert pipe_res["status"] == "unsupported_language_clarification_required"
    assert "clarification" in pipe_res["prompt"].lower() or "सेवा वाणी" in pipe_res["prompt"]
    assert pipe_res["tts_payload"] is not None


# -----------------------------------------------------------------------------
# REQUIREMENT 5: Graceful Handling of Missing Credentials, Timeouts, Errors
# -----------------------------------------------------------------------------

def test_graceful_missing_credentials_and_errors():
    """Verify providers return safe structured errors without crashing or throwing 500s."""
    # Bhashini STT with empty credentials
    bhashini_stt = BhashiniSTTProvider(api_key="", user_id="")
    res = bhashini_stt.transcribe(b"dummy_bytes")
    assert res["status"] == "missing_credentials"
    assert res["transcript"] == ""
    assert res["confidence"] == 0.0

    # Local Whisper when faster-whisper is not installed
    local_whisper = LocalWhisperSTTProvider()
    local_whisper._is_available = False
    whisper_res = local_whisper.transcribe(b"dummy_bytes")
    assert whisper_res["status"] == "uninstalled"
    assert whisper_res["confidence"] == 0.0

    # Custom HTTP STT with missing endpoint
    custom_stt = CustomHttpSTTProvider(endpoint_url="")
    custom_res = custom_stt.transcribe(b"dummy_bytes")
    assert custom_res["status"] == "missing_endpoint"

    # Bhashini TTS with missing credentials falls back cleanly to browser native
    bhashini_tts = BhashiniTTSProvider(api_key="", user_id="")
    tts_res = bhashini_tts.synthesize("नमस्ते", language="hi")
    assert tts_res["lang_code"] == "hi-IN"
    assert "missing_credentials" in tts_res.get("status", "")


# -----------------------------------------------------------------------------
# REQUIREMENT 6 & 7: Zero Credential Exposure & Secure Server Endpoints
# -----------------------------------------------------------------------------

def test_zero_credential_leakage_in_api(test_client):
    """Verify /api/speech/providers never leaks BHASHINI_API_KEY or private credentials."""
    resp = test_client.get("/api/speech/providers")
    assert resp.status_code == 200
    data = resp.json()

    # Validate structure
    assert "stt" in data
    assert "tts" in data
    assert "privacy" in data

    # Assert no secret keys leaked
    raw_text = resp.text
    assert "BHASHINI_API_KEY" not in raw_text
    assert "rbiwUe2u_1YOu_d8ArOrVj6q" not in raw_text  # Check actual key fragment
    assert "password" not in raw_text.lower()


def test_server_side_transcribe_and_synthesize_endpoints(test_client):
    """Verify server-side API endpoints route requests safely."""
    # Transcribe via client transcript fallback
    tx_resp = test_client.post("/api/speech/transcribe", json={
        "client_transcript": "रमेश कुमार",
        "language": "hi"
    })
    assert tx_resp.status_code == 200
    assert tx_resp.json()["transcript"] == "रमेश कुमार"

    # Synthesize
    tts_resp = test_client.post("/api/speech/synthesize", json={
        "text": "कृपया आपले नाव सांगा",
        "language": "mr",
        "rate": 0.92
    })
    assert tts_resp.status_code == 200
    assert tts_resp.json()["lang_code"] == "mr-IN"

    # Normalize endpoint
    norm_resp = test_client.post("/api/speech/normalize-transcript", json={
        "text": "माझे उत्पन्न दोन लाख रुपये आहे",
        "language": "mr"
    })
    assert norm_resp.status_code == 200
    assert "200000" in norm_resp.json()["normalized_transcript"]
    assert norm_resp.json()["original_transcript"] == "माझे उत्पन्न दोन लाख रुपये आहे"


# -----------------------------------------------------------------------------
# REQUIREMENT 8: Zero Permanent Audio Disk Storage
# -----------------------------------------------------------------------------

def test_zero_permanent_audio_storage_policy():
    """Verify audio preprocessor and pipeline never persist citizen audio to disk."""
    dummy_wav = generate_dummy_wav_bytes(0.3)
    prep_res = AudioPreprocessor.preprocess(dummy_wav)

    assert prep_res["is_valid"] is True
    assert prep_res["persisted_to_disk"] is False
    assert prep_res["storage_policy"] == "ephemeral_volatile_ram_only"
    assert prep_res["audio_bytes"] is not None

    # Silence trimming operates in-memory
    trimmed_bytes, trimmed_sec = AudioPreprocessor.trim_silence_in_memory(dummy_wav)
    assert isinstance(trimmed_bytes, bytes)


# -----------------------------------------------------------------------------
# REQUIREMENT 9: Comparative Multi-Model Evaluation on Same Sample
# -----------------------------------------------------------------------------

def test_multi_model_benchmark_on_identical_sample(test_client):
    """
    Requirement 9: Verify AccentEvaluationModule runs multiple candidate models
    on the exact same audio bytes and computes WER, CER, and latency side-by-side.
    """
    dummy_wav = generate_dummy_wav_bytes(0.5)
    b64_audio = base64.b64encode(dummy_wav).decode("utf-8")
    reference = "Ramesh Kumar"

    # Direct module test
    providers = [
        MockSTTProvider(predefined_transcript="Ramesh Kumar"),
        MockSTTProvider(predefined_transcript="Ramesh Singh"),
        BrowserSTTFallback()
    ]

    eval_res = AccentEvaluationModule.evaluate_models_on_sample(
        audio_bytes=dummy_wav,
        reference_transcript=reference,
        providers=providers,
        language="hi"
    )

    assert eval_res["candidate_count"] == 3
    benchmarks = eval_res["benchmark_results"]
    assert len(benchmarks) == 3

    # Exact match candidate must have WER = 0.0
    exact_match = next(b for b in benchmarks if b["hypothesis_transcript"] == "Ramesh Kumar")
    assert exact_match["wer"] == 0.0
    assert exact_match["cer"] == 0.0

    # 1 substitution out of 2 words candidate must have WER = 0.5
    sub_match = next(b for b in benchmarks if b["hypothesis_transcript"] == "Ramesh Singh")
    assert sub_match["wer"] == 0.5

    # Verify best performing model selection
    assert eval_res["best_performing_provider"] == "mock"

    # API Endpoint test for model comparison
    api_resp = test_client.post("/api/speech/compare-models", json={
        "audio_base64": b64_audio,
        "reference_transcript": reference,
        "language": "hi"
    })
    assert api_resp.status_code == 200
    api_data = api_resp.json()
    assert "benchmark_results" in api_data
    assert len(api_data["benchmark_results"]) >= 2


def test_accent_and_regional_dialect_markers():
    """Verify regional dialect markers detection for Bhojpuri, Bundelkhandi, and Varhadi."""
    evaluator = AccentEvaluationModule()

    # Bhojpuri marker in Hindi
    hi_bhojpuri = evaluator.detect_regional_dialect_markers("हमार नाम रमेश बा", language="hi")
    assert hi_bhojpuri["has_regional_markers"] is True
    assert any(d["dialect"] == "bhojpuri_awadhi" for d in hi_bhojpuri["detected_dialects"])

    # Varhadi marker in Marathi
    mr_varhadi = evaluator.detect_regional_dialect_markers("व्हय मी अर्ज केला होता", language="mr")
    assert mr_varhadi["has_regional_markers"] is True
    assert any(d["dialect"] == "varhadi_vidarbha" for d in mr_varhadi["detected_dialects"])
