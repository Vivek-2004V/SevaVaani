"""
Pseudonymization & Identity Decoupling Engine (Requirements 2, 4 & 6).
Generates deterministic, non-reversible pseudonymous speaker IDs using salted HMAC-SHA256.
Maintains strict separation between speaker identities and training dataset manifests.
Strictly prohibits inference or recording of sensitive attributes (caste, religion, ethnicity).
"""

from __future__ import annotations
import hmac
import hashlib
import os
from typing import Dict, Any, Optional

SALT_ENV_VAR = "SEVA_DATASET_PSEUDONYMIZATION_SALT"
DEFAULT_SALT = "seva-vaani-indic-corpus-salt-v1-secure"


class SpeakerPseudonymizer:
    """
    Decouples real citizen/speaker identity from speech training datasets.
    """

    PROHIBITED_SENSITIVE_KEYS = {
        "caste", "religion", "ethnicity", "creed", "tribe",
        "community", "race", "political_affiliation", "aadhaar",
        "pan_card", "ration_card", "bank_account"
    }

    def __init__(self, salt: Optional[str] = None):
        self.salt = (salt or os.getenv(SALT_ENV_VAR, DEFAULT_SALT)).encode("utf-8")

    def generate_pseudonymous_id(self, speaker_token: str) -> str:
        """
        Derives irreversible pseudonymous speaker ID from a speaker token or identifier.
        Output format: spk_<16_hex_chars>
        """
        if not speaker_token:
            raise ValueError("Speaker token cannot be empty for pseudonymization")

        digest = hmac.new(self.salt, speaker_token.strip().encode("utf-8"), hashlib.sha256).hexdigest()
        return f"spk_{digest[:16]}"

    @classmethod
    def sanitize_metadata(cls, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Strictly sanitizes metadata dictionary.
        Requirement 6: Do not infer or store caste, religion, ethnicity, or other sensitive attributes.
        """
        sanitized = {}
        for key, value in metadata.items():
            lower_k = key.lower().strip()
            if any(prohibited in lower_k for prohibited in cls.PROHIBITED_SENSITIVE_KEYS):
                # Omit sensitive attribute entirely
                continue
            sanitized[key] = value
        return sanitized
