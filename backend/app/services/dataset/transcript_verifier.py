"""
Transcript Human-Verification & Code-Switching Segmenter (Requirements 10 & 11).
Enforces human verification before admission to supervised training splits.
Preserves native Devanagari script, Latin script, and extracts code-switching segments.
"""

from __future__ import annotations
import re
from typing import List, Dict, Any, Tuple
from app.schemas.dataset import LanguageSegment


class TranscriptVerifier:
    """
    Validates transcript human-verification status and extracts code-switched script spans.
    """

    DEVANAGARI_REGEX = re.compile(r"[\u0900-\u097f]+")
    LATIN_REGEX = re.compile(r"[a-zA-Z0-9]+")

    # Prohibited PII patterns in public service speech transcripts
    PII_PATTERNS = [
        (r"\b\d{4}\s*\d{4}\s*\d{4}\b", "aadhaar_number_leak"),
        (r"\b[A-Z]{5}\d{4}[A-Z]{1}\b", "pan_number_leak"),
        (r"\b[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\b", "email_address_leak")
    ]

    @classmethod
    def check_pii_leaks(cls, transcript: str) -> List[str]:
        """Ensures training transcripts do not leak live citizen PII (Aadhaar, PAN, email)."""
        leaks = []
        for pat, tag in cls.PII_PATTERNS:
            if re.search(pat, transcript):
                leaks.append(tag)
        return leaks

    @classmethod
    def segment_code_switching(cls, transcript: str, primary_language: str = "hi") -> List[LanguageSegment]:
        """
        Preserves native script and segments code-switched utterances into constituent language/script spans.
        Requirement 11: Preserve native script and code-switching in transcripts.
        """
        segments: List[LanguageSegment] = []
        if not transcript:
            return segments

        # Tokenize by whitespace while preserving punctuation
        tokens = transcript.split()
        for token in tokens:
            has_devanagari = bool(cls.DEVANAGARI_REGEX.search(token))
            has_latin = bool(cls.LATIN_REGEX.search(token))

            if has_devanagari and not has_latin:
                lang = "mr" if primary_language == "mr" else "hi"
                segments.append(LanguageSegment(text=token, language=lang, script="Devanagari"))
            elif has_latin and not has_devanagari:
                segments.append(LanguageSegment(text=token, language="en", script="Latin"))
            elif has_devanagari and has_latin:
                segments.append(LanguageSegment(text=token, language="hi-en", script="Mixed"))
            else:
                # Punctuation or digits
                segments.append(LanguageSegment(text=token, language=primary_language, script="Punctuation/Numeric"))

        return segments

    @classmethod
    def validate_for_training_split(
        cls,
        transcript: str,
        reviewer_status: str,
        primary_language: str = "hi"
    ) -> Tuple[bool, List[str], List[LanguageSegment]]:
        """
        Validates whether transcript meets criteria for train/validation/test admission.
        Requirement 10: Require human-verified transcripts for evaluation and supervised fine-tuning.
        """
        errors = []
        clean_text = (transcript or "").strip()

        if not clean_text:
            errors.append("empty_transcript")
            return False, errors, []

        # Check human review gate
        if reviewer_status != "verified":
            errors.append("unverified_transcript_must_be_human_verified")

        # Check PII leaks
        pii_leaks = cls.check_pii_leaks(clean_text)
        if pii_leaks:
            errors.extend(pii_leaks)

        # Extract code-switched segments
        segments = cls.segment_code_switching(clean_text, primary_language=primary_language)

        is_admissible = len(errors) == 0
        return is_admissible, errors, segments
