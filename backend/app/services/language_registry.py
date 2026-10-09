"""
Centralized Language Registry Service for SEVA VAANI.
Provides capability querying, locale mapping, and tier checking for Indian languages.
"""

from __future__ import annotations
import os
import json
from typing import Dict, Any, List, Optional
from app.config import settings

class LanguageRegistry:
    _registry_cache: Optional[Dict[str, Any]] = None

    @classmethod
    def _load_registry(cls) -> Dict[str, Any]:
        if cls._registry_cache is None:
            path = os.path.join(settings.DATA_DIR, "languages", "registry.json")
            if not os.path.exists(path):
                # Fallback to local default
                return {
                    "version": "1.0.0",
                    "default_language": "hi",
                    "languages": [
                        {"code": "hi", "name_en": "Hindi", "name_native": "हिन्दी", "locale": "hi-IN", "stt": {"supported": True}, "tts": {"supported": True}},
                        {"code": "mr", "name_en": "Marathi", "name_native": "मराठी", "locale": "mr-IN", "stt": {"supported": True}, "tts": {"supported": True}},
                        {"code": "en", "name_en": "English", "name_native": "English", "locale": "en-IN", "stt": {"supported": True}, "tts": {"supported": True}}
                    ]
                }
            with open(path, "r", encoding="utf-8") as f:
                cls._registry_cache = json.load(f)
        return cls._registry_cache

    @classmethod
    def list_all(cls) -> List[Dict[str, Any]]:
        return cls._load_registry().get("languages", [])

    @classmethod
    def get_by_code(cls, code: str) -> Optional[Dict[str, Any]]:
        code = (code or "").lower().strip()
        for lang in cls.list_all():
            if lang.get("code") == code:
                return lang
        return None

    @classmethod
    def is_supported(cls, code: str) -> bool:
        lang = cls.get_by_code(code)
        return lang is not None

    @classmethod
    def get_capabilities(cls, code: str) -> Dict[str, Any]:
        lang = cls.get_by_code(code)
        if not lang:
            return {
                "supported": False,
                "stt": False,
                "tts": False,
                "translation": False,
                "lid": False,
                "tier": "unsupported"
            }
        return {
            "supported": True,
            "stt": bool(lang.get("stt", {}).get("supported", False)),
            "tts": bool(lang.get("tts", {}).get("supported", False)),
            "translation": bool(lang.get("translation", {}).get("supported", False)),
            "lid": bool(lang.get("lid", {}).get("supported", False)),
            "locale": lang.get("locale", "en-IN"),
            "tier": lang.get("tier", "tier_3_experimental")
        }

    @classmethod
    def get_locale_for_language(cls, code: str) -> str:
        lang = cls.get_by_code(code)
        return lang.get("locale", "hi-IN") if lang else "hi-IN"
