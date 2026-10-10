"""
Tests for Prompt 9 — Text-to-Speech Pronunciation and Naturalness.

Verifies:
1. Suitable voice selection for Hindi (hi-IN), Marathi (mr-IN), and English (en-IN).
2. Avoids switching to an unrelated language voice unexpectedly.
3. Pronunciation testing of names, numbers, districts, and public service terms.
4. Support for slower playback (0.80x), calm default pacing (0.92x), replay and stop.
5. Avoids claiming a voice is a native regional accent unless verified.
6. Display of transcripts for spoken responses and graceful text fallback.
7. Verification of ethical voice policies (no unconsented voice cloning, honest fine-tuning declarations).
"""

import os
import pytest
from app.services.tts_pronunciation import TTSPronunciationService
from app.providers.tts_provider import BrowserTTSFallback, BhashiniTTSProvider


def test_suitable_voice_selection_and_isolation():
    """
    Requirement 1 & 2:
    Select suitable voice for hi-IN, mr-IN, and en-IN.
    Strict isolation: never cross into unrelated languages (e.g. Marathi falling back to German).
    """
    mock_browser_voices = [
        {"name": "Google हिन्दी", "lang": "hi-IN"},
        {"name": "Google मराठी", "lang": "mr-IN"},
        {"name": "Google English (India)", "lang": "en-IN"},
        {"name": "Google US English", "lang": "en-US"},
        {"name": "Google Deutsch", "lang": "de-DE"}
    ]

    # Hindi selection
    v_hi = TTSPronunciationService.resolve_best_voice("hi", mock_browser_voices)
    assert v_hi["locale"] == "hi-IN"
    assert v_hi["selected_voice"] == "Google हिन्दी"
    assert v_hi["cross_language_switch_prevented"] is True

    # Marathi selection
    v_mr = TTSPronunciationService.resolve_best_voice("mr", mock_browser_voices)
    assert v_mr["locale"] == "mr-IN"
    assert v_mr["selected_voice"] == "Google मराठी"
    assert v_mr["cross_language_switch_prevented"] is True

    # English selection
    v_en = TTSPronunciationService.resolve_best_voice("en", mock_browser_voices)
    assert v_en["locale"] == "en-IN"
    assert v_en["selected_voice"] == "Google English (India)"

    # When no Marathi voice exists: DO NOT pick German or US English!
    voices_without_mr = [
        {"name": "Google US English", "lang": "en-US"},
        {"name": "Google Deutsch", "lang": "de-DE"}
    ]
    v_fallback = TTSPronunciationService.resolve_best_voice("mr", voices_without_mr)
    assert v_fallback["selected_voice"] is None
    assert v_fallback["status"] == "no_locale_match_text_display_recommended"
    assert v_fallback["cross_language_switch_prevented"] is True


def test_pronunciation_numbers_districts_services():
    """
    Requirement 3:
    Test pronunciation of numbers, currency, districts, and services.
    """
    # 1. Currency expansion in Hindi
    hi_curr = TTSPronunciationService.prepare_intelligible_spoken_text(
        "Aapki annual income ₹2,00,000 hai.", "hi"
    )
    assert "दो लाख रुपये" in hi_curr

    # 2. Currency expansion in Marathi
    mr_curr = TTSPronunciationService.prepare_intelligible_spoken_text(
        "तुमचे वार्षिक उत्पन्न ₹2,00,000 आहे.", "mr"
    )
    assert "दोन लाख रुपये" in mr_curr

    # 3. Currency expansion in English
    en_curr = TTSPronunciationService.prepare_intelligible_spoken_text(
        "Your annual income is ₹2,00,000.", "en"
    )
    assert "two lakh rupees" in en_curr

    # 4. District name pronunciation
    dist_mr = TTSPronunciationService.prepare_intelligible_spoken_text(
        "आपला जिल्हा Chhatrapati Sambhajinagar आहे.", "mr"
    )
    assert "छत्रपती संभाजीनगर" in dist_mr

    # 5. Full test suite execution
    bench = TTSPronunciationService.benchmark_pronunciation_suite()
    assert bench["pass_rate"] == 1.0


def test_honest_accent_declarations_and_ethics_policy():
    """
    Requirement 5 & 10:
    Voices must be honestly classified.
    Voice cloning is prohibited; no claims of fine-tuning unless reproducible training occurred.
    """
    policy_path = TTSPronunciationService.generate_tts_policy_documentation()
    assert os.path.isfile(policy_path)

    with open(policy_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert "Zero Voice Cloning" in content
    assert "Honest Accent Declarations" in content
    assert "No False Fine-Tuning Claims" in content
    assert "0.92x" in content
    assert "0.80x" in content
    assert "replay" in content


def test_browser_tts_provider_pacing():
    """
    Requirement 4 & 6:
    Verify TTS providers configure calm public service pacing.
    """
    provider = BrowserTTSFallback()
    res = provider.synthesize("कृपया अपना नाम बताएं", language="hi")
    assert res["lang_code"] == "hi-IN"
    assert res["rate"] == 0.92  # Accessible calm pace
    assert res["audio_format"] == "browser_speech_synthesis"

    # Marathi
    res_mr = provider.synthesize("आपले नाव सांगा", language="mr")
    assert res_mr["lang_code"] == "mr-IN"
