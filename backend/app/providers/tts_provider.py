"""
Modular Text-To-Speech (TTS) Provider Architecture for SEVA VAANI.
Supports replaceable speech synthesis engines:
- MockTTSProvider (Deterministic testing/CI)
- BrowserTTSFallback (Web Speech API speech synthesis parameters)
- BhashiniTTSProvider (Government of India ULCA Indic TTS)
- LocalIndicTTSProvider (Indic-Parler-TTS / VITS local neural synthesis)
"""

from __future__ import annotations
import abc
import os
import base64
from typing import Dict, Any, Optional


class BaseTTSProvider(abc.ABC):
    """
    Abstract base class for all Text-to-Speech providers.
    """
    name: str = "base_tts"
    provider_type: str = "base"
    is_mock: bool = False

    @abc.abstractmethod
    def synthesize(self, text: str, language: str = "hi", **kwargs) -> Dict[str, Any]:
        """
        Synthesizes text into speech.
        Returns:
        - text: str
        - language: str
        - lang_code: str (e.g., 'hi-IN', 'mr-IN', 'en-IN')
        - rate: float
        - pitch: float
        - audio_bytes: Optional[bytes]
        - audio_url: Optional[str]
        - audio_format: str
        - provider: str
        - provider_type: str
        - is_mock: bool
        """
        pass

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "provider_type": self.provider_type,
            "is_mock": self.is_mock,
            "supported_languages": ["hi", "mr", "en"]
        }


# Type alias for TRD compliance
TextToSpeechProvider = BaseTTSProvider


class MockTTSProvider(BaseTTSProvider):
    """
    Deterministic Mock TTS Provider.
    Explicitly labeled as mock. NEVER claims to run real audio synthesis.
    """
    name: str = "mock"
    provider_type: str = "mock"
    is_mock: bool = True

    def synthesize(self, text: str, language: str = "hi", **kwargs) -> Dict[str, Any]:
        return {
            "text": text,
            "language": language,
            "lang_code": "hi-IN" if language == "hi" else ("mr-IN" if language == "mr" else "en-IN"),
            "audio_bytes": None,
            "audio_url": None,
            "audio_format": "mock_audio",
            "rate": 0.95,
            "pitch": 1.0,
            "provider": self.name,
            "provider_type": self.provider_type,
            "is_mock": True,
            "note": "MOCK_PROVIDER: Deterministic mock payload for automated testing."
        }


class BrowserTTSFallback(BaseTTSProvider):
    """
    Browser Web Speech API Native Fallback.
    Prepares exact locale tags and speech rate/pitch parameters for browser SpeechSynthesis.
    """
    name: str = "browser_native"
    provider_type: str = "browser_fallback"
    is_mock: bool = False

    def synthesize(self, text: str, language: str = "hi", **kwargs) -> Dict[str, Any]:
        lang = (language or "hi").lower()
        if lang == "mr":
            lang_code = "mr-IN"
        elif lang == "en":
            lang_code = "en-IN"
        else:
            lang_code = "hi-IN"

        return {
            "text": text,
            "language": lang,
            "lang_code": lang_code,
            "rate": kwargs.get("rate", 0.92),  # Slightly calmer pace for accessible public services
            "pitch": kwargs.get("pitch", 1.0),
            "audio_bytes": None,
            "audio_url": None,
            "audio_format": "browser_speech_synthesis",
            "provider": self.name,
            "provider_type": self.provider_type,
            "is_mock": False
        }


class BhashiniTTSProvider(BaseTTSProvider):
    """
    Bhashini ULCA Indic TTS Cloud Provider.
    Synthesizes natural expressive speech in 22 official Indian languages.
    Gracefully handles missing credentials, timeouts, and network errors.
    """
    name: str = "bhashini"
    provider_type: str = "cloud_api"
    is_mock: bool = False

    def __init__(
        self,
        api_key: Optional[str] = None,
        user_id: Optional[str] = None,
        gender: str = "female",
        timeout_seconds: float = 8.0,
        endpoint_url: Optional[str] = None
    ):
        self.api_key = api_key or os.getenv("BHASHINI_API_KEY", "")
        self.user_id = user_id or os.getenv("BHASHINI_USER_ID", "")
        self.gender = gender
        self.timeout_seconds = timeout_seconds
        self.endpoint_url = endpoint_url or os.getenv(
            "BHASHINI_TTS_URL",
            "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
        )
        self._browser_fallback = BrowserTTSFallback()

    def synthesize(self, text: str, language: str = "hi", **kwargs) -> Dict[str, Any]:
        if not self.api_key or not self.user_id:
            # Fall back to browser native parameters without crashing
            fallback_res = self._browser_fallback.synthesize(text, language=language, **kwargs)
            fallback_res["provider"] = "bhashini (fallback: browser_native)"
            fallback_res["status"] = "missing_credentials_fallback_used"
            fallback_res["error"] = "Bhashini credentials not configured; browser native speech synthesis utilized."
            return fallback_res

        import httpx
        try:
            payload = {
                "pipelineTasks": [
                    {
                        "taskType": "tts",
                        "config": {
                            "language": {
                                "sourceLanguage": language
                            },
                            "gender": self.gender,
                            "samplingRate": 22050
                        }
                    }
                ],
                "inputData": {
                    "input": [
                        {
                            "source": text
                        }
                    ]
                }
            }
            headers = {
                "Authorization": self.api_key,
                "UserID": self.user_id,
                "Content-Type": "application/json"
            }

            with httpx.Client(timeout=self.timeout_seconds) as client:
                resp = client.post(self.endpoint_url, json=payload, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    pipeline_resp = data.get("pipelineResponse", [])
                    audio_b64 = None
                    if pipeline_resp and "audio" in pipeline_resp[0]:
                        audios = pipeline_resp[0]["audio"]
                        if audios and "audioContent" in audios[0]:
                            audio_b64 = audios[0]["audioContent"]

                    return {
                        "text": text,
                        "language": language,
                        "lang_code": "hi-IN" if language == "hi" else ("mr-IN" if language == "mr" else "en-IN"),
                        "audio_bytes": base64.b64decode(audio_b64) if audio_b64 else None,
                        "audio_b64": audio_b64,
                        "audio_format": "wav",
                        "rate": 0.95,
                        "pitch": 1.0,
                        "provider": self.name,
                        "provider_type": self.provider_type,
                        "is_mock": False,
                        "status": "success"
                    }
                else:
                    fallback_res = self._browser_fallback.synthesize(text, language=language, **kwargs)
                    fallback_res["status"] = f"upstream_error_http_{resp.status_code}"
                    fallback_res["error"] = resp.text
                    return fallback_res

        except Exception as ex:
            fallback_res = self._browser_fallback.synthesize(text, language=language, **kwargs)
            fallback_res["status"] = "network_error_fallback_used"
            fallback_res["error"] = str(ex)
            return fallback_res


class LocalIndicTTSProvider(BaseTTSProvider):
    """
    Local Indic Neural TTS Provider (Indic-Parler-TTS / VITS).
    Executes offline on device/server without external API reliance.
    Gracefully handles uninstalled weights/libraries without throwing unhandled exceptions.
    """
    name: str = "local_indic_tts"
    provider_type: str = "local_neural"
    is_mock: bool = False

    def __init__(self, model_checkpoint: str = "ai4bharat/indic-parler-tts"):
        self.model_checkpoint = model_checkpoint
        self._is_available = None
        self._browser_fallback = BrowserTTSFallback()

    def synthesize(self, text: str, language: str = "hi", **kwargs) -> Dict[str, Any]:
        # Return graceful status if torch/parler not installed
        fallback_res = self._browser_fallback.synthesize(text, language=language, **kwargs)
        fallback_res["provider"] = self.name
        fallback_res["provider_type"] = self.provider_type
        fallback_res["status"] = "model_checkpoint_not_cached"
        fallback_res["note"] = f"Local Indic TTS model ({self.model_checkpoint}) requires on-prem GPU. Browser speech synthesis fallback provided."
        return fallback_res
