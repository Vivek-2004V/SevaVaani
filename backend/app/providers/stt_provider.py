"""
Modular Speech-To-Text (STT) Provider Architecture for SEVA VAANI.
Supports replaceable model providers:
- MockSTTProvider (Clearly labeled mock for deterministic testing/CI)
- BrowserSTTFallback (Web Speech API bridge)
- BhashiniSTTProvider (Government of India ULCA ASR pipeline)
- LocalWhisperSTTProvider (CTranslate2 / faster-whisper local neural inference)
- CustomHttpSTTProvider (Generic REST ASR endpoint)
"""

from __future__ import annotations
import abc
import os
import time
import base64
from typing import Dict, Any, Optional, List


class BaseSTTProvider(abc.ABC):
    """
    Abstract base class for all Speech-to-Text providers.
    Ensures modularity and hot-swappability across speech models.
    """
    name: str = "base_stt"
    provider_type: str = "base"  # 'mock', 'browser_fallback', 'cloud_api', 'local_neural'
    is_mock: bool = False

    @abc.abstractmethod
    def transcribe(self, audio_bytes: bytes, language: str = "hi", **kwargs) -> Dict[str, Any]:
        """
        Transcribes audio bytes to text.
        Must return a dictionary containing:
        - transcript: str
        - confidence: float (0.0 to 1.0)
        - provider: str
        - provider_type: str
        - language: str
        - is_mock: bool
        """
        pass

    def get_metadata(self) -> Dict[str, Any]:
        """Returns provider metadata without exposing sensitive credentials."""
        return {
            "name": self.name,
            "provider_type": self.provider_type,
            "is_mock": self.is_mock,
            "supported_languages": ["hi", "mr", "en"]
        }


# Type alias for TRD compliance
SpeechToTextProvider = BaseSTTProvider


class MockSTTProvider(BaseSTTProvider):
    """
    Deterministic Mock STT Provider.
    Explicitly labeled as mock. NEVER claims to run real speech recognition.
    """
    name: str = "mock"
    provider_type: str = "mock"
    is_mock: bool = True

    def __init__(self, predefined_transcript: str = "Ramesh Kumar", confidence: float = 0.95):
        self.predefined_transcript = predefined_transcript
        self.confidence = confidence

    def transcribe(self, audio_bytes: bytes, language: str = "hi", **kwargs) -> Dict[str, Any]:
        # Allow callers to override return transcript via kwargs
        transcript = kwargs.get("mock_transcript", self.predefined_transcript)
        initial_prompt = kwargs.get("initial_prompt")
        hotwords = kwargs.get("hotwords", [])
        return {
            "transcript": transcript,
            "confidence": self.confidence,
            "provider": self.name,
            "provider_type": self.provider_type,
            "language": language,
            "is_mock": True,
            "audio_size_bytes": len(audio_bytes) if audio_bytes else 0,
            "contextual_vocabulary_applied": bool(initial_prompt or hotwords),
            "initial_prompt": initial_prompt,
            "hotwords": hotwords,
            "note": "MOCK_PROVIDER: Deterministic test output. Not real speech recognition."
        }


class BrowserSTTFallback(BaseSTTProvider):
    """
    Browser Native Web Speech API Fallback.
    Used when client-side Web Speech API transcribes directly in browser.
    """
    name: str = "browser_native"
    provider_type: str = "browser_fallback"
    is_mock: bool = False

    def transcribe(self, audio_bytes: bytes, language: str = "hi", **kwargs) -> Dict[str, Any]:
        client_transcript = kwargs.get("client_transcript", "")
        return {
            "transcript": client_transcript,
            "confidence": 0.85 if client_transcript else 0.0,
            "provider": self.name,
            "provider_type": self.provider_type,
            "language": language,
            "is_mock": False,
            "note": "Client-side Web Speech API execution."
        }


class BhashiniSTTProvider(BaseSTTProvider):
    """
    Bhashini ULCA ASR Provider (Government of India Indic ASR).
    Securely routes requests using server-side credentials.
    Gracefully handles missing credentials, timeouts, and network failures.
    """
    name: str = "bhashini"
    provider_type: str = "cloud_api"
    is_mock: bool = False

    def __init__(
        self,
        api_key: Optional[str] = None,
        user_id: Optional[str] = None,
        timeout_seconds: float = 8.0,
        endpoint_url: Optional[str] = None
    ):
        self.api_key = api_key or os.getenv("BHASHINI_API_KEY", "")
        self.user_id = user_id or os.getenv("BHASHINI_USER_ID", "")
        self.timeout_seconds = timeout_seconds
        self.endpoint_url = endpoint_url or os.getenv(
            "BHASHINI_ASR_URL",
            "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
        )

    def transcribe(self, audio_bytes: bytes, language: str = "hi", **kwargs) -> Dict[str, Any]:
        # Validate credentials before initiating network call
        if not self.api_key or not self.user_id:
            return {
                "transcript": "",
                "confidence": 0.0,
                "provider": self.name,
                "provider_type": self.provider_type,
                "language": language,
                "is_mock": False,
                "status": "missing_credentials",
                "error": "Bhashini credentials (BHASHINI_API_KEY / BHASHINI_USER_ID) are not configured."
            }

        if not audio_bytes:
            return {
                "transcript": "",
                "confidence": 0.0,
                "provider": self.name,
                "provider_type": self.provider_type,
                "language": language,
                "is_mock": False,
                "status": "empty_audio",
                "error": "Audio payload is empty."
            }

        # Safe network call with timeout and error handling
        import httpx
        try:
            b64_audio = base64.b64encode(audio_bytes).decode("utf-8")
            payload = {
                "pipelineTasks": [
                    {
                        "taskType": "asr",
                        "config": {
                            "language": {
                                "sourceLanguage": language
                            },
                            "audioFormat": "wav",
                            "samplingRate": 16000
                        }
                    }
                ],
                "inputData": {
                    "audio": [
                        {
                            "audioContent": b64_audio
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
                    # Parse standard ULCA response
                    pipeline_resp = data.get("pipelineResponse", [])
                    transcript = ""
                    if pipeline_resp and "output" in pipeline_resp[0]:
                        outputs = pipeline_resp[0]["output"]
                        if outputs and "source" in outputs[0]:
                            transcript = outputs[0]["source"]

                    return {
                        "transcript": transcript,
                        "confidence": 0.90 if transcript else 0.0,
                        "provider": self.name,
                        "provider_type": self.provider_type,
                        "language": language,
                        "is_mock": False,
                        "status": "success"
                    }
                else:
                    return {
                        "transcript": "",
                        "confidence": 0.0,
                        "provider": self.name,
                        "provider_type": self.provider_type,
                        "language": language,
                        "is_mock": False,
                        "status": "upstream_error",
                        "error": f"Bhashini API error HTTP {resp.status_code}"
                    }

        except httpx.TimeoutException:
            return {
                "transcript": "",
                "confidence": 0.0,
                "provider": self.name,
                "provider_type": self.provider_type,
                "language": language,
                "is_mock": False,
                "status": "timeout",
                "error": f"Bhashini ASR request timed out after {self.timeout_seconds}s"
            }
        except Exception as ex:
            return {
                "transcript": "",
                "confidence": 0.0,
                "provider": self.name,
                "provider_type": self.provider_type,
                "language": language,
                "is_mock": False,
                "status": "error",
                "error": f"Bhashini connection error: {str(ex)}"
            }


class LocalWhisperSTTProvider(BaseSTTProvider):
    """
    Local Neural STT Provider (faster-whisper / CTranslate2 INT8).
    Runs offline on-premise without sending audio to third-party clouds.
    Checks library availability gracefully without crashing if uninstalled.
    """
    name: str = "faster_whisper"
    provider_type: str = "local_neural"
    is_mock: bool = False

    def __init__(self, model_size: str = "small", device: str = "cpu", compute_type: str = "int8"):
        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type
        self._model = None
        self._is_available = None

    def _check_available(self) -> bool:
        if self._is_available is None:
            try:
                import faster_whisper  # noqa
                self._is_available = True
            except ImportError:
                self._is_available = False
        return self._is_available

    def transcribe(self, audio_bytes: bytes, language: str = "hi", **kwargs) -> Dict[str, Any]:
        if not self._check_available():
            return {
                "transcript": "",
                "confidence": 0.0,
                "provider": self.name,
                "provider_type": self.provider_type,
                "language": language,
                "is_mock": False,
                "status": "uninstalled",
                "error": "faster-whisper is not installed. To run local neural speech recognition, install faster-whisper."
            }

        # If installed, run local inference via memory buffer
        import io
        from faster_whisper import WhisperModel
        try:
            if self._model is None:
                self._model = WhisperModel(self.model_size, device=self.device, compute_type=self.compute_type)

            audio_file = io.BytesIO(audio_bytes)
            initial_prompt = kwargs.get("initial_prompt")
            segments, info = self._model.transcribe(
                audio_file,
                language=language,
                beam_size=5,
                initial_prompt=initial_prompt
            )
            full_text = " ".join([seg.text.strip() for seg in segments]).strip()

            return {
                "transcript": full_text,
                "confidence": min(1.0, max(0.0, info.language_probability if hasattr(info, 'language_probability') else 0.85)),
                "provider": self.name,
                "provider_type": self.provider_type,
                "language": language,
                "is_mock": False,
                "contextual_vocabulary_applied": bool(initial_prompt),
                "duration_sec": info.duration if hasattr(info, 'duration') else None,
                "status": "success"
            }
        except Exception as ex:
            return {
                "transcript": "",
                "confidence": 0.0,
                "provider": self.name,
                "provider_type": self.provider_type,
                "language": language,
                "is_mock": False,
                "status": "error",
                "error": f"Local whisper inference failed: {str(ex)}"
            }


class CustomHttpSTTProvider(BaseSTTProvider):
    """
    Generic HTTP STT Provider for external microservices (e.g., self-hosted IndicConformer).
    """
    name: str = "custom_http"
    provider_type: str = "cloud_api"
    is_mock: bool = False

    def __init__(self, endpoint_url: str, auth_token: Optional[str] = None, timeout_seconds: float = 10.0):
        self.endpoint_url = endpoint_url
        self.auth_token = auth_token
        self.timeout_seconds = timeout_seconds

    def transcribe(self, audio_bytes: bytes, language: str = "hi", **kwargs) -> Dict[str, Any]:
        import httpx
        if not self.endpoint_url:
            return {
                "transcript": "",
                "confidence": 0.0,
                "provider": self.name,
                "provider_type": self.provider_type,
                "language": language,
                "is_mock": False,
                "status": "missing_endpoint",
                "error": "Custom STT endpoint_url is not configured."
            }

        headers = {}
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"

        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                files = {"audio": ("audio.wav", audio_bytes, "audio/wav")}
                data = {"language": language}
                resp = client.post(self.endpoint_url, files=files, data=data, headers=headers)
                if resp.status_code == 200:
                    payload = resp.json()
                    return {
                        "transcript": payload.get("transcript", ""),
                        "confidence": float(payload.get("confidence", 0.85)),
                        "provider": self.name,
                        "provider_type": self.provider_type,
                        "language": language,
                        "is_mock": False,
                        "status": "success"
                    }
                return {
                    "transcript": "",
                    "confidence": 0.0,
                    "provider": self.name,
                    "provider_type": self.provider_type,
                    "language": language,
                    "is_mock": False,
                    "status": "upstream_error",
                    "error": f"HTTP {resp.status_code}: {resp.text}"
                }
        except Exception as ex:
            return {
                "transcript": "",
                "confidence": 0.0,
                "provider": self.name,
                "provider_type": self.provider_type,
                "language": language,
                "is_mock": False,
                "status": "error",
                "error": str(ex)
            }
