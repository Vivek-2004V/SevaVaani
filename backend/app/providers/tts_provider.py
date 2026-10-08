import abc
from typing import Dict, Any

class BaseTTSProvider(abc.ABC):
    @abc.abstractmethod
    def synthesize(self, text: str, language: str = "hi") -> Dict[str, Any]:
        pass

class BhashiniTTSProvider(BaseTTSProvider):
    def __init__(self, api_key: str = "", user_id: str = ""):
        self.api_key = api_key
        self.user_id = user_id

    def synthesize(self, text: str, language: str = "hi") -> Dict[str, Any]:
        return {
            "text": text,
            "language": language,
            "provider": "bhashini",
            "audio_url": None
        }

class BrowserTTSFallback(BaseTTSProvider):
    def synthesize(self, text: str, language: str = "hi") -> Dict[str, Any]:
        return {
            "text": text,
            "language": language,
            "lang_code": "hi-IN" if language == "hi" else "mr-IN",
            "rate": 0.95,
            "provider": "browser_native"
        }

class MockTTSProvider(BaseTTSProvider):
    def synthesize(self, text: str, language: str = "hi") -> Dict[str, Any]:
        return {
            "text": text,
            "language": language,
            "provider": "mock"
        }
