"""
Translation Service for SevaVaani.
Exposes multilingual Indic translation adapters with Named Entity protection.
"""

from __future__ import annotations
from typing import Dict, Any, Optional

from app.services.translation_adapter import IndicTranslationAdapter

# Canonical alias
TranslationService = IndicTranslationAdapter

__all__ = ["IndicTranslationAdapter", "TranslationService"]
