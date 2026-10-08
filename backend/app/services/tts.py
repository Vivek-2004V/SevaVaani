import os
from typing import Dict, Any, Optional

class TTSAdapter:
    """
    TTS Provider Adapter.
    Formats contextual Indian language voice prompts and confirms for speech output.
    """
    def __init__(self, provider: str = "web_speech_native"):
        self.provider = provider
        self.bhashini_api_key = os.getenv("BHASHINI_API_KEY", "")

    def format_tts_payload(self, text: str, language: str = "hi") -> Dict[str, Any]:
        """
        Prepares speech synthesis parameters for browser Web Speech API or server-side audio.
        """
        lang_code = "hi-IN" if language == "hi" else "mr-IN"
        return {
            "text": text,
            "language": language,
            "lang_code": lang_code,
            "rate": 0.92,   # slightly calmer rate for clarity in citizen public services
            "pitch": 1.0,
            "provider": self.provider
        }
