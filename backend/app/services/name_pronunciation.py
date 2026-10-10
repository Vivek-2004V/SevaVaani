"""
SEVA VAANI - Indian Name Pronunciation, Spelling Confirmation & Aadhaar Cross-Check Service.
Enforces:
1. Deterministic Name Pronunciation & Confirmation Workflow.
2. Never infer official spelling solely from pronunciation (e.g. 'Meenakshi' vs 'Minakshi').
3. Never let an LLM or STT engine silently invent, approve, or replace identity details.
4. Explicit state machine for personal names and identity fields:
   - LISTENING
   - TRANSCRIPT_REVIEW
   - CONFIRMATION_REQUIRED
   - CONFIRMED
   - CORRECTION_REQUIRED
   - ERROR
5. Letter-by-letter spelling breakdown for low-literacy citizens in Hindi, Marathi, and English.
6. Honest cross-checking against document OCR text with citizen choice and zero silent overwrites.
7. Informed consent and sensitive Aadhaar masking (e.g. XXXX-XXXX-1234).
"""

from __future__ import annotations
import re
from typing import Dict, Any, List, Optional, Tuple


class NamePronunciationService:
    """
    Dedicated engine for Indian personal name pronunciation, character-level spelling,
    and Aadhaar/document name discrepancy resolution.
    """

    # Common Indian phonetic spelling variations in Latin script where single pronunciation
    # can map to multiple official government document spellings.
    PHONETIC_VARIANTS_MAP = {
        "minakshi": ["Meenakshi", "Minakshi", "Meenakshy"],
        "meenakshi": ["Meenakshi", "Minakshi", "Meenakshy"],
        "ganesh": ["Ganesh", "Ganeshe", "Ganesha"],
        "ganeshe": ["Ganesh", "Ganeshe"],
        "choudhary": ["Choudhary", "Choudhari", "Chaudhary", "Chowdhury"],
        "chaudhary": ["Choudhary", "Choudhari", "Chaudhary", "Chowdhury"],
        "choudhari": ["Choudhary", "Choudhari", "Chaudhary", "Chowdhury"],
        "patil": ["Patil", "Paatil"],
        "paatil": ["Patil", "Paatil"],
        "sharma": ["Sharma", "Sarma"],
        "verma": ["Verma", "Varma"],
        "kulkarni": ["Kulkarni", "Koolkarni"],
        "jadhav": ["Jadhav", "Jadav"],
        "shinde": ["Shinde", "Scindia"],
        "deshmukh": ["Deshmukh", "Deshmukhe"],
        "pawar": ["Pawar", "Powar", "Puwar"],
        "joshi": ["Joshi", "Joshee"],
        "mishra": ["Mishra", "Misra"],
        "gupta": ["Gupta", "Gopta"],
        "singh": ["Singh", "Sinh"],
        "yadav": ["Yadav", "Yadava", "Jadav"],
        "khatri": ["Khatri", "Khetri"],
        "pandey": ["Pandey", "Panday", "Pande"],
        "tiwari": ["Tiwari", "Tewari", "Tripathi"],
        "tripathi": ["Tripathi", "Tiwari", "Tripati"],
        "mukherjee": ["Mukherjee", "Mukhopadhyay"],
        "chatterjee": ["Chatterjee", "Chattopadhyay"],
        "banerjee": ["Banerjee", "Bandyopadhyay"],
        "iyer": ["Iyer", "Ayyar", "Aiyar"],
        "nair": ["Nair", "Nayyar", "Nayakar"],
        "reddy": ["Reddy", "Reddi"],
        "naidu": ["Naidu", "Nayudu"],
        "rao": ["Rao", "Row"],
        "rathore": ["Rathore", "Rathod", "Rathour"],
        "chauhan": ["Chauhan", "Chouhan"]
    }

    # Devanagari vowel and consonant names for slow letter-by-letter audio readback
    DEVANAGARI_LETTER_NAMES = {
        'अ': 'अ', 'आ': 'आ', 'इ': 'छोटी इ', 'ई': 'बड़ी ई', 'उ': 'छोटा उ', 'ऊ': 'बड़ा ऊ',
        'ऋ': 'ऋ', 'ए': 'ए', 'ऐ': 'ऐ', 'ओ': 'ओ', 'औ': 'औ', 'अं': 'अनुस्वार अं', 'अः': 'विसर्ग अः',
        'क': 'क', 'ख': 'ख', 'ग': 'ग', 'घ': 'घ', 'ङ': 'ङ',
        'च': 'च', 'छ': 'छ', 'ज': 'ज', 'झ': 'झ', 'ञ': 'ञ',
        'ट': 'ट', 'ठ': 'ठ', 'ड': 'ड', 'ढ': 'ढ', 'ण': 'ण',
        'त': 'त', 'थ': 'थ', 'द': 'द', 'ध': 'ध', 'न': 'न',
        'प': 'प', 'फ': 'फ', 'ब': 'ब', 'भ': 'भ', 'म': 'म',
        'य': 'य', 'र': 'र', 'ल': 'ल', 'व': 'व',
        'श': 'श तालव्य', 'ष': 'ष मूर्धन्य', 'स': 'स दन्त्य', 'ह': 'ह',
        'क्ष': 'क्ष', 'त्र': 'त्र', 'ज्ञ': 'ज्ञ',
        'ा': 'आ की मात्रा', 'ि': 'छोटी इ की मात्रा', 'ी': 'बड़ी ई की मात्रा',
        'ु': 'छोटे उ की मात्रा', 'ू': 'बड़े उ की मात्रा', 'ृ': 'ऋ की मात्रा',
        'े': 'ए की मात्रा', 'ै': 'ऐ की मात्रा', 'ो': 'ओ की मात्रा', 'ौ': 'औ की मात्रा',
        'ं': 'अनुस्वार', 'ँ': 'चन्द्रबिन्दु', '्': 'हलन्त', 'ः': 'विसर्ग'
    }

    @classmethod
    def decompose_spelling(cls, name: str) -> List[Dict[str, str]]:
        """
        Decomposes a name into character units for interactive letter-by-letter review.
        """
        cleaned = (name or "").strip()
        chars = []
        for ch in cleaned:
            if ch.isspace():
                chars.append({"char": " ", "type": "space", "label": "स्पेस (Space)"})
            elif '\u0900' <= ch <= '\u097F':
                label = cls.DEVANAGARI_LETTER_NAMES.get(ch, ch)
                chars.append({"char": ch, "type": "devanagari", "label": label})
            else:
                chars.append({"char": ch.upper(), "type": "latin", "label": ch.upper()})
        return chars

    @classmethod
    def get_spaced_spelling(cls, name: str) -> str:
        """
        Returns spaced characters for accessible screen readers and visual letter badges.
        e.g., 'Meenakshi' -> 'M - E - E - N - A - K - S - H - I'
        """
        cleaned = (name or "").strip()
        if not cleaned:
            return ""
        # Separate words with double space, letters with dash
        words = cleaned.split()
        spaced_words = []
        for w in words:
            spaced_words.append(" - ".join(list(w.upper())))
        return "  |  ".join(spaced_words)

    @classmethod
    def detect_spelling_ambiguity(cls, name: str) -> Dict[str, Any]:
        """
        Determines whether a name has well-known official spelling variations.
        E.g. Spoken 'Minakshi' vs Official 'Meenakshi'.
        """
        norm = (name or "").strip().lower()
        variants = cls.PHONETIC_VARIANTS_MAP.get(norm, [])
        is_ambiguous = len(variants) > 1

        return {
            "name": name,
            "is_ambiguous": is_ambiguous,
            "known_official_variants": variants,
            "recommendation": (
                "DOCUMENT_OR_SPELLING_VERIFICATION_RECOMMENDED"
                if is_ambiguous else "STANDARD_CONFIRMATION"
            )
        }

    @classmethod
    def format_name_confirmation_dialogue(
        cls,
        name: str,
        language: str = "hi",
        slow: bool = False
    ) -> Dict[str, Any]:
        """
        Creates localized confirmation prompts, slow readback text, and spelling guide.
        Guarantees that the exact transcript is displayed and spoken back.
        """
        cleaned = (name or "").strip()
        spaced = cls.get_spaced_spelling(cleaned)
        ambiguity = cls.detect_spelling_ambiguity(cleaned)

        if language == "mr":
            prompt = f"माझ्या माहितीनुसार आपले नाव '{cleaned}' आहे. हे बरोबर आहे का?"
            audio_text = f"माझ्या माहितीनुसार आपले नाव {cleaned} आहे. हे बरोबर आहे का?"
            slow_audio = f"नाव: {cleaned}। स्पेलिंग: {spaced}।"
            spelling_instruction = f"अक्षरे तपासा: {spaced}। काही बदल करायचा असल्यास 'स्पेलिंग बदला' निवडा."
        elif language == "en":
            prompt = f"I understood your name is '{cleaned}'. Is this correct?"
            audio_text = f"I understood your name is {cleaned}. Is this correct?"
            slow_audio = f"Name: {cleaned}. Spelled as: {spaced}."
            spelling_instruction = f"Check characters: {spaced}. Click 'Edit spelling' if needed."
        else:
            prompt = f"मैंने समझा कि आपका नाम '{cleaned}' है। क्या यह सही है?"
            audio_text = f"मैंने समझा कि आपका नाम {cleaned} है। क्या यह सही है?"
            slow_audio = f"नाम: {cleaned}। स्पेलिंग: {spaced}।"
            spelling_instruction = f"अक्षर जांचें: {spaced}। यदि कोई त्रुटि है तो 'वर्तनी सुधारें' चुनें।"

        # Ambiguity warning if name has common document variations (e.g., Meenakshi vs Minakshi)
        ambiguity_warning = ""
        if ambiguity["is_ambiguous"]:
            var_list = ", ".join(ambiguity["known_official_variants"])
            if language == "mr":
                ambiguity_warning = f"टीप: या नावाचे शासकीय कागदपत्रांमध्ये विविध स्पेलिंग असू शकतात (उदा. {var_list}). कृपया आधार किंवा गुणपत्रिकेशी स्पेलिंग तपासा."
            elif language == "en":
                ambiguity_warning = f"Note: This name often has multiple official spellings ({var_list}). Please verify against your Aadhaar or certificate."
            else:
                ambiguity_warning = f"सूचना: इस नाम की सरकारी दस्तावेज़ों में अलग-अलग स्पेलिंग हो सकती है (उदा. {var_list})। कृपया आधार कार्ड से स्पेलिंग जांचें।"

        return {
            "name": cleaned,
            "display_prompt": prompt,
            "audio_text": audio_text,
            "slow_audio_text": slow_audio,
            "spaced_spelling": spaced,
            "spelling_chars": cls.decompose_spelling(cleaned),
            "is_ambiguous": ambiguity["is_ambiguous"],
            "known_variants": ambiguity["known_official_variants"],
            "ambiguity_warning": ambiguity_warning,
            "spelling_instruction": spelling_instruction,
            "controls": [
                {"id": "confirm_yes", "label_hi": "✓ हाँ, सही है", "label_mr": "✓ होय, बरोबर आहे", "action": "CONFIRM"},
                {"id": "confirm_no", "label_hi": "✗ नहीं, पुनः बोलें", "label_mr": "✗ नाही, पुन्हा सांगा", "action": "RETRY"},
                {"id": "confirm_slow", "label_hi": "🐢 धीरे सुनें", "label_mr": "🐢 हळू ऐका", "action": "REPEAT_SLOW"},
                {"id": "confirm_edit", "label_hi": "✏️ वर्तनी सुधारें", "label_mr": "✏️ स्पेलिंग बदला", "action": "EDIT_SPELLING"},
                {"id": "confirm_help", "label_hi": "🆘 ऑपरेटर सहायता", "label_mr": "🆘 ऑपरेटर मदत", "action": "REQUEST_HELP"}
            ]
        }

    @classmethod
    def mask_aadhaar_number(cls, text: str) -> str:
        """
        Masks 12-digit Aadhaar numbers for privacy compliance (DPDP Act 2023 & UIDAI circulars).
        Preserves only the last 4 digits (e.g. 'XXXX-XXXX-1234').
        """
        if not text:
            return ""

        # Pattern for 12 digits with or without spaces/dashes
        def mask_repl(match):
            digits = re.sub(r"\D", "", match.group(0))
            if len(digits) == 12:
                last_four = digits[-4:]
                return f"XXXX-XXXX-{last_four}"
            return match.group(0)

        # Match 12 consecutive digits or 4-4-4 grouped digits
        masked = re.sub(r"\b\d{4}[ -]?\d{4}[ -]?\d{4}\b", mask_repl, text)
        return masked

    @classmethod
    def compare_spoken_vs_document_name(
        cls,
        spoken_name: str,
        document_name: str,
        language: str = "hi"
    ) -> Dict[str, Any]:
        """
        Compares spoken name transcript against document OCR extracted name.
        Detects exact match, phonetic match with spelling variance (e.g. Minakshi vs Meenakshi),
        or complete mismatch.
        STRICT RULE: Never silently overwrite! Always presents citizen with clear choices.
        """
        s_spk = (spoken_name or "").strip()
        s_doc = (document_name or "").strip()

        norm_spk = " ".join(s_spk.lower().split())
        norm_doc = " ".join(s_doc.lower().split())

        if not norm_spk or not norm_doc:
            return {
                "status": "INSUFFICIENT_DATA",
                "is_match": False,
                "spoken_name": s_spk,
                "document_name": s_doc,
                "explanation": "एक किंवा दोन्ही नावे रिक्त आहेत." if language == "mr" else "एक या दोनों नाम रिक्त हैं।"
            }

        # 1. Exact match
        if norm_spk == norm_doc:
            return {
                "status": "EXACT_MATCH",
                "is_match": True,
                "chosen_name": s_doc,
                "spoken_name": s_spk,
                "document_name": s_doc,
                "explanation": (
                    f"कागदपत्रातील नाव '{s_doc}' आणि आपले बोललेले नाव पूर्णपणे जुळले आहे."
                    if language == "mr" else
                    f"दस्तावेज़ का नाम '{s_doc}' और आपका बोला गया नाम पूरी तरह मेल खाता है।"
                ),
                "spoken_message": (
                    f"कागदपत्र आणि आवाजातील नाव तंतोतंत जुळले: {s_doc}."
                    if language == "mr" else
                    f"दस्तावेज़ और आपकी आवाज़ का नाम पूरी तरह मेल खाता है: {s_doc}।"
                ),
                "suggested_action": "CONFIRM_MATCH"
            }

        # 2. Check known phonetic variants or Levenshtein distance
        from app.services.document_verifier import DocumentVerifier
        dist = DocumentVerifier._levenshtein_distance(norm_spk, norm_doc)
        sx_spk = DocumentVerifier._soundex(norm_spk)
        sx_doc = DocumentVerifier._soundex(norm_doc)

        variants_spk = cls.PHONETIC_VARIANTS_MAP.get(norm_spk, [])
        is_known_variant = norm_doc in [v.lower() for v in variants_spk]

        if is_known_variant or dist <= 2 or (sx_spk and sx_spk == sx_doc):
            # Phonetic match with spelling difference (e.g., Meenakshi vs Minakshi)
            if language == "mr":
                exp = f"उच्चार जुळतोय परंतु स्पेलिंगमध्ये फरक आढळला: कागदपत्रात '{s_doc}' आहे तर आपण '{s_spk}' उच्चारले."
                audio = f"लक्ष द्या: कागदपत्रात स्पेलिंग '{s_doc}' आहे आणि आपण '{s_spk}' उच्चारले. अधिकृत कागदपत्रावरील स्पेलिंग '{s_doc}' वापरायची का?"
            elif language == "en":
                exp = f"Phonetic match with spelling variance: Document has '{s_doc}', you spoke '{s_spk}'."
                audio = f"Notice: The document spelling is '{s_doc}' while you spoke '{s_spk}'. Would you like to use the official document spelling '{s_doc}'?"
            else:
                exp = f"उच्चारण मेल खा रहा है लेकिन स्पेलिंग में अंतर है: दस्तावेज़ में '{s_doc}' है जबकि आपने '{s_spk}' बोला।"
                audio = f"ध्यान दें: दस्तावेज़ में स्पेलिंग '{s_doc}' है और आपने '{s_spk}' कहा। क्या सरकारी दस्तावेज़ वाली स्पेलिंग '{s_doc}' उपयोग करें?"

            return {
                "status": "PHONETIC_SPELLING_MISMATCH",
                "is_match": False,
                "spoken_name": s_spk,
                "document_name": s_doc,
                "levenshtein_distance": dist,
                "is_known_variant": is_known_variant,
                "explanation": exp,
                "spoken_message": audio,
                "suggested_action": "CHOOSE_NAME_SPELLING",
                "options": [
                    {"id": "use_document", "value": s_doc, "label": f"दस्तावेज़ की स्पेलिंग ({s_doc})"},
                    {"id": "use_spoken", "value": s_spk, "label": f"बोली गई स्पेलिंग ({s_spk})"},
                    {"id": "edit_manual", "value": None, "label": "मैनुअल संपादन (Edit manually)"}
                ]
            }

        # 3. Complete mismatch
        if language == "mr":
            exp = f"नाव जुळत नाही: कागदपत्रात '{s_doc}' आहे आणि आपण '{s_spk}' सांगितले."
            audio = f"दस्तावेजातील नाव '{s_doc}' आणि आपले नाव '{s_spk}' जुळत नाही. कृपया कागदपत्र तपासा."
        elif language == "en":
            exp = f"Name mismatch: Document states '{s_doc}', spoken name is '{s_spk}'."
            audio = f"Discrepancy: Document name '{s_doc}' does not match spoken name '{s_spk}'. Please verify."
        else:
            exp = f"नाम मेल नहीं खा रहा: दस्तावेज़ में '{s_doc}' है और आपने '{s_spk}' बताया।"
            audio = f"दस्तावेज़ का नाम '{s_doc}' और आपका बोला गया नाम '{s_spk}' अलग है। कृपया जांचें।"

        return {
            "status": "NAME_MISMATCH",
            "is_match": False,
            "spoken_name": s_spk,
            "document_name": s_doc,
            "levenshtein_distance": dist,
            "explanation": exp,
            "spoken_message": audio,
            "suggested_action": "MANUAL_CORRECTION_REQUIRED",
            "options": [
                {"id": "use_document", "value": s_doc, "label": f"दस्तावेज़ का नाम ({s_doc})"},
                {"id": "use_spoken", "value": s_spk, "label": f"बोला गया नाम ({s_spk})"},
                {"id": "edit_manual", "value": None, "label": "पुनः दर्ज करें (Re-enter)"}
            ]
        }
