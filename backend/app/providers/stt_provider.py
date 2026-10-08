import abc
from typing import Dict, Any, Optional

class BaseSTTProvider(abc.ABC):
    @abc.abstractmethod
    def transcribe(self, audio_bytes: bytes, language: str = "hi") -> Dict[str, Any]:
        pass

class BhashiniSTTProvider(BaseSTTProvider):
    def __init__(self, api_key: str = "", user_id: str = ""):
        self.api_key = api_key
        self.user_id = user_id

    def transcribe(self, audio_bytes: bytes, language: str = "hi") -> Dict[str, Any]:
        # Ready hook for Bhashini ULCA ASR pipeline
        return {
            "transcript": "",
            "confidence": 0.88,
            "provider": "bhashini",
            "language": language
        }

class BrowserSTTFallback(BaseSTTProvider):
    def transcribe(self, audio_bytes: bytes, language: str = "hi") -> Dict[str, Any]:
        return {
            "transcript": "",
            "confidence": 0.85,
            "provider": "browser_native",
            "language": language
        }

class MockSTTProvider(BaseSTTProvider):
    def transcribe(self, audio_bytes: bytes, language: str = "hi") -> Dict[str, Any]:
        return {
            "transcript": "Ramesh Kumar",
            "confidence": 0.95,
            "provider": "mock",
            "language": language
        }
