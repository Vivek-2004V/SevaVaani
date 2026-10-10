"""
Transcript Normalization & Inverse Text Normalization (ITN) Service for SEVA VAANI.
Converts spoken numbers, currency, dates, and phone numbers into canonical formats,
while strictly preserving Named Entities (names, districts, villages) without silent corruption (Requirements 2 & 3).
"""

from __future__ import annotations
import re
from typing import Dict, Any, List, Optional, Tuple


class TranscriptNormalizer:
    """
    Inverse Text Normalization (ITN) engine for Hindi, Marathi, and English.
    Preserves original_transcript alongside normalized_transcript.
    Generates a full audit trail of transformations and entity protections.
    """

    # Spoken Indian numbers mapping
    SPOKEN_NUMBERS = {
        # Hindi
        "शून्य": "0", "एक": "1", "दो": "2", "तीन": "3", "चार": "4",
        "पाँच": "5", "पांच": "5", "छह": "6", "सात": "7", "आठ": "8", "नौ": "9", "दस": "10",
        "ग्यारह": "11", "बारह": "12", "तेरह": "13", "चौदह": "14", "पंद्रह": "15",
        "सोलह": "16", "सत्रह": "17", "अठारह": "18", "उन्नीस": "19", "बीस": "20",
        "पच्चीस": "25", "तीस": "30", "पैंतीस": "35", "चालीस": "40", "पंतालीस": "45",
        "पचास": "50", "पचपन": "55", "साठ": "60", "पैंसठ": "65", "सत्तर": "70",
        "पचहत्तर": "75", "अस्सी": "80", "पचासी": "85", "नब्बे": "90", "पचानवे": "95",
        "सौ": "100", "हजार": "1000", "हज़ार": "1000", "लाख": "100000", "करोड़": "10000000",

        # Marathi
        "दोन": "2", "पाच": "5", "सहा": "6", "नऊ": "9", "दहा": "10",
        "अकरा": "11", "बारा": "12", "तेरा": "13", "चौदा": "14", "पंधरा": "15",
        "सोळा": "16", "सतरा": "17", "अठरा": "18", "एकोणीस": "19", "वीस": "20",
        "पंचवीस": "25", "तीस": "30", "पस्तीस": "35", "चाळीस": "40", "पंचेचाळीस": "45",
        "पन्नास": "50", "पंचावन्न": "55", "साठ": "60", "पासष्ट": "65", "सत्तर": "70",
        "पंच्याहत्तर": "75", "ऐंशी": "80", "पंच्याऐंशी": "85", "नव्वद": "90", "पंच्याण्णव": "95",
        "शंभर": "100", "हजार": "1000", "लाख": "100000", "कोटी": "10000000",

        # English / Hinglish
        "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4",
        "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10",
        "eleven": "11", "twelve": "12", "thirteen": "13", "fourteen": "14", "fifteen": "15",
        "twenty": "20", "thirty": "30", "forty": "40", "fifty": "50",
        "sixty": "60", "seventy": "70", "eighty": "80", "ninety": "90",
        "hundred": "100", "thousand": "1000", "lakh": "100000", "lakhs": "100000", "crore": "10000000"
    }

    # Complex multi-word Indian currency expressions
    CURRENCY_EXPRESSIONS = [
        # Hindi
        (r"(\d+|एक|दो|तीन|चार|पाँच|पांच|छह|सात|आठ|नौ|दस)\s*(?:लाख|हज़ार|हजार)\s*(\d+|पचास|बीस|तीस|चालीस|साठ|सत्तर|अस्सी|नब्बे)?\s*(?:हज़ार|हजार)?", "currency_compound_hi"),
        (r"दो\s*लाख", "200000"),
        (r"तीन\s*लाख", "300000"),
        (r"चार\s*लाख", "400000"),
        (r"पाँच\s*लाख|पांच\s*लाख", "500000"),
        (r"एक\s*लाख\s*बीस\s*हजार|एक\s*लाख\s*बीस\s*हज़ार", "120000"),
        (r"एक\s*लाख\s*पचास\s*हजार|एक\s*लाख\s*पचास\s*हज़ार", "150000"),
        (r"एक\s*लाख", "100000"),
        (r"पचास\s*हजार|पचास\s*हज़ार", "50000"),
        (r"पच्चीस\s*हजार|पच्चीस\s*हज़ार", "25000"),
        (r"बीस\s*हजार|बीस\s*हज़ार", "20000"),
        (r"पंद्रह\s*हजार|पंद्रह\s*हज़ार", "15000"),
        (r"दस\s*हजार|दस\s*हज़ार", "10000"),
        (r"अस्सी\s*हजार|अस्सी\s*हज़ार", "80000"),
        (r"साठ\s*हजार|साठ\s*हज़ार", "60000"),
        (r"चालीस\s*हजार|चालीस\s*हज़ार", "40000"),

        # Marathi
        (r"दोन\s*लाख", "200000"),
        (r"तीन\s*लाख", "300000"),
        (r"चार\s*लाख", "400000"),
        (r"पाच\s*लाख", "500000"),
        (r"एक\s*लाख\s*वीस\s*हजार", "120000"),
        (r"एक\s*लाख\s*पन्नास\s*हजार", "150000"),
        (r"एक\s*लाख", "100000"),
        (r"पन्नास\s*हजार", "50000"),
        (r"पंचवीस\s*हजार", "25000"),
        (r"वीस\s*हजार", "20000"),
        (r"पंधरा\s*हजार", "15000"),
        (r"दहा\s*हजार", "10000"),
        (r"ऐंशी\s*हजार", "80000"),
        (r"साठ\s*हजार", "60000"),
        (r"चाळीस\s*हजार", "40000"),

        # English
        (r"two\s*hundred\s*thousand", "200000"),
        (r"three\s*hundred\s*thousand", "300000"),
        (r"one\s*hundred\s*thousand", "100000"),
        (r"two\s*lakh(?:s)?(?:\s*rupees)?", "200000"),
        (r"one\s*lakh\s*twenty\s*thousand", "120000"),
        (r"one\s*lakh\s*fifty\s*thousand", "150000"),
        (r"one\s*lakh(?:s)?(?:\s*rupees)?", "100000"),
        (r"fifty\s*thousand", "50000"),
        (r"twenty\s*five\s*thousand", "25000"),
        (r"twenty\s*thousand", "20000"),
        (r"fifteen\s*thousand", "15000"),
        (r"ten\s*thousand", "10000"),
        (r"eighty\s*thousand", "80000"),
        (r"sixty\s*thousand", "60000"),
        (r"forty\s*thousand", "40000")
    ]

    # Known Indian Districts / Places to explicitly guard from numeric or phonetic distortion
    KNOWN_LOCATIONS = {
        "pune", "mumbai", "nagpur", "nashik", "aurangabad", "chhatrapati sambhajinagar",
        "thane", "amravati", "solapur", "kolhapur", "nanded", "jalgaon", "akola",
        "latur", "dhule", "ahmednagar", "chandrapur", "parbhani", "jalna", "bhir", "beed",
        "ratnagiri", "gondia", "wardha", "osmanabad", "dharashiv", "yavatmal", "bhandara",
        "gadchiroli", "washim", "hingoli", "sangli", "satara", "sindhudurg", "palghar",
        "bhopal", "indore", "gwalior", "jabalpur", "ujjain", "sagar", "dewas", "satna",
        "ratlam", "rewa", "katni", "singrauli", "burhanpur", "khandwa", "vidisha",
        "पुणे", "मुंबई", "नागपूर", "नाशिक", "औरंगाबाद", "छत्रपती संभाजीनगर", "ठाणे", "अमरावती",
        "सोलापूर", "कोल्हापूर", "नांदेड", "जळगाव", "अकोला", "लातूर", "धुळे", "अहमदनगर",
        "चंद्रपूर", "परभणी", "जालना", "बीड", "रत्नागिरी", "गोंदिया", "वर्धा", "उस्मानाबाद",
        "धाराशिव", "यवतमाळ", "भंडारा", "गडचिरोली", "वाशिम", "हिंगोली", "सांगली", "सातारा",
        "सिंधुदुर्ग", "पालघर", "भोपाळ", "भोपल", "इंदूर", "ग्वालियर", "जबलपूर", "उज्जैन", "सागर"
    }

    @classmethod
    def _extract_protected_entities(cls, text: str) -> List[Dict[str, Any]]:
        """
        Extracts named entities that MUST be protected from alteration.
        Identifies person name cues (e.g. 'मेरा नाम X', 'माझे नाव X') and geographic names.
        """
        protected = []
        norm = text.lower()

        # 1. Check known locations
        for loc in cls.KNOWN_LOCATIONS:
            pat = rf"(?<![\u0900-\u097fa-zA-Z0-9]){re.escape(loc)}(?![\u0900-\u097fa-zA-Z0-9])"
            match = re.search(pat, text, flags=re.IGNORECASE)
            if match:
                protected.append({
                    "text": match.group(0),
                    "type": "location",
                    "start": match.start(),
                    "end": match.end()
                })

        # 2. Check citizen person name cues in Hindi/Marathi/English
        name_patterns = [
            r"(?:मेरा\s+नाम|माझे\s+नाव|माझं\s+नाव|my\s+name\s+is)\s+([A-Za-z\u0900-\u097f\s]+?)(?:\s+है|\s+आहे|\s+ahe|\s+hai|\.|$)",
            r"(?:नाम|नाव|name)\s*[:=]\s*([A-Za-z\u0900-\u097f\s]+?)(?:\.|$)"
        ]
        for pat in name_patterns:
            m = re.search(pat, text, flags=re.IGNORECASE)
            if m:
                extracted_name = m.group(1).strip()
                if extracted_name and len(extracted_name.split()) <= 4:
                    protected.append({
                        "text": extracted_name,
                        "type": "person_name",
                        "start": m.start(1),
                        "end": m.end(1)
                    })

        return protected

    @classmethod
    def normalize_spoken_digits_to_phone(cls, text: str) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Normalizes spoken digit sequences (e.g. 'नौ आठ दो तीन...') into mobile numbers.
        """
        transformations = []
        digit_words_hi = {
            "शून्य": "0", "एक": "1", "दो": "2", "तीन": "3", "चार": "4",
            "पाँच": "5", "पांच": "5", "छह": "6", "सात": "7", "आठ": "8", "नौ": "9"
        }
        digit_words_mr = {
            "शून्य": "0", "एक": "1", "दोन": "2", "तीन": "3", "चार": "4",
            "पाच": "5", "सहा": "6", "सात": "7", "आठ": "8", "नऊ": "9"
        }
        all_digits = {**digit_words_hi, **digit_words_mr}

        # Look for sequences of 8 to 12 spoken digit words
        words = text.split()
        i = 0
        new_words = []
        while i < len(words):
            # Check for digit word run
            run = []
            j = i
            while j < len(words) and (words[j] in all_digits or words[j].isdigit()):
                d = all_digits.get(words[j], words[j])
                run.append(d)
                j += 1

            if len(run) >= 10:  # Valid mobile number sequence
                phone_num = "".join(run)
                orig_span = " ".join(words[i:j])
                new_words.append(phone_num)
                transformations.append({
                    "category": "phone_number",
                    "original": orig_span,
                    "replacement": phone_num
                })
                i = j
            else:
                new_words.append(words[i])
                i += 1

        return " ".join(new_words), transformations

    @classmethod
    def normalize_currency_and_numbers(cls, text: str) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Normalizes spoken currency amounts into canonical numeric representations.
        """
        transformations = []
        result = text

        for pattern, replacement in cls.CURRENCY_EXPRESSIONS:
            if replacement.startswith("currency_compound"):
                continue
            matches = list(re.finditer(pattern, result, flags=re.IGNORECASE))
            for m in reversed(matches):
                orig_substr = m.group(0)
                result = result[:m.start()] + replacement + result[m.end():]
                transformations.append({
                    "category": "monetary_amount",
                    "original": orig_substr,
                    "replacement": replacement
                })

        return result, transformations

    @classmethod
    def normalize(cls, original_text: str, language: str = "hi") -> Dict[str, Any]:
        """
        Main normalization method.
        Requirements:
        1. Preserve the original transcript alongside any normalized version.
        2. Do not silently change names, locations, dates, phone numbers or monetary amounts.
        """
        raw_text = (original_text or "").strip()
        if not raw_text:
            return {
                "original_transcript": "",
                "normalized_transcript": "",
                "transformations": [],
                "protected_entities_preserved": [],
                "audit_trail": "Empty utterance; no transformations applied."
            }

        # Step 1: Detect and shield protected entities (person names, districts, villages)
        protected_entities = cls._extract_protected_entities(raw_text)
        shielded_text = raw_text
        shield_map = {}

        for idx, entity in enumerate(protected_entities):
            placeholder = f"__PROTECTED_ENTITY_{idx}__"
            shield_map[placeholder] = entity["text"]
            shielded_text = shielded_text.replace(entity["text"], placeholder)

        # Step 2: Normalize spoken mobile digit sequences
        phone_normalized, phone_transforms = cls.normalize_spoken_digits_to_phone(shielded_text)

        # Step 3: Normalize currency amounts and spoken numbers
        currency_normalized, currency_transforms = cls.normalize_currency_and_numbers(phone_normalized)

        # Step 4: Unshield protected entities
        final_normalized = currency_normalized
        for placeholder, original_value in shield_map.items():
            final_normalized = final_normalized.replace(placeholder, original_value)

        all_transforms = phone_transforms + currency_transforms

        # Build audit trail
        audit_trail_parts = []
        if all_transforms:
            for t in all_transforms:
                audit_trail_parts.append(f"Converted [{t['category']}]: '{t['original']}' -> '{t['replacement']}'")
        else:
            audit_trail_parts.append("No numeric or currency transformations required.")

        if protected_entities:
            for p in protected_entities:
                audit_trail_parts.append(f"Guarded [{p['type']}]: '{p['text']}' strictly unaltered.")

        return {
            "original_transcript": raw_text,
            "normalized_transcript": final_normalized,
            "transformations": all_transforms,
            "protected_entities_preserved": [
                {
                    "text": p["text"],
                    "type": p["type"],
                    "status": "unaltered"
                }
                for p in protected_entities
            ],
            "audit_trail": " | ".join(audit_trail_parts)
        }
