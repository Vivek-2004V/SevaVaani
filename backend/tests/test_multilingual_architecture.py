"""
Automated Test Suite for Universal Indian Multilingual Voice Architecture in SEVA VAANI.

Verifies:
1. Centralized 22 Eighth Schedule Language Registry and capability introspection.
2. Indic Language Identification (LID) across Indian scripts.
3. Low-confidence LID gating requiring user confirmation.
4. Named Entity and exact-value preservation during Indic translation.
5. Pluggable FastAPI endpoints (/api/languages, /api/languages/{code}, /api/languages/detect).
6. Mid-session language switching across Indian languages preserving workflow state.
"""

import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.main import app
from app.models.database import init_db
from app.services.language_registry import LanguageRegistry
from app.services.lid_adapter import IndicLanguageDetector
from app.services.translation_adapter import IndicTranslationAdapter
from app.services.form_engine import FormEngine

@pytest.fixture(autouse=True)
def setup_db():
    init_db()

client = TestClient(app)


def test_language_registry_schedule_eight_coverage():
    """Verify registry contains all 22 Eighth Schedule languages + English with capability metadata."""
    languages = LanguageRegistry.list_all()
    
    # 22 official + English = 23 entries minimum
    assert len(languages) >= 23
    
    # Core 22 Eighth Schedule language codes
    schedule_eight_codes = {
        "hi", "mr", "bn", "ta", "te", "gu", "kn", "ml", "pa", "or",
        "as", "ur", "sa", "ne", "kok", "sd", "ks", "doi", "mai", "mni", "sat", "brx"
    }
    
    registered_codes = {l["code"] for l in languages}
    for code in schedule_eight_codes:
        assert code in registered_codes, f"Eighth Schedule language '{code}' missing from registry"
        
    # Check Hindi capabilities (Tier 1 Verified)
    hi_cap = LanguageRegistry.get_capabilities("hi")
    assert hi_cap["stt"] is True
    assert hi_cap["tts"] is True
    assert hi_cap["tier"] == "tier_1_verified"
    
    # Check Tamil capabilities (Tier 2 Adapter Verified)
    ta_cap = LanguageRegistry.get_capabilities("ta")
    assert ta_cap["stt"] is True
    assert ta_cap["tts"] is True
    assert "tier_2" in ta_cap["tier"]
    
    # Check Bodo / Santhali (Tier 3 Experimental / Low Resource)
    brx_cap = LanguageRegistry.get_capabilities("brx")
    assert brx_cap["tier"] == "tier_3_experimental"


def test_lid_script_detection_accuracy():
    """Verify LID detector across multiple Indian writing systems."""
    test_samples = [
        ("வணக்கம் என் பெயர் ராகுல்", "ta", "Tamil"),
        ("నమస్కారం నా పేరు రాహుల్", "te", "Telugu"),
        ("নমস্কার আমার নাম রাহুল", "bn", "Bengali"),
        ("નમસ્તે મારું નામ રાહુલ છે", "gu", "Gujarati"),
        ("ನಮಸ್ಕಾರ ನನ್ನ ಹೆಸರು ರಾಹುಲ್", "kn", "Kannada"),
        ("നമസ്കാരം എന്റെ പേര് രാഹുൽ", "ml", "Malayalam"),
        ("ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ ਮੇਰਾ ਨਾਮ ਰਾਹੁਲ ਹੈ", "pa", "Punjabi"),
        ("ନମସ୍କାର ମୋର ନାମ ରାହୁଲ", "or", "Odia"),
        ("میرا نام راہول ہے", "ur", "Urdu"),
        ("Hello my name is Rahul", "en", "English"),
        ("माझे नाव राहुल आहे", "mr", "Marathi"),
        ("मेरा नाम राहुल है", "hi", "Hindi"),
    ]
    
    for text, expected_lang, lang_name in test_samples:
        result = IndicLanguageDetector.detect_language(text)
        assert result["detected_language"] == expected_lang, (
            f"Expected {lang_name} ({expected_lang}), got {result['detected_language']} for text '{text}'"
        )
        assert result["confidence"] >= 0.70, f"Confidence for {lang_name} should be >= 0.70"
        assert result["needs_confirmation"] is False


def test_lid_low_confidence_and_ambiguous_triggers_confirmation():
    """Verify ambiguous or mixed inputs trigger needs_confirmation=True."""
    # 1. Ambiguous Devanagari without clear lexical markers (e.g. just numbers / non-marker words)
    res1 = IndicLanguageDetector.detect_language("अमित कुमार 1234")
    assert res1["needs_confirmation"] is True
    assert res1["confidence"] <= 0.70
    
    # 2. Unknown gibberish / empty text defaults safely to Hindi with low confidence & confirmation
    res2 = IndicLanguageDetector.detect_language("12345 !@#$%")
    assert res2["needs_confirmation"] is True
    assert res2["confidence"] <= 0.60


def test_translation_exact_value_named_entity_preservation():
    """Verify named entities, DOB, identity numbers, and phone numbers are never mutated by translation."""
    candidate_name = "Rahul Ramesh Patil"
    
    for lang in ["hi", "mr", "ta", "te", "bn", "gu", "kn", "ml", "pa", "or", "en"]:
        conf_prompt = IndicTranslationAdapter.format_confirmation("full_name", "Full Name", candidate_name, lang)
        assert candidate_name in conf_prompt, f"Citizen name '{candidate_name}' missing/mutated in {lang} prompt: {conf_prompt}"
        
    # Test phone number preservation
    candidate_phone = "9876543210"
    for lang in ["hi", "mr", "ta", "te", "bn"]:
        conf_prompt = IndicTranslationAdapter.format_confirmation("mobile", "Mobile Number", candidate_phone, lang)
        assert candidate_phone in conf_prompt, f"Phone '{candidate_phone}' missing/mutated in {lang} prompt: {conf_prompt}"


def test_api_languages_endpoints():
    """Verify FastAPI /api/languages endpoints."""
    # List all languages
    response = client.get("/api/languages")
    assert response.status_code == 200
    languages = response.json()
    assert isinstance(languages, list)
    assert len(languages) >= 23
    
    # Get specific language details
    ta_res = client.get("/api/languages/ta")
    assert ta_res.status_code == 200
    ta_data = ta_res.json()
    assert ta_data["language"]["code"] == "ta"
    assert ta_data["language"]["name_en"] == "Tamil"
    assert ta_data["capabilities"]["tts"] is True
    
    # Non-existent language returns 404
    non_res = client.get("/api/languages/xyz")
    assert non_res.status_code == 404
    
    # Language detection endpoint
    detect_res = client.post("/api/languages/detect", json={"text": "வணக்கம் என் பெயர் கார்த்திக்"})
    assert detect_res.status_code == 200
    d_data = detect_res.json()
    assert d_data["detected_language"] == "ta"
    assert d_data["needs_confirmation"] is False


def test_multilingual_session_language_switching_preserves_state():
    """Verify user can switch conversation language across Indian languages mid-session without data loss."""
    engine = FormEngine()
    session = engine.create_session(language="hi")
    s_id = session["session_id"]
    
    # Step 1: In Hindi, process text fallback and confirm full_name
    engine.process_text_fallback(s_id, "full_name", "अमित कुमार")
    
    state = engine.get_session_state(s_id)
    assert state["confirmed_fields"]["full_name"] == "अमित कुमार"
    assert state["current_field"] == "dob"  # Next is dob
    
    # Step 2: User switches language to Marathi ('mr')
    switched = engine.switch_language(s_id, "mr")
    assert switched["language"] == "mr"
    assert switched["confirmed_fields"]["full_name"] == "अमित कुमार"  # Preserved!
    
    # Step 3: User provides DOB in Marathi session, confirms
    engine.process_text_fallback(s_id, "dob", "15/08/2001")
    
    # Step 4: User switches to Tamil ('ta')
    session_ta = engine.switch_language(s_id, "ta")
    assert session_ta["language"] == "ta"
    assert session_ta["confirmed_fields"]["full_name"] == "अमित कुमार"
    assert session_ta["confirmed_fields"]["dob"] == "15/08/2001"
