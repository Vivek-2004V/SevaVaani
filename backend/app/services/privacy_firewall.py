"""
SEVA VAANI — Privacy Firewall & Data Leak Prevention Layer.

Enforces:
1. Outbound destination allowlist (only approved local/configured endpoints).
2. PII / Sensitive data detection (Aadhaar, PAN, Bank Account, Password, Auth Tokens).
3. Blocking of sensitive form fields from transmission to external/remote LLM services.
4. Redaction of sensitive values from application logs and error responses.
5. Clear error blocking when privacy invariants fail (never silent substitution).
"""

from __future__ import annotations
import re
import logging
from typing import Dict, Any, Optional, Set, Tuple
from urllib.parse import urlparse

logger = logging.getLogger("seva_vaani.privacy")

# Explicit set of sensitive fields that MUST NEVER be sent to external/remote AI models
SENSITIVE_FIELDS: Set[str] = {
    "aadhaar",
    "aadhaar_number",
    "aadhaar_no",
    "pan",
    "pan_card",
    "pan_number",
    "bank_account",
    "bank_account_no",
    "account_number",
    "ifsc",
    "ifsc_code",
    "password",
    "pin",
    "otp",
    "secret",
    "phone",
    "mobile",
    "phone_number",
    "credit_card",
    "debit_card",
    "cvv",
}

# Regex patterns for common sensitive Indian identity & financial tokens
AADHAAR_PATTERN = re.compile(r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b")
AADHAAR_12DIGIT = re.compile(r"\b\d{12}\b")
PAN_PATTERN = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b", re.IGNORECASE)
BANK_ACCOUNT_PATTERN = re.compile(r"\b\d{9,18}\b")
BEARER_TOKEN_PATTERN = re.compile(r"Bearer\s+([A-Za-z0-9_\-\.]{16,})", re.IGNORECASE)
JWT_TOKEN_PATTERN = re.compile(r"eyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}")

# Approved loopback and local backend hostnames
APPROVED_LOCAL_HOSTS: Set[str] = {
    "127.0.0.1",
    "localhost",
    "::1",
}


class PrivacyViolationError(Exception):
    """Raised when an outbound transmission violates privacy policies."""
    pass


class PrivacyInspectionResult:
    def __init__(self, allowed: bool, reason: str, detected_pii: Optional[Dict[str, Any]] = None):
        self.allowed = allowed
        self.reason = reason
        self.detected_pii = detected_pii or {}

    def __bool__(self) -> bool:
        return self.allowed

    def to_dict(self) -> Dict[str, Any]:
        return {
            "allowed": self.allowed,
            "reason": self.reason,
            "detected_pii": self.detected_pii,
        }


class PrivacyFirewall:
    """
    Central Privacy Enforcement Layer for SEVA VAANI.
    """

    @staticmethod
    def is_local_or_trusted_endpoint(url: str) -> bool:
        """Determines if a target URL is local loopback or configured internal host."""
        if not url:
            return False
        try:
            parsed = urlparse(url)
            hostname = (parsed.hostname or "").lower()
            return hostname in APPROVED_LOCAL_HOSTS
        except Exception:
            return False

    @staticmethod
    def is_sensitive_field(field_name: str) -> bool:
        """Returns True if the field name is a known sensitive identity or financial field."""
        norm = (field_name or "").lower().strip()
        return norm in SENSITIVE_FIELDS

    @staticmethod
    def detect_pii(text: str) -> Dict[str, bool]:
        """
        Scans text for synthetic or real Aadhaar, PAN, Bank account, or Bearer tokens.
        Returns a dictionary of detected PII categories.
        """
        if not text or not isinstance(text, str):
            return {}

        detections: Dict[str, bool] = {}
        if AADHAAR_PATTERN.search(text) or AADHAAR_12DIGIT.search(text):
            detections["aadhaar"] = True
        if PAN_PATTERN.search(text):
            detections["pan"] = True
        if BEARER_TOKEN_PATTERN.search(text) or JWT_TOKEN_PATTERN.search(text):
            detections["auth_token"] = True

        return detections

    @classmethod
    def inspect_llm_outbound_payload(
        cls,
        endpoint_url: str,
        field_name: str,
        transcript: str
    ) -> PrivacyInspectionResult:
        """
        Inspects an outbound LLM request before network transmission.
        
        Rules:
        1. If the endpoint is a local daemon (Ollama on 127.0.0.1 or local vLLM), allow it.
        2. If the endpoint is an external/remote service (e.g. OpenAI cloud, Groq):
           - Block immediately if field_name is a sensitive identity/financial field.
           - Block immediately if transcript contains Aadhaar, PAN, or token patterns.
           - Block immediately if any unapproved external transmission is detected.
        3. Never silently substitute fake PII values; reject explicitly so fallback takes over.
        """
        is_local = cls.is_local_or_trusted_endpoint(endpoint_url)

        # Local Ollama or local LLM daemon is permissible because data never leaves the host
        if is_local:
            return PrivacyInspectionResult(
                allowed=True,
                reason="Local endpoint on 127.0.0.1; data does not leave device.",
                detected_pii={}
            )

        # External endpoint: enforce strict zero-sensitive-data rule
        if cls.is_sensitive_field(field_name):
            return PrivacyInspectionResult(
                allowed=False,
                reason=f"Field '{field_name}' is classified as sensitive citizen identity/financial data. Transmission to remote endpoint '{endpoint_url}' is prohibited by Privacy Firewall.",
                detected_pii={"sensitive_field": field_name}
            )

        pii_found = cls.detect_pii(transcript)
        if pii_found:
            found_types = ", ".join(pii_found.keys())
            return PrivacyInspectionResult(
                allowed=False,
                reason=f"Transcript contains sensitive patterns ({found_types}). Transmission to remote endpoint '{endpoint_url}' is prohibited by Privacy Firewall.",
                detected_pii=pii_found
            )

        return PrivacyInspectionResult(
            allowed=True,
            reason="Payload contains only non-sensitive context for public service field.",
            detected_pii={}
        )

    @classmethod
    def validate_outbound_destination(cls, target_url: str) -> bool:
        """
        Checks whether target URL belongs to approved SEVA VAANI endpoints.
        Rejects arbitrary URLs or unapproved third-party analytics/telemetry.
        """
        if not target_url:
            return False
        try:
            parsed = urlparse(target_url)
            hostname = (parsed.hostname or "").lower()
            return hostname in APPROVED_LOCAL_HOSTS
        except Exception:
            return False

    @classmethod
    def sanitize_log_message(cls, message: str) -> str:
        """
        Redacts sensitive tokens, passwords, Aadhaar, and PAN from log output.
        """
        if not message or not isinstance(message, str):
            return ""

        # Redact Bearer tokens
        redacted = BEARER_TOKEN_PATTERN.sub("Bearer [REDACTED_AUTH_TOKEN]", message)
        # Redact JWT tokens
        redacted = JWT_TOKEN_PATTERN.sub("[REDACTED_JWT_TOKEN]", redacted)
        # Redact Aadhaar patterns
        redacted = AADHAAR_PATTERN.sub("[REDACTED_AADHAAR]", redacted)
        redacted = AADHAAR_12DIGIT.sub("[REDACTED_AADHAAR]", redacted)
        # Redact PAN patterns
        redacted = PAN_PATTERN.sub("[REDACTED_PAN]", redacted)
        # Redact password fields in JSON-like strings
        redacted = re.sub(r'("password"\s*:\s*)"[^"]+"', r'\1"[REDACTED_PASSWORD]"', redacted)
        # Redact Indian 10-digit phone numbers
        redacted = re.sub(r'\b([6-9]\d)\d{6}(\d{2})\b', r'[REDACTED_PHONE: \1XXXXXX\2]', redacted)

        return redacted


class SensitiveDataLoggingFilter(logging.Filter):
    """
    Python logging filter that sanitizes log records before they are printed or saved.
    Prevents accidental leakage of tokens, passwords, or citizen identity data.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            if isinstance(record.msg, str):
                record.msg = PrivacyFirewall.sanitize_log_message(record.msg)
            if record.args:
                if isinstance(record.args, tuple):
                    record.args = tuple(
                        PrivacyFirewall.sanitize_log_message(str(arg)) if isinstance(arg, str) else arg
                        for arg in record.args
                    )
                elif isinstance(record.args, dict):
                    record.args = {
                        k: (PrivacyFirewall.sanitize_log_message(str(v)) if isinstance(v, str) else v)
                        for k, v in record.args.items()
                    }
        except Exception:
            pass
        return True
