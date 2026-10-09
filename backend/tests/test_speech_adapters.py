import pytest
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.stt import STTAdapter
from app.services.tts import TTSAdapter
from app.providers.stt_provider import BrowserSTTFallback, MockSTTProvider
from app.providers.tts_provider import BrowserTTSFallback, MockTTSProvider

def test_stt_adapter_wer_calculation():
    """Verify Word Error Rate (WER) mathematical calculation for ASR evaluation"""
    stt = STTAdapter()

    # Exact match -> 0.0 WER
    wer_exact = stt.evaluate_wer("Ramesh Kumar", "Ramesh Kumar")
    assert wer_exact == 0.0

    # 1 substitution out of 2 words -> 0.5 WER
    wer_sub = stt.evaluate_wer("Ramesh Kumar", "Ramesh Singh")
    assert wer_sub == 0.5

    # Completely different -> 1.0 WER
    wer_diff = stt.evaluate_wer("Indore", "Bhopal")
    assert wer_diff == 1.0

def test_tts_adapter_payload_formatting():
    """Verify TTS adapter prepares appropriate locale codes and voice rate for Hindi, Marathi, and English"""
    tts = TTSAdapter()

    # Hindi
    hi_payload = tts.format_tts_payload("कृपया अपना पूरा नाम बताएं।", "hi")
    assert hi_payload["lang_code"] == "hi-IN"
    assert hi_payload["rate"] == 0.92
    assert hi_payload["pitch"] == 1.0

    # Marathi
    mr_payload = tts.format_tts_payload("कृपया आपले संपूर्ण नाव सांगा.", "mr")
    assert mr_payload["lang_code"] == "mr-IN"
    assert mr_payload["rate"] == 0.92

    # English
    en_payload = tts.format_tts_payload("Please state your full name.", "en")
    assert en_payload["language"] == "en"
    assert en_payload["rate"] == 0.92

def test_replaceable_providers_contracts():
    """Verify replaceable STT and TTS provider interfaces comply with base contracts"""
    # STT Providers
    browser_stt = BrowserSTTFallback()
    stt_res = browser_stt.transcribe(b"dummy_audio_bytes", "hi")
    assert stt_res["provider"] == "browser_native"
    assert stt_res["language"] == "hi"

    mock_stt = MockSTTProvider()
    mock_res = mock_stt.transcribe(b"dummy_audio_bytes", "mr")
    assert mock_res["provider"] == "mock"
    assert mock_res["transcript"] == "Ramesh Kumar"

    # TTS Providers
    browser_tts = BrowserTTSFallback()
    tts_res = browser_tts.synthesize("नमस्कार", "mr")
    assert tts_res["provider"] == "browser_native"
    assert tts_res["lang_code"] == "mr-IN"

    mock_tts = MockTTSProvider()
    mock_tts_res = mock_tts.synthesize("Hello", "en")
    assert mock_tts_res["provider"] == "mock"
