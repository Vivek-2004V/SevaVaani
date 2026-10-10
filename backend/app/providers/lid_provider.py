"""
Modular Language Identification (LID) Provider Architecture for SEVA VAANI.
Detects language, script, code-switching, and flags unsupported languages with clarification requests.
"""

from __future__ import annotations
import abc
import os
import re
from typing import Dict, Any, Optional, List


class BaseLIDProvider(abc.ABC):
    """
    Abstract base class for all Language Identification providers.
    """
    name: str = "base_lid"
    provider_type: str = "base"
    is_mock: bool = False

    @abc.abstractmethod
    def identify(self, text: str, audio_bytes: Optional[bytes] = None) -> Dict[str, Any]:
        """
        Identifies the language of the given utterance (text or audio).
        Returns:
        - detected_language: str (e.g., 'hi', 'mr', 'en', 'hi-en', 'unsupported')
        - language_name: str
        - confidence: float
        - is_supported: bool
        - is_code_switched: bool
        - clarification_needed: bool
        - clarification_prompt: Optional[str]
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
            "supported_languages": ["hi", "mr", "en", "hi-en"]
        }


# Type alias for TRD compliance
LanguageIdentificationProvider = BaseLIDProvider


class MockLIDProvider(BaseLIDProvider):
    """
    Mock LID Provider for testing.
    Clearly labeled as mock.
    """
    name: str = "mock"
    provider_type: str = "mock"
    is_mock: bool = True

    def __init__(self, predefined_language: str = "hi", confidence: float = 0.95):
        self.predefined_language = predefined_language
        self.confidence = confidence

    def identify(self, text: str, audio_bytes: Optional[bytes] = None) -> Dict[str, Any]:
        return {
            "detected_language": self.predefined_language,
            "language_name": "Hindi" if self.predefined_language == "hi" else self.predefined_language.upper(),
            "confidence": self.confidence,
            "is_supported": self.predefined_language in ["hi", "mr", "en", "hi-en"],
            "is_code_switched": self.predefined_language == "hi-en",
            "clarification_needed": False,
            "clarification_prompt": None,
            "provider": self.name,
            "provider_type": self.provider_type,
            "is_mock": True
        }


class ScriptAndLexicalLIDProvider(BaseLIDProvider):
    """
    High-accuracy rule, unicode-script, and lexical marker LID engine.
    Specialized for Indic script classification, Hindi/Marathi Devanagari disambiguation,
    and Hinglish code-switching detection.
    """
    name: str = "script_and_lexical"
    provider_type: str = "deterministic_rule"
    is_mock: bool = False

    SUPPORTED_LANGUAGES = {"hi", "mr", "en", "hi-en"}

    # Unicode script ranges for Indian scripts
    SCRIPT_PATTERNS = {
        "ta": (r"[\u0b80-\u0bff]", "Tamil"),
        "te": (r"[\u0c00-\u0c7f]", "Telugu"),
        "bn": (r"[\u0980-\u09ff]", "Bengali"),
        "gu": (r"[\u0a80-\u0aff]", "Gujarati"),
        "kn": (r"[\u0c80-\u0cff]", "Kannada"),
        "ml": (r"[\u0d00-\u0d7f]", "Malayalam"),
        "pa": (r"[\u0a00-\u0a7f]", "Punjabi"),
        "or": (r"[\u0b00-\u0b7f]", "Odia"),
        "ur": (r"[\u0600-\u06ff]", "Urdu"),
        "devanagari": (r"[\u0900-\u097f]", "Devanagari (Hindi/Marathi)")
    }

    # Common foreign non-Indic script patterns
    FOREIGN_PATTERNS = {
        "zh": (r"[\u4e00-\u9fff]", "Chinese"),
        "ar": (r"[\u0600-\u06ff]", "Arabic"),
        "ru": (r"[\u0400-\u04ff]", "Russian"),
        "ja": (r"[\u3040-\u309f\u30a0-\u30ff]", "Japanese")
    }

    MARATHI_MARKERS = [
        "नाव", "माझे", "माझं", "आहे", "आहोत", "होय", "नाही", "जिल्हा", "महाविद्यालय",
        "अभ्यासक्रम", "वर्ष", "उत्पन्न", "प्रवर्ग", "कागदपत्रे", "करायचे", "पाहिजे",
        "करा", "सांगा", "सांगतो", "माहिती", "अर्ज", "पत्ता", "कोणता", "कसे"
    ]

    HINDI_MARKERS = [
        "नाम", "मेरा", "मेरी", "मेरे", "है", "हैं", "हाँ", "नहीं", "जिला", "कॉलेज",
        "कोर्स", "साल", "आय", "श्रेणी", "दस्तावेज", "करना", "चाहिए", "बताओ", "बताइए",
        "जानकारी", "आवेदन", "पता", "कौनसा", "कैसे"
    ]

    ROMANIZED_HINDI_WORDS = {
        "mera", "meri", "mere", "naam", "hai", "hain", "karna", "padhta", "chahiye",
        "kya", "batao", "batayein", "aavedan", "yojana", "paisa", "rupaye", "lakh", "hazar"
    }

    ROMANIZED_MARATHI_WORDS = {
        "majhe", "majha", "nav", "aahe", "ahe", "hoy", "shiktoy", "kasa", "pahije",
        "sang", "sanga", "jilha", "utpanna", "mahiti", "kardayche"
    }

    def identify(self, text: str, audio_bytes: Optional[bytes] = None) -> Dict[str, Any]:
        raw_text = (text or "").strip()
        if not raw_text:
            return {
                "detected_language": "hi",
                "language_name": "Hindi",
                "confidence": 0.0,
                "is_supported": True,
                "is_code_switched": False,
                "clarification_needed": True,
                "clarification_prompt": "कृपया कुछ बोलें या लिखें। सेवा वाणी हिंदी, मराठी और अंग्रेज़ी में उपलब्ध है।",
                "provider": self.name,
                "provider_type": self.provider_type,
                "is_mock": False,
                "reason": "Empty utterance"
            }

        # 1. Check for foreign scripts
        for lang_code, (pat, name) in self.FOREIGN_PATTERNS.items():
            matches = re.findall(pat, raw_text)
            if len(matches) >= 2:
                return {
                    "detected_language": lang_code,
                    "language_name": name,
                    "confidence": 0.95,
                    "is_supported": False,
                    "is_code_switched": False,
                    "clarification_needed": True,
                    "clarification_prompt": f"हमने पहचाना कि आप {name} भाषा में बोल रहे हैं। सेवा वाणी वर्तमान में केवल हिंदी, मराठी और अंग्रेज़ी में उपलब्ध है। कृपया इनमें से किसी भाषा में बात करें।",
                    "provider": self.name,
                    "provider_type": self.provider_type,
                    "is_mock": False,
                    "reason": f"Detected foreign script: {name}"
                }

        # 2. Check for other Indic scripts (Tamil, Telugu, Bengali, etc.)
        for lang_code, (pat, name) in self.SCRIPT_PATTERNS.items():
            if lang_code == "devanagari":
                continue
            matches = re.findall(pat, raw_text)
            if len(matches) >= 2:
                # Script is an Indic language not yet enabled in the default service config
                return {
                    "detected_language": lang_code,
                    "language_name": name,
                    "confidence": min(0.96, 0.70 + (len(matches) / len(raw_text)) * 0.3),
                    "is_supported": False,
                    "is_code_switched": False,
                    "clarification_needed": True,
                    "clarification_prompt": f"आपकी भाषा {name} पहचानी गई है। सेवा वाणी वर्तमान में मुख्य रूप से हिंदी, मराठी और अंग्रेज़ी में सहायता प्रदान करती है। क्या आप हिंदी या अंग्रेज़ी में जारी रखना चाहेंगे?",
                    "provider": self.name,
                    "provider_type": self.provider_type,
                    "is_mock": False,
                    "reason": f"Detected Indic script: {name}"
                }

        # 3. Check Devanagari script (Disambiguate Hindi vs Marathi)
        dev_matches = re.findall(self.SCRIPT_PATTERNS["devanagari"][0], raw_text)
        latin_matches = re.findall(r"[a-zA-Z]", raw_text)

        # Detect Code-switching between Devanagari and Latin (Devanagari + English words)
        has_devanagari = len(dev_matches) >= 2
        has_latin = len(latin_matches) >= 3

        if has_devanagari and has_latin:
            # Code-switched utterance (e.g., "मेरा name रमेश है and income 2 lakh hai")
            norm = raw_text.lower()
            mr_hits = sum(1 for m in self.MARATHI_MARKERS if m in norm)
            hi_hits = sum(1 for m in self.HINDI_MARKERS if m in norm)
            lang = "mr-en" if mr_hits > hi_hits else "hi-en"
            lang_name = "Marathi-English (Mixed)" if lang == "mr-en" else "Hinglish (Hindi-English)"

            return {
                "detected_language": lang,
                "language_name": lang_name,
                "confidence": 0.90,
                "is_supported": True,
                "is_code_switched": True,
                "clarification_needed": False,
                "clarification_prompt": None,
                "provider": self.name,
                "provider_type": self.provider_type,
                "is_mock": False,
                "reason": "Mixed Devanagari and Latin script (Code-switching)"
            }

        if has_devanagari:
            norm = raw_text.lower()
            mr_hits = sum(1 for m in self.MARATHI_MARKERS if m in norm)
            hi_hits = sum(1 for m in self.HINDI_MARKERS if m in norm)

            # Check for Marathi-specific characters: ळ (\u0933)
            if "\u0933" in raw_text or mr_hits > hi_hits:
                return {
                    "detected_language": "mr",
                    "language_name": "Marathi",
                    "confidence": 0.94 if (mr_hits > 0 or "\u0933" in raw_text) else 0.85,
                    "is_supported": True,
                    "is_code_switched": False,
                    "clarification_needed": False,
                    "clarification_prompt": None,
                    "provider": self.name,
                    "provider_type": self.provider_type,
                    "is_mock": False,
                    "reason": "Devanagari with Marathi lexical/phonetic markers"
                }
            elif hi_hits > mr_hits:
                return {
                    "detected_language": "hi",
                    "language_name": "Hindi",
                    "confidence": 0.94,
                    "is_supported": True,
                    "is_code_switched": False,
                    "clarification_needed": False,
                    "clarification_prompt": None,
                    "provider": self.name,
                    "provider_type": self.provider_type,
                    "is_mock": False,
                    "reason": "Devanagari with Hindi lexical markers"
                }
            else:
                # Ambiguous short Devanagari utterance (e.g. just a name "रमेश कुमार" or "पुणे")
                return {
                    "detected_language": "hi",
                    "language_name": "Hindi",
                    "confidence": 0.70,
                    "is_supported": True,
                    "is_code_switched": False,
                    "clarification_needed": False,
                    "clarification_prompt": None,
                    "provider": self.name,
                    "provider_type": self.provider_type,
                    "is_mock": False,
                    "reason": "Devanagari script (default Hindi)"
                }

        # 4. Latin Script (English, Romanized Hindi / Hinglish, Romanized Marathi)
        if has_latin:
            words = set(re.findall(r"\b[a-zA-Z]+\b", raw_text.lower()))
            hinglish_overlap = len(words.intersection(self.ROMANIZED_HINDI_WORDS))
            marathi_overlap = len(words.intersection(self.ROMANIZED_MARATHI_WORDS))

            if marathi_overlap > 0 and marathi_overlap >= hinglish_overlap:
                return {
                    "detected_language": "mr-en",
                    "language_name": "Marathi (Romanized)",
                    "confidence": 0.86,
                    "is_supported": True,
                    "is_code_switched": True,
                    "clarification_needed": False,
                    "clarification_prompt": None,
                    "provider": self.name,
                    "provider_type": self.provider_type,
                    "is_mock": False,
                    "reason": "Romanized Marathi markers detected"
                }
            elif hinglish_overlap > 0:
                return {
                    "detected_language": "hi-en",
                    "language_name": "Hinglish (Hindi-English)",
                    "confidence": 0.88,
                    "is_supported": True,
                    "is_code_switched": True,
                    "clarification_needed": False,
                    "clarification_prompt": None,
                    "provider": self.name,
                    "provider_type": self.provider_type,
                    "is_mock": False,
                    "reason": "Romanized Hindi markers detected (Hinglish)"
                }
            else:
                return {
                    "detected_language": "en",
                    "language_name": "English",
                    "confidence": 0.90,
                    "is_supported": True,
                    "is_code_switched": False,
                    "clarification_needed": False,
                    "clarification_prompt": None,
                    "provider": self.name,
                    "provider_type": self.provider_type,
                    "is_mock": False,
                    "reason": "Latin script standard English"
                }

        # 5. Fallback for numeric or symbol only utterances
        return {
            "detected_language": "hi",
            "language_name": "Hindi",
            "confidence": 0.60,
            "is_supported": True,
            "is_code_switched": False,
            "clarification_needed": False,
            "clarification_prompt": None,
            "provider": self.name,
            "provider_type": self.provider_type,
            "is_mock": False,
            "reason": "Default fallback"
        }


class BhashiniLIDProvider(BaseLIDProvider):
    """
    Cloud Bhashini ULCA Language Identification Provider.
    Falls back gracefully to ScriptAndLexicalLIDProvider if credentials missing or network fails.
    """
    name: str = "bhashini_lid"
    provider_type: str = "cloud_api"
    is_mock: bool = False

    def __init__(self, api_key: Optional[str] = None, user_id: Optional[str] = None):
        self.api_key = api_key or os.getenv("BHASHINI_API_KEY", "")
        self.user_id = user_id or os.getenv("BHASHINI_USER_ID", "")
        self._fallback = ScriptAndLexicalLIDProvider()

    def identify(self, text: str, audio_bytes: Optional[bytes] = None) -> Dict[str, Any]:
        if not self.api_key or not self.user_id:
            # Fall back to script and lexical analyzer without failing
            res = self._fallback.identify(text, audio_bytes)
            res["provider"] = "bhashini_lid (fallback: script_and_lexical)"
            res["status"] = "credentials_missing_fallback_used"
            return res

        # Ready for live ULCA endpoint integration
        return self._fallback.identify(text, audio_bytes)
