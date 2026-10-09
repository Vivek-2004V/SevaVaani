"""
LLM Service Adapter for SEVA VAANI.
Provides a pluggable, secure abstraction for LLM-based structured candidate extraction.

Supported Providers:
1. Ollama (Local LLM via native /api/chat with format="json", e.g. qwen3:4b, llama3)
2. OpenAI / Groq / vLLM (Cloud or local OpenAI-compatible endpoints)
3. Mock / Deterministic Rules (Fallback for offline testing and zero-cost operation)

Enforces:
1. LLM outputs structured JSON only for the currently active field.
2. Credentials are read securely from environment variables; never logged or hardcoded.
3. Provider timeouts, malformed responses, or errors gracefully fall back to deterministic extraction.
4. LLM outputs are NEVER automatically marked confirmed; citizen review is mandatory.
"""

from __future__ import annotations
import os
import re
import json
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
import urllib.request
import urllib.error

from app.schemas.llm import LLMExtractionRequest, LLMExtractionResponse

logger = logging.getLogger("seva_vaani.llm")


def _normalize_extracted_value(field_name: str, raw_value: Any) -> Any:
    """Normalizes raw LLM output into expected Indian public form data formats."""
    if raw_value is None:
        return None

    # 1. Mobile number: always 10-digit string
    if field_name == "mobile":
        return str(raw_value).strip()

    # 2. Date of birth: if in ISO YYYY-MM-DD or YYYY/MM/DD, normalize to DD/MM/YYYY
    if field_name == "dob" and isinstance(raw_value, str):
        raw_str = raw_value.strip()
        iso_m = re.match(r"^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$", raw_str)
        if iso_m:
            y, m, d = iso_m.groups()
            return f"{d.zfill(2)}/{m.zfill(2)}/{y}"
        return raw_str

    # 3. Academic year: string digit
    if field_name == "academic_year":
        return str(raw_value).strip()

    return raw_value


class BaseLLMAdapter(ABC):
    """Abstract interface for LLM extraction providers."""

    @abstractmethod
    def extract_field_candidate(
        self,
        request: LLMExtractionRequest
    ) -> LLMExtractionResponse:
        """Extract candidate value for the active form field only."""
        pass

    @abstractmethod
    def generate_confirmation_prompt(
        self,
        field_name: str,
        candidate_value: Any,
        language: str = "hi"
    ) -> str:
        """Generate a polite, localized question asking the citizen to confirm."""
        pass


class MockDeterministicLLMAdapter(BaseLLMAdapter):
    """
    Deterministic Mock LLM Adapter.
    Used for local testing, CI/CD, and offline operation without external API keys.
    Integrates directly with the deterministic Indic NLU extractor.
    """

    def extract_field_candidate(
        self,
        request: LLMExtractionRequest
    ) -> LLMExtractionResponse:
        from app.services.extractor import ExtractorService

        raw_result = ExtractorService.extract_field(
            field_name=request.field_name,
            transcript=request.transcript,
            language=request.language
        )

        return LLMExtractionResponse(
            field=request.field_name,
            value=raw_result.get("value"),
            confidence=raw_result.get("confidence", 0.9),
            confidence_flag="needs_confirmation" if raw_result.get("confidence", 0.0) >= 0.6 else "retry",
            explanation=f"Deterministic extraction for '{request.field_name}' in '{request.language}'",
            raw_transcript=request.transcript
        )

    def generate_confirmation_prompt(
        self,
        field_name: str,
        candidate_value: Any,
        language: str = "hi"
    ) -> str:
        if language == "mr":
            return f"आपले {field_name} '{candidate_value}' आहे. हे बरोबर आहे का?"
        elif language == "en":
            return f"Your {field_name} is '{candidate_value}'. Is this correct?"
        return f"आपका {field_name} '{candidate_value}' है। क्या यह सही है?"


class OllamaLLMAdapter(BaseLLMAdapter):
    """
    Dedicated Local LLM Adapter for Ollama (e.g. qwen3:4b, llama3).
    Communicates with Ollama's native /api/chat with structured JSON mode.
    Requires no cloud API key and preserves citizen privacy completely offline.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        timeout_seconds: float = 5.0
    ):
        self.base_url = (base_url or os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")).rstrip("/")
        self.model = model or os.getenv("OLLAMA_MODEL", "qwen3:4b")
        self.timeout_seconds = float(os.getenv("OLLAMA_TIMEOUT_SEC", str(timeout_seconds)))
        self._fallback = MockDeterministicLLMAdapter()

    def check_server_status(self) -> Dict[str, Any]:
        """Checks if local Ollama daemon is reachable and inspects available models."""
        url = f"{self.base_url}/api/tags"
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=2.0) as response:
                data = json.loads(response.read().decode("utf-8"))
                models = [m.get("name") for m in data.get("models", [])]
                model_present = any(self.model in m for m in models)
                return {
                    "available": True,
                    "models": models,
                    "target_model": self.model,
                    "model_present": model_present
                }
        except Exception as e:
            return {
                "available": False,
                "error": str(e),
                "target_model": self.model,
                "model_present": False
            }

    def extract_field_candidate(
        self,
        request: LLMExtractionRequest
    ) -> LLMExtractionResponse:
        system_prompt = (
            "You are an empathetic, bounded NLU assistant for Indian public services (Scholarship Portal). "
            f"Your single task is to extract the candidate value for ONLY the field '{request.field_name}' "
            f"from the user's spoken utterance in language '{request.language}'.\n"
            "Return JSON matching exactly this schema:\n"
            "{\n"
            f'  "field": "{request.field_name}",\n'
            '  "value": string or number or null,\n'
            '  "confidence": float between 0.0 and 1.0,\n'
            '  "confidence_flag": "needs_confirmation" or "retry",\n'
            '  "explanation": "brief reason"\n'
            "}\n"
            "Rules:\n"
            "1. NEVER extract or guess a different field.\n"
            "2. If the utterance does not contain the requested field, return value null.\n"
            "3. Do not assume confirmation; flag must be 'needs_confirmation'.\n"
            "4. Return valid JSON only. No markdown formatting."
        )

        user_content = f"Active Field: {request.field_name}\nUtterance: {request.transcript}"

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            "format": "json",
            "stream": False,
            "options": {
                "temperature": 0.0
            }
        }

        try:
            req_data = json.dumps(payload).encode("utf-8")
            url = f"{self.base_url}/api/chat"
            http_req = urllib.request.Request(
                url,
                data=req_data,
                headers={"Content-Type": "application/json"}
            )

            with urllib.request.urlopen(http_req, timeout=self.timeout_seconds) as response:
                resp_json = json.loads(response.read().decode("utf-8"))
                content = resp_json.get("message", {}).get("content", "").strip()
                
                # Strip any accidental markdown formatting
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                
                parsed = json.loads(content.strip())

                # Validate bounded field invariant
                if parsed.get("field") != request.field_name:
                    logger.warning("Ollama returned wrong field '%s' instead of '%s'. Falling back.", parsed.get("field"), request.field_name)
                    return self._fallback.extract_field_candidate(request)

                raw_val = _normalize_extracted_value(request.field_name, parsed.get("value"))

                # Fallback to deterministic rules if value is missing or invalid
                if raw_val is None:
                    return self._fallback.extract_field_candidate(request)

                from app.services.validator import FieldValidator
                is_valid, _ = FieldValidator.validate(request.field_name, raw_val, request.language)
                if not is_valid:
                    fb_resp = self._fallback.extract_field_candidate(request)
                    if fb_resp.value is not None:
                        fb_valid, _ = FieldValidator.validate(request.field_name, fb_resp.value, request.language)
                        if fb_valid:
                            logger.info("Ollama extraction failed validation for '%s'. Deterministic fallback succeeded.", request.field_name)
                            return fb_resp

                return LLMExtractionResponse(
                    field=request.field_name,
                    value=raw_val,
                    confidence=float(parsed.get("confidence", 0.9)),
                    confidence_flag="needs_confirmation",
                    explanation=parsed.get("explanation", f"Extracted via Ollama ({self.model})"),
                    raw_transcript=request.transcript
                )

        except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, KeyError, Exception) as e:
            logger.warning("Ollama invocation failed (%s). Falling back safely to deterministic rules.", str(e))
            return self._fallback.extract_field_candidate(request)

    def generate_confirmation_prompt(
        self,
        field_name: str,
        candidate_value: Any,
        language: str = "hi"
    ) -> str:
        return self._fallback.generate_confirmation_prompt(field_name, candidate_value, language)


class OpenAICompatibleLLMAdapter(BaseLLMAdapter):
    """
    Adapter for any OpenAI-compatible LLM endpoint (OpenAI, Groq, vLLM, FastChat).
    Requires API Key or local host endpoint.
    Safely enforces JSON structured output and fallback on failure.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: str = "gpt-3.5-turbo",
        timeout_seconds: float = 4.0
    ):
        self.api_key = api_key or os.getenv("LLM_API_KEY", "")
        self.base_url = (base_url or os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")).rstrip("/")
        self.model = model or os.getenv("LLM_MODEL", "gpt-3.5-turbo")
        self.timeout_seconds = float(os.getenv("LLM_TIMEOUT_SEC", str(timeout_seconds)))
        self._fallback = MockDeterministicLLMAdapter()

    def extract_field_candidate(
        self,
        request: LLMExtractionRequest
    ) -> LLMExtractionResponse:
        # If API key is absent and endpoint is remote, fall back immediately
        if not self.api_key and not ("localhost" in self.base_url or "127.0.0.1" in self.base_url):
            logger.info("LLM API key not configured. Using deterministic fallback.")
            return self._fallback.extract_field_candidate(request)

        # Privacy Firewall: Block transmission of sensitive citizen identity data to remote AI models
        from app.services.privacy_firewall import PrivacyFirewall
        inspection = PrivacyFirewall.inspect_llm_outbound_payload(
            endpoint_url=self.base_url,
            field_name=request.field_name,
            transcript=request.transcript
        )
        if not inspection.allowed:
            logger.warning(
                "Privacy Firewall BLOCKED remote LLM request for field '%s': %s. Safely falling back to local deterministic rules.",
                request.field_name,
                inspection.reason
            )
            return self._fallback.extract_field_candidate(request)

        system_prompt = (
            "You are an empathetic, bounded NLU assistant for Indian public services (Scholarship Portal). "
            f"Your single task is to extract the candidate value for ONLY the field '{request.field_name}' "
            f"from the user's spoken utterance in language '{request.language}'.\n"
            "Return JSON matching exactly this schema:\n"
            "{\n"
            f'  "field": "{request.field_name}",\n'
            '  "value": string or number or null,\n'
            '  "confidence": float between 0.0 and 1.0,\n'
            '  "confidence_flag": "needs_confirmation" or "retry",\n'
            '  "explanation": "brief reason"\n'
            "}\n"
            "Rules:\n"
            "1. NEVER extract or guess a different field.\n"
            "2. If the user utterance does not contain the requested field, return value null.\n"
            "3. Do not assume confirmation; flag must be 'needs_confirmation'.\n"
            "4. Return valid JSON only. No markdown formatting."
        )

        user_content = f"Active Field: {request.field_name}\nUtterance: {request.transcript}"

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            "temperature": 0.0,
            "max_tokens": 150
        }

        try:
            req_data = json.dumps(payload).encode("utf-8")
            url = f"{self.base_url}/chat/completions"
            http_req = urllib.request.Request(
                url,
                data=req_data,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}"
                }
            )

            with urllib.request.urlopen(http_req, timeout=self.timeout_seconds) as response:
                resp_json = json.loads(response.read().decode("utf-8"))
                content = resp_json["choices"][0]["message"]["content"].strip()
                # Clean any markdown code blocks
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                parsed = json.loads(content.strip())

                # Validate bounded field invariant: must match requested active field
                if parsed.get("field") != request.field_name:
                    logger.warning("LLM returned wrong field '%s' instead of '%s'. Falling back.", parsed.get("field"), request.field_name)
                    return self._fallback.extract_field_candidate(request)

                raw_val = _normalize_extracted_value(request.field_name, parsed.get("value"))

                # Fallback to deterministic rules if value is missing or invalid
                if raw_val is None:
                    return self._fallback.extract_field_candidate(request)

                from app.services.validator import FieldValidator
                is_valid, _ = FieldValidator.validate(request.field_name, raw_val, request.language)
                if not is_valid:
                    fb_resp = self._fallback.extract_field_candidate(request)
                    if fb_resp.value is not None:
                        fb_valid, _ = FieldValidator.validate(request.field_name, fb_resp.value, request.language)
                        if fb_valid:
                            logger.info("LLM extraction failed validation for '%s'. Deterministic fallback succeeded.", request.field_name)
                            return fb_resp

                return LLMExtractionResponse(
                    field=request.field_name,
                    value=raw_val,
                    confidence=float(parsed.get("confidence", 0.9)),
                    confidence_flag="needs_confirmation",
                    explanation=parsed.get("explanation", "Extracted via LLM provider"),
                    raw_transcript=request.transcript
                )

        except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, KeyError, Exception) as e:
            logger.warning("LLM API invocation failed (%s). Falling back safely to deterministic rules.", str(e))
            return self._fallback.extract_field_candidate(request)

    def generate_confirmation_prompt(
        self,
        field_name: str,
        candidate_value: Any,
        language: str = "hi"
    ) -> str:
        return self._fallback.generate_confirmation_prompt(field_name, candidate_value, language)


def get_llm_adapter() -> BaseLLMAdapter:
    """Factory method to get the configured LLM adapter."""
    provider = os.getenv("LLM_PROVIDER", "mock").lower()

    if provider == "ollama":
        return OllamaLLMAdapter()
    elif provider in ["openai", "groq", "vllm"]:
        return OpenAICompatibleLLMAdapter()
    
    return MockDeterministicLLMAdapter()
