"""
Unsupported Pattern Tracker for Model Evaluation (Prompt 4, Requirement 10).
Records unsupported dialect markers, unrecognized idioms, and ambiguous transcripts
to data/evaluation/unsupported_patterns.jsonl for evaluation and supervised fine-tuning.
"""

from __future__ import annotations
import os
import json
import time
import uuid
from typing import Dict, Any, List, Optional
from app.core.config import settings

UNSUPPORTED_PATTERNS_FILE = os.path.join(
    settings.BASE_DIR, "data", "evaluation", "unsupported_patterns.jsonl"
)


class UnsupportedPatternTracker:
    """
    Persists unrecognized or ambiguous speech patterns for continuous ASR evaluation.
    """

    def __init__(self, log_path: Optional[str] = None):
        self.log_path = log_path or UNSUPPORTED_PATTERNS_FILE
        os.makedirs(os.path.dirname(self.log_path), exist_ok=True)

    def record_pattern(
        self,
        utterance: str,
        detected_language: str,
        reason: str,
        suspected_dialect: Optional[str] = None,
        confidence: float = 0.0,
        acoustic_snr: Optional[float] = None,
        context_field: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Appends an unsupported speech pattern event to the evaluation ledger.
        """
        record = {
            "pattern_id": str(uuid.uuid4()),
            "timestamp": time.time(),
            "utterance": utterance,
            "detected_language": detected_language,
            "suspected_dialect": suspected_dialect,
            "reason": reason,
            "confidence": confidence,
            "acoustic_snr": acoustic_snr,
            "context_field": context_field,
            "reviewed": False
        }

        with open(self.log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

        return record

    def get_recent_patterns(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves recent recorded patterns for review."""
        if not os.path.isfile(self.log_path):
            return []

        patterns = []
        with open(self.log_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    try:
                        patterns.append(json.loads(line))
                    except Exception:
                        pass
        return patterns[-limit:]


# Global singleton instance
unsupported_pattern_tracker = UnsupportedPatternTracker()
