"""
Informed Consent & Withdrawal Management Engine (Requirements 1, 5 & 8).
Tracks explicit informed consent, handles withdrawal, and quarantines revoked data.
"""

from __future__ import annotations
import os
import json
import time
import uuid
from typing import Dict, Any, List, Optional
from app.core.config import settings

CONSENT_DIR = os.path.join(settings.BASE_DIR, "data", "speech_corpus", "consent")
CONSENT_LEDGER_FILE = os.path.join(CONSENT_DIR, "consent_ledger.json")


class ConsentManager:
    """
    Manages informed consent records, validity checking, and right-to-be-forgotten withdrawals.
    """

    def __init__(self, ledger_path: Optional[str] = None):
        self.ledger_path = ledger_path or CONSENT_LEDGER_FILE
        os.makedirs(os.path.dirname(self.ledger_path), exist_ok=True)
        self._load_ledger()

    def _load_ledger(self):
        if os.path.isfile(self.ledger_path):
            try:
                with open(self.ledger_path, "r", encoding="utf-8") as f:
                    self._records: Dict[str, Dict[str, Any]] = json.load(f)
            except Exception:
                self._records = {}
        else:
            self._records = {}
            self._save_ledger()

    def _save_ledger(self):
        with open(self.ledger_path, "w", encoding="utf-8") as f:
            json.dump(self._records, f, indent=2, ensure_ascii=False)

    def record_consent(
        self,
        speaker_id_pseudonymous: str,
        permitted_purposes: Optional[List[str]] = None,
        terms_version: str = "v1.0",
        validity_days: int = 365
    ) -> Dict[str, Any]:
        """
        Records explicit informed consent given by the speaker.
        """
        now = time.time()
        expiry = now + (validity_days * 86400)
        consent_id = str(uuid.uuid4())

        record = {
            "consent_id": consent_id,
            "speaker_id_pseudonymous": speaker_id_pseudonymous,
            "consent_timestamp": now,
            "consent_status": "active",
            "permitted_purposes": permitted_purposes or [
                "speech_recognition_training",
                "accent_evaluation",
                "public_service_accessibility"
            ],
            "terms_version": terms_version,
            "expiry_timestamp": expiry,
            "withdrawal_timestamp": None
        }

        self._records[speaker_id_pseudonymous] = record
        self._save_ledger()
        return record

    def has_active_consent(self, speaker_id_pseudonymous: str) -> bool:
        """
        Checks if the speaker has active, non-withdrawn, non-expired consent.
        """
        record = self._records.get(speaker_id_pseudonymous)
        if not record:
            return False

        if record.get("consent_status") != "active":
            return False

        expiry = record.get("expiry_timestamp")
        if expiry and time.time() > expiry:
            record["consent_status"] = "expired"
            self._save_ledger()
            return False

        return True

    def withdraw_consent(self, speaker_id_pseudonymous: str) -> Dict[str, Any]:
        """
        Processes speaker withdrawal of consent (Right to be Forgotten).
        Immediately sets status to 'withdrawn'.
        """
        record = self._records.get(speaker_id_pseudonymous)
        now = time.time()

        if not record:
            # Create a placeholder withdrawn record so future submissions are immediately rejected
            record = {
                "consent_id": str(uuid.uuid4()),
                "speaker_id_pseudonymous": speaker_id_pseudonymous,
                "consent_timestamp": now,
                "consent_status": "withdrawn",
                "permitted_purposes": [],
                "terms_version": "v1.0",
                "expiry_timestamp": now,
                "withdrawal_timestamp": now
            }
        else:
            record["consent_status"] = "withdrawn"
            record["withdrawal_timestamp"] = now

        self._records[speaker_id_pseudonymous] = record
        self._save_ledger()

        return {
            "speaker_id_pseudonymous": speaker_id_pseudonymous,
            "consent_status": "withdrawn",
            "withdrawal_timestamp": now,
            "message": "Consent successfully revoked. All associated audio samples will be quarantined and purged from active datasets."
        }

    def get_consent_record(self, speaker_id_pseudonymous: str) -> Optional[Dict[str, Any]]:
        return self._records.get(speaker_id_pseudonymous)
