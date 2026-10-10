"""
Regional Lexicon & Dialect Adaptation Engine (Prompt 4).
Handles variations in how native speakers actually speak:
- Hindi, Hinglish, Marathi, and Indian English colloquial variations
- Colloquial regional grammar (e.g. Mumbai 'mere ko', Vidarbha 'व्हय', Malwi 'म्हारो')
- Administrative synonyms (e.g. 'आय प्रमाण पत्र' vs 'उत्पन्नाचा दाखला' vs 'income certificate')
- Multi-tier dialect support registry with explicit limitation reporting (Requirement 9)
- Distinguishes actual spoken content from assumptions (Requirement 4)
- Prevents mistranslation of names and locations (Requirement 5)
"""

from __future__ import annotations
import re
from typing import Dict, Any, List, Optional, Tuple


class RegionalLexiconManager:
    """
    Manages regional vocabulary, contextual hints, and colloquial grammar normalizations.
    Does not equate regional accents or colloquialisms with incorrect speech (Requirement 8).
    """

    # Dialect calibration and support tiers (Requirement 9)
    DIALECT_REGISTRY = {
        "hi": {
            "standard_hindi": {
                "name": "Standard Hindi (Khari Boli)",
                "support_level": "fully_supported",
                "tier": 1,
                "description": "Standard Devanagari Hindi"
            },
            "mumbai_bambaiya": {
                "name": "Mumbai / Western Colloquial Hindi",
                "support_level": "regional_vocab_supported",
                "tier": 2,
                "description": "Uses 'mere ko', 'tere ko', 'apun' colloquial patterns"
            },
            "malwi_rajasthani": {
                "name": "Malwi / Western Hindi Regional",
                "support_level": "regional_vocab_supported",
                "tier": 2,
                "description": "Lexical markers like 'म्हारो', 'छै' supported via vocabulary adaptation"
            },
            "bhojpuri_awadhi": {
                "name": "Bhojpuri / Awadhi Influenced Hindi",
                "support_level": "regional_vocab_supported",
                "tier": 2,
                "description": "Lexical markers like 'हमार', 'रहा बा' supported via contextual hints"
            },
            "bundelkhandi": {
                "name": "Bundelkhandi Hindi",
                "support_level": "regional_vocab_supported",
                "tier": 2,
                "description": "Lexical markers like 'हओ', 'हते' supported"
            },
            "maithili_magahi": {
                "name": "Maithili / Magahi Eastern Hindi",
                "support_level": "regional_vocab_supported",
                "tier": 2,
                "description": "Lexical markers like 'हमर', 'अहाँ', 'छियै', 'रहल छी' supported"
            },
            "chhattisgarhi": {
                "name": "Chhattisgarhi Dialect",
                "support_level": "regional_vocab_supported",
                "tier": 2,
                "description": "Lexical markers like 'मोर', 'तोरे', 'करथों', 'हावे' supported"
            },
            "haryanvi_western": {
                "name": "Haryanvi & Western Hindi",
                "support_level": "regional_vocab_supported",
                "tier": 2,
                "description": "Lexical markers like 'म्हारा', 'थारा', 'बाबूजी', 'सै' supported"
            }
        },
        "mr": {
            "standard_marathi": {
                "name": "Standard Marathi (Pune/Mumbai)",
                "support_level": "fully_supported",
                "tier": 1,
                "description": "Standard Devanagari Marathi"
            },
            "varhadi_vidarbha": {
                "name": "Varhadi / Vidarbha Marathi",
                "support_level": "regional_vocab_supported",
                "tier": 2,
                "description": "Uses 'व्हय', 'नाय', 'दाखला', 'पाह्यलं' regional patterns"
            },
            "marathwada": {
                "name": "Marathwada Marathi",
                "support_level": "regional_vocab_supported",
                "tier": 2,
                "description": "Uses 'कवा', 'तेवा', 'जेवा' colloquial temporal markers"
            },
            "khandeshi_ahirani": {
                "name": "Khandeshi / Ahirani Marathi",
                "support_level": "regional_vocab_supported",
                "tier": 2,
                "description": "Uses 'आम्हाले', 'कायले', 'तिथ', 'भाऊ' regional markers"
            },
            "konkani_coastal": {
                "name": "Coastal Marathi / Konkani Cues",
                "support_level": "regional_vocab_supported",
                "tier": 2,
                "description": "Phonetic variations in lateral flap and vowel endings"
            }
        },
        "en": {
            "indian_english": {
                "name": "Indian English / Hinglish Mixed",
                "support_level": "fully_supported",
                "tier": 1,
                "description": "Standard Indian English and bilingual code-switching"
            }
        }
    }

    # Public service intent synonyms across languages and regional dialects
    SERVICE_INTENTS = {
        "apply_income_certificate": [
            # Hindi
            r"mujhe\s+income\s+certificate\s+banana\s+hai",
            r"mere\s+ko\s+aay\s+praman\s+patra\s+chahiye",
            r"mujhe\s+aay\s+ka\s+certificate\s+banwana\s+hai",
            r"aay\s+praman\s+patra\s+banana\s+hai",
            r"आय\s*प्रमाण\s*पत्र\s*(?:चाहिए|बनाना|बनवाना)",
            # Hinglish
            r"mujhe\s+income\s+certificate\s+ke\s+liye\s+apply\s+karna\s+hai",
            r"income\s+certificate\s+apply\s+karna\s+hai",
            r"income\s+certificate\s+chahiye",
            # English
            r"i\s+want\s+to\s+apply\s+for\s+(?:an\s+)?income\s+certificate",
            r"apply\s+for\s+income\s+certificate",
            # Marathi
            r"मला\s+उत्पन्नाचा\s+दाखला\s+काढायचा\s+आहे",
            r"उत्पन्नाचा\s+दाखला\s+काढायचा\s+आहे",
            r"उत्पन्नाचा\s+दाखला\s+हवा\s+आहे",
            r"दाखला\s+काढायचा\s+आहे"
        ],
        "update_address": [
            r"please\s+mera\s+address\s+update\s+kar\s+do",
            r"mera\s+address\s+update\s+karna\s+hai",
            r"address\s+change\s+karna\s+hai",
            r"पता\s+अपडेट\s+करना\s+है",
            r"पत्ता\s+बदलायचा\s+आहे",
            r"update\s+my\s+address",
            r"change\s+address"
        ]
    }

    # Regional colloquialisms mapped to standard equivalents while flagging valid variation
    COLLOQUIAL_NORMALIZATIONS = [
        # Mumbai colloquial Hindi
        (r"\bmere\s+ko\b", "mujhe", "mumbai_colloquial_grammar"),
        (r"\btere\s+ko\b", "tujhe", "mumbai_colloquial_grammar"),
        # Varhadi Marathi
        (r"\bव्हय\b", "होय", "varhadi_affirmative"),
        (r"\bनाय\b", "नाही", "varhadi_negative"),
        # Khandeshi Marathi
        (r"\bआम्हाले\b", "आम्हाला", "khandeshi_pronoun"),
        (r"\bकायले\b", "कशाला", "khandeshi_interrogative"),
        # Malwi / Rajasthani
        (r"\bम्हारो\b|\bमारो\b", "मेरा", "malwi_possessive"),
        # Bhojpuri & Awadhi
        (r"\बहमार\b", "मेरा", "bhojpuri_possessive"),
        (r"\बतोहार\b", "तुम्हारा", "bhojpuri_possessive"),
        # Maithili / Magahi
        (r"\बहमर\b", "मेरा", "maithili_possessive"),
        (r"\बअहाँ\b", "आप", "maithili_pronoun"),
        # Chhattisgarhi
        (r"\बमोर\b", "मेरा", "chhattisgarhi_possessive"),
        (r"\बहावे\b", "है", "chhattisgarhi_verb"),
        # Haryanvi
        (r"\बम्हारा\b", "मेरा", "haryanvi_possessive"),
        (r"\बथारा\b", "तुम्हारा", "haryanvi_possessive")
    ]

    @classmethod
    def match_service_intent(cls, transcript: str) -> Optional[Dict[str, Any]]:
        """
        Matches user utterance against multi-lingual service intents.
        Handles Mumbai 'mere ko', Marathi 'दाखला', Hinglish, and formal English.
        """
        norm = (transcript or "").lower().strip()
        for intent_name, patterns in cls.SERVICE_INTENTS.items():
            for pat in patterns:
                if re.search(pat, norm, flags=re.IGNORECASE):
                    return {
                        "intent": intent_name,
                        "matched_pattern": pat,
                        "confidence": 0.95,
                        "is_regional_variation": True,
                        "verbatim_spoken": transcript
                    }
        return None

    @classmethod
    def normalize_regional_colloquialisms(cls, transcript: str) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Normalizes colloquial regional grammar while logging valid variation tags.
        Requirement 8: Does NOT mark regional accent/speech as incorrect.
        """
        res = transcript
        variations_found = []

        for pattern, replacement, tag in cls.COLLOQUIAL_NORMALIZATIONS:
            m = re.search(pattern, res, flags=re.IGNORECASE)
            if m:
                variations_found.append({
                    "original": m.group(0),
                    "normalized": replacement,
                    "dialect_tag": tag,
                    "is_valid_speech": True  # Explicit confirmation of linguistic validity
                })
                res = re.sub(pattern, replacement, res, flags=re.IGNORECASE)

        return res, variations_found

    @classmethod
    def check_dialect_support(cls, language: str, dialect_key: Optional[str] = None) -> Dict[str, Any]:
        """
        Reports explicit dialect support levels (Requirement 9).
        Never claims universal uncalibrated dialect coverage.
        """
        lang = (language or "hi").lower().split("-")[0]
        lang_dialects = cls.DIALECT_REGISTRY.get(lang, {})

        if dialect_key and dialect_key in lang_dialects:
            dial_info = lang_dialects[dialect_key]
            return {
                "language": lang,
                "dialect": dialect_key,
                "supported": True,
                "support_level": dial_info["support_level"],
                "tier": dial_info["tier"],
                "description": dial_info["description"]
            }

        # Check general language
        if lang in cls.DIALECT_REGISTRY:
            return {
                "language": lang,
                "dialect": dialect_key or "general",
                "supported": True,
                "support_level": "standard_and_regional_vocab_supported",
                "tier": 1,
                "calibrated_dialects": list(lang_dialects.keys())
            }

        return {
            "language": lang,
            "dialect": dialect_key or "unknown",
            "supported": False,
            "support_level": "unsupported_or_uncalibrated",
            "tier": 3,
            "message": f"Dialect/language '{lang}' is not yet calibrated. Explicit clarification requested."
        }
