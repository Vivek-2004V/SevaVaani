"""
Language Identification (LID) Adapter for Indic Languages.
Detects language from script Unicode ranges and lexical markers.
Requires explicit user confirmation when detection confidence is low (< 0.70).
"""

from __future__ import annotations
import re
from typing import Dict, Any, Optional

class IndicLanguageDetector:
    """
    Deterministic rule-and-script augmented Language Identifier.
    """

    SCRIPT_PATTERNS = {
        "ta": r"[\u0b80-\u0bff]",  # Tamil
        "te": r"[\u0c00-\u0c7f]",  # Telugu
        "bn": r"[\u0980-\u09ff]",  # Bengali / Assamese
        "gu": r"[\u0a80-\u0aff]",  # Gujarati
        "kn": r"[\u0c80-\u0cff]",  # Kannada
        "ml": r"[\u0d00-\u0d7f]",  # Malayalam
        "pa": r"[\u0a00-\u0a7f]",  # Gurmukhi / Punjabi
        "or": r"[\u0b00-\u0b7f]",  # Odia
        "ur": r"[\u0600-\u06ff]",  # Urdu / Perso-Arabic
        "devanagari": r"[\u0900-\u097f]"  # Hindi / Marathi / Sanskrit / Nepali / Bodo
    }

    MARATHI_MARKERS = [
        "नाव", "माझे", "माझं", "आहे", "होय", "नाही", "जिल्हा", "महाविद्यालय",
        "अभ्यासक्रम", "वर्ष", "उत्पन्न", "प्रवर्ग", "कागदपत्रे", "करायचे", "पाहिजे"
    ]

    HINDI_MARKERS = [
        "नाम", "मेरा", "मेरी", "है", "हाँ", "नहीं", "जिला", "कॉलेज",
        "कोर्स", "साल", "आय", "श्रेणी", "दस्तावेज", "करना", "चाहिए"
    ]

    @classmethod
    def detect_language(cls, text: str) -> Dict[str, Any]:
        text = (text or "").strip()
        if not text:
            return {
                "detected_language": "hi",
                "confidence": 0.0,
                "needs_confirmation": True,
                "reason": "Empty utterance"
            }

        # Check distinct Indic scripts first
        for lang_code, pattern in cls.SCRIPT_PATTERNS.items():
            if lang_code == "devanagari":
                continue
            matches = re.findall(pattern, text)
            if len(matches) >= 2:
                confidence = min(0.95, 0.70 + (len(matches) / len(text)) * 0.3)
                return {
                    "detected_language": lang_code,
                    "confidence": confidence,
                    "needs_confirmation": confidence < 0.75,
                    "reason": f"Matched {lang_code.upper()} script"
                }

        # Check Devanagari script (Disambiguate Hindi vs Marathi)
        dev_matches = re.findall(cls.SCRIPT_PATTERNS["devanagari"], text)
        if len(dev_matches) >= 2:
            norm = text.lower()
            mr_hits = sum(1 for m in cls.MARATHI_MARKERS if m in norm)
            hi_hits = sum(1 for m in cls.HINDI_MARKERS if m in norm)

            if mr_hits > hi_hits:
                return {
                    "detected_language": "mr",
                    "confidence": 0.92,
                    "needs_confirmation": False,
                    "reason": "Devanagari with Marathi lexical markers"
                }
            elif hi_hits > mr_hits:
                return {
                    "detected_language": "hi",
                    "confidence": 0.92,
                    "needs_confirmation": False,
                    "reason": "Devanagari with Hindi lexical markers"
                }
            else:
                # Ambiguous Devanagari (e.g. single name or number)
                return {
                    "detected_language": "hi",
                    "confidence": 0.65,
                    "needs_confirmation": True,
                    "reason": "Ambiguous Devanagari; default to Hindi with confirmation"
                }

        # Check Latin script (English or Hinglish)
        if re.search(r"[a-zA-Z]", text):
            # Check Romanized Marathi cues
            norm_lat = text.lower()
            if any(w in norm_lat for w in ["majhe", "nav", "aahe", "ahe", "hoy", "shiktoy"]):
                return {"detected_language": "mr", "confidence": 0.82, "needs_confirmation": False, "reason": "Romanized Marathi"}
            elif any(w in norm_lat for w in ["mera", "naam", "hai", "karna", "padhta"]):
                return {"detected_language": "hi", "confidence": 0.85, "needs_confirmation": False, "reason": "Romanized Hindi (Hinglish)"}
            return {
                "detected_language": "en",
                "confidence": 0.88,
                "needs_confirmation": False,
                "reason": "Latin script standard English"
            }

        return {
            "detected_language": "hi",
            "confidence": 0.50,
            "needs_confirmation": True,
            "reason": "Unrecognized script; fallback with confirmation"
        }
