"""
Voice Assistant Service for SevaVaani.
Coordinates multilingual voice turns, speech transcription, text-to-speech feedback,
and step-by-step form completion.
"""

from __future__ import annotations
from typing import Dict, Any, Optional

from app.services.form_engine import FormEngine
from app.services.stt import STTAdapter
from app.services.tts import TTSAdapter
from app.services.translation_adapter import IndicTranslationAdapter


class VoiceAssistantService:
    """
    Central orchestrator for voice-driven form filling, confirmation, and fallback.
    """

    def __init__(self, form_engine: Optional[FormEngine] = None):
        self.form_engine = form_engine or FormEngine()
        self.stt = STTAdapter()
        self.tts = TTSAdapter()
        self.translation = IndicTranslationAdapter()

    def process_voice_turn(
        self,
        session_id: str,
        user_speech: str,
        audio_payload: Optional[bytes] = None,
        language: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process a single spoken or typed turn from the citizen.
        If raw audio is provided, optionally routes through STT first.
        """
        speech_text = user_speech
        if audio_payload and not speech_text:
            stt_res = self.stt.transcribe_audio_payload(audio_payload, language=language or "hi")
            speech_text = stt_res.get("transcript", "")

        return self.form_engine.process_turn(session_id, speech_text)

    def confirm_field(self, session_id: str, confirmed: bool) -> Dict[str, Any]:
        """
        Processes citizen's confirmation or correction for the extracted field value.
        """
        return self.form_engine.confirm_value(session_id, confirmed)

    def handle_fallback(self, session_id: str, text: str) -> Dict[str, Any]:
        """
        Text fallback when microphone or speech input fails.
        """
        return self.form_engine.handle_text_fallback(session_id, text)

    def synthesize_prompt(self, text: str, language: str = "hi") -> Dict[str, Any]:
        """
        Prepares TTS payload for voice synthesis.
        """
        return self.tts.format_tts_payload(text, language=language)


# Singleton instance for convenience
voice_assistant = VoiceAssistantService()

__all__ = ["VoiceAssistantService", "voice_assistant"]
