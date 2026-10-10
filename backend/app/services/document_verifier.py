"""
SEVA VAANI - Document-Agnostic Verification & Discrepancy Analysis Service
Complies with Indian public service standards, DPDP Act 2023, and accessibility guidelines.

Features:
1. Document Agnostic: Supports education marksheet, income certificate, caste certificate,
   domicile certificate, bank passbook, birth certificate, and general identity cards.
2. Scheme Document Eligibility Rules: Rejects invalid documents (e.g., PAN/Aadhaar for income,
   Voter ID for caste) with clear citizen explanations.
3. Provenance Tracking: Preserves whether value is user_spoken, user_typed, document_extracted,
   or independently_verified.
4. Discrepancy Comparator: Phonetic & Levenshtein matching with localized spoken read-back
   in Hindi and Marathi for low-literacy citizens.
5. Ephemeral In-Memory Processing: ZERO raw document images stored on disk or in SQLite.
"""

from __future__ import annotations
import re
from typing import Dict, Any, List, Optional, Tuple


class DocumentVerifier:
    """Document-Agnostic Verification and Cross-Check Engine."""

    # Supported Document Types
    DOC_TYPES = {
        "education_marksheet": {
            "title_en": "10th/12th SSC/HSC Marksheet & Certificate",
            "title_hi": "10वीं/12वीं अंकतालिका व प्रमाण पत्र (मार्कशीट)",
            "title_mr": "१०वी/१२वी गुणपत्रिका व प्रमाणपत्र (मार्कशीट)",
            "is_student_gold_standard": True,
        },
        "income_certificate": {
            "title_en": "Revenue / Tahsildar Income Certificate",
            "title_hi": "तहसीलदार/राजस्व आय प्रमाण पत्र",
            "title_mr": "तहसीलदार/महसूल उत्पन्नाचा दाखला",
            "is_student_gold_standard": False,
        },
        "caste_certificate": {
            "title_en": "Caste / Category Certificate (SC/ST/OBC/EWS)",
            "title_hi": "जाति प्रमाण पत्र (SC/ST/OBC/EWS)",
            "title_mr": "जात प्रमाणपत्र / संवर्ग प्रमाणपत्र",
            "is_student_gold_standard": False,
        },
        "domicile_certificate": {
            "title_en": "Domicile / Residence Certificate",
            "title_hi": "मूल निवास / अधिवास प्रमाण पत्र",
            "title_mr": "अधिवास / रहिवासी प्रमाणपत्र",
            "is_student_gold_standard": False,
        },
        "bank_passbook": {
            "title_en": "Bank Passbook First Page / Cancelled Cheque",
            "title_hi": "बैंक पासबुक प्रथम पृष्ठ / निरस्त चेक",
            "title_mr": "बँक पासबुक पहिले पान / रद्द केलेला धनादेश",
            "is_student_gold_standard": False,
        },
        "birth_certificate": {
            "title_en": "Birth Certificate (Municipal / Gram Panchayat)",
            "title_hi": "जन्म प्रमाण पत्र (नगर पालिका / ग्राम पंचायत)",
            "title_mr": "जन्म प्रमाणपत्र (नगरपालिका / ग्रामपंचायत)",
            "is_student_gold_standard": False,
        },
        "identity_card": {
            "title_en": "Identity Card (Voter ID, PAN Card, Aadhaar)",
            "title_hi": "पहचान पत्र (मतदाता पहचान पत्र, पैन कार्ड, आधार)",
            "title_mr": "ओळखपत्र (मतदार ओळखपत्र, पॅन कार्ड, आधार)",
            "is_student_gold_standard": False,
        },
    }

    # Scheme Eligibility Matrix: Which documents can verify which fields
    SCHEME_FIELD_ELIGIBILITY = {
        "annual_income": {
            "allowed_docs": ["income_certificate"],
            "rejected_reason_hi": "वार्षिक आय के सत्यापन के लिए केवल तहसीलदार या राजस्व विभाग का आय प्रमाण पत्र मान्य है। पैन या आधार कार्ड आय का वैध प्रमाण नहीं है।",
            "rejected_reason_mr": "वार्षिक उत्पन्नाच्या पडताळणीसाठी फक्त तहसीलदार किंवा महसूल विभागाचा उत्पन्नाचा दाखला ग्राह्य धरला जातो. पॅन किंवा आधार कार्ड उत्पन्नाचा पुरावा नाही.",
            "rejected_reason_en": "Only a Tahsildar or Revenue Income Certificate is legally valid for annual income verification. PAN or Aadhaar cannot verify income.",
        },
        "caste_category": {
            "allowed_docs": ["caste_certificate"],
            "rejected_reason_hi": "जाति या श्रेणी सत्यापन के लिए केवल सक्षम प्राधिकारी द्वारा जारी जाति प्रमाण पत्र मान्य है। पहचान पत्र से जाति प्रमाणित नहीं हो सकती।",
            "rejected_reason_mr": "जात किंवा संवर्ग पडताळणीसाठी केवळ सक्षम अधिकाऱ्याचे जात प्रमाणपत्र ग्राह्य आहे. साध्या ओळखपत्राने जात सिद्ध होत नाही.",
            "rejected_reason_en": "Only an official Caste / Category Certificate is acceptable for caste category verification.",
        },
        "caste": {
            "allowed_docs": ["caste_certificate"],
            "rejected_reason_hi": "जाति सत्यापन के लिए केवल सक्षम प्राधिकारी द्वारा जारी जाति प्रमाण पत्र मान्य है।",
            "rejected_reason_mr": "जात पडताळणीसाठी केवळ सक्षम अधिकाऱ्याचे जात प्रमाणपत्र ग्राह्य आहे.",
            "rejected_reason_en": "Only an official Caste Certificate is acceptable.",
        },
        "account_number": {
            "allowed_docs": ["bank_passbook"],
            "rejected_reason_hi": "बैंक खाता संख्या के लिए केवल बैंक पासबुक का पहला पन्ना या कैंसिल्ड चेक मान्य है।",
            "rejected_reason_mr": "बँक खाते क्रमांकासाठी फक्त पासबुकचे पहिले पान किंवा रद्द केलेला धनादेश ग्राह्य आहे.",
            "rejected_reason_en": "Only a Bank Passbook or cancelled cheque is valid for bank account verification.",
        },
        "ifsc_code": {
            "allowed_docs": ["bank_passbook"],
            "rejected_reason_hi": "IFSC कोड के लिए केवल बैंक पासबुक या चेक मान्य है।",
            "rejected_reason_mr": "IFSC कोडसाठी फक्त बँक पासबुक किंवा धनादेश ग्राह्य आहे.",
            "rejected_reason_en": "Only a Bank Passbook is valid for IFSC code verification.",
        },
        "applicant_name": {
            "allowed_docs": [
                "education_marksheet",
                "income_certificate",
                "caste_certificate",
                "domicile_certificate",
                "bank_passbook",
                "birth_certificate",
                "identity_card",
            ],
            "rejected_reason_hi": "नाम सत्यापन के लिए कोई भी सरकारी दस्तावेज मान्य है।",
            "rejected_reason_mr": "नाव पडताळणीसाठी कोणतेही अधिकृत शासकीय कागदपत्र ग्राह्य आहे.",
            "rejected_reason_en": "Any government-issued document is permitted for name verification.",
        },
        "date_of_birth": {
            "allowed_docs": [
                "birth_certificate",
                "education_marksheet",
                "identity_card",
            ],
            "rejected_reason_hi": "जन्म तिथि के लिए जन्म प्रमाण पत्र, 10वीं की अंकतालिका या पहचान पत्र मान्य है।",
            "rejected_reason_mr": "जन्मतारखेसाठी जन्म प्रमाणपत्र, १०वी गुणपत्रिका किंवा ओळखपत्र ग्राह्य आहे.",
            "rejected_reason_en": "Birth certificate, marksheet, or ID card is required for date of birth verification.",
        },
    }

    @classmethod
    def check_document_eligibility(
        cls, field_name: str, doc_type: str, lang: str = "hi"
    ) -> Tuple[bool, str]:
        """Validates if the submitted document type is legally eligible to verify the requested field."""
        rule = cls.SCHEME_FIELD_ELIGIBILITY.get(field_name)
        if not rule:
            # Field has no strict restriction
            return True, ""

        allowed = rule["allowed_docs"]
        if doc_type in allowed:
            return True, ""

        reason_key = f"rejected_reason_{lang}" if lang in ("hi", "mr", "en") else "rejected_reason_hi"
        return False, rule.get(reason_key, rule["rejected_reason_en"])

    @classmethod
    def extract_fields_from_document_text(
        cls, doc_type: str, text: str
    ) -> Dict[str, Any]:
        """
        Parses OCR text or synthetic document payload in memory.
        Zero images are retained or written to disk.
        """
        extracted: Dict[str, Any] = {}
        if not text:
            return extracted

        clean_text = " ".join(text.split())

        # 1. Names
        # Look for explicit name patterns
        name_match = re.search(
            r"(?:Name|Student Name|Applicant Name|Candidate Name|नाम|नाव)[\s\:\-]+([A-Za-z\s\.\u0900-\u097F]{3,40})",
            clean_text,
            re.IGNORECASE,
        )
        if name_match:
            candidate_name = name_match.group(1).strip()
            # Clean up trailing label words
            candidate_name = re.split(
                r"\b(Father|Mother|DOB|Date|Roll|Income|Annual|Caste|UID|Aadhaar|Certificate|Seat|Year|Category|No)\b",
                candidate_name,
                flags=re.IGNORECASE,
            )[0].strip()
            if len(candidate_name) >= 3:
                extracted["applicant_name"] = candidate_name

        # 2. Date of Birth
        dob_match = re.search(
            r"(?:DOB|Date of Birth|जन्म तिथि|जन्मतारीख)[\s\:\-]+([0-3]?[0-9][\/\-\.][0-1]?[0-9][\/\-\.][1-2][0-9]{3})",
            clean_text,
            re.IGNORECASE,
        )
        if dob_match:
            extracted["date_of_birth"] = dob_match.group(1).strip()

        # 3. Income Certificate specific fields
        if doc_type == "income_certificate":
            inc_match = re.search(
                r"(?:Income|Annual Income|वार्षिक आय|उत्पन्न)[\s\:\-₹Rs\.]*([0-9]{1,3}(?:,[0-9]{2,3})*(?:[0-9]{3})?|[0-9]{4,8})",
                clean_text,
                re.IGNORECASE,
            )
            if inc_match:
                raw_inc = inc_match.group(1).replace(",", "").strip()
                extracted["annual_income"] = raw_inc

            cert_match = re.search(
                r"(?:Certificate No|प्रमाण पत्र संख्या|दाखला क्र)[\s\:\-]+([A-Z0-9\/\-]{5,30})",
                clean_text,
                re.IGNORECASE,
            )
            if cert_match:
                extracted["certificate_number"] = cert_match.group(1).strip()

        # 4. Caste Certificate specific fields
        elif doc_type == "caste_certificate":
            caste_match = re.search(
                r"(?:Caste|Category|जाति|प्रवर्ग|जात)[\s\:\-]+([A-Za-z\u0900-\u097F\s]{2,25})",
                clean_text,
                re.IGNORECASE,
            )
            if caste_match:
                cat = caste_match.group(1).strip()
                cat_upper = cat.upper()
                if any(x in cat_upper for x in ["OBC", "SC", "ST", "EWS", "GENERAL", "OPEN"]):
                    for token in ["OBC", "SC", "ST", "EWS", "GENERAL", "OPEN"]:
                        if token in cat_upper:
                            extracted["caste_category"] = token
                            break
                else:
                    extracted["caste_category"] = cat

            cert_match = re.search(
                r"(?:Certificate No|प्रमाण पत्र क्र|दाखला क्र)[\s\:\-]+([A-Z0-9\/\-]{5,30})",
                clean_text,
                re.IGNORECASE,
            )
            if cert_match:
                extracted["certificate_number"] = cert_match.group(1).strip()

        # 5. Education Marksheet specific fields
        elif doc_type == "education_marksheet":
            roll_match = re.search(
                r"(?:Roll No|Seat No|अनुक्रमांक|बैठक क्र)[\s\:\-]+([A-Z0-9]{4,15})",
                clean_text,
                re.IGNORECASE,
            )
            if roll_match:
                extracted["roll_number"] = roll_match.group(1).strip()

            passing_match = re.search(
                r"(?:Year|Passing Year|उत्तीर्ण वर्ष)[\s\:\-]+(20[0-2][0-9]|19[89][0-9])",
                clean_text,
                re.IGNORECASE,
            )
            if passing_match:
                extracted["passing_year"] = passing_match.group(1).strip()

        # 6. Bank Passbook specific fields
        elif doc_type == "bank_passbook":
            ac_match = re.search(
                r"(?:A\/C No|Account No|खाता संख्या|खाते क्र)[\s\:\-]+([0-9]{9,18})",
                clean_text,
                re.IGNORECASE,
            )
            if ac_match:
                extracted["account_number"] = ac_match.group(1).strip()

            ifsc_match = re.search(
                r"(?:IFSC|IFS Code|आईएफएससी)[\s\:\-]+([A-Z]{4}0[A-Z0-9]{6})",
                clean_text,
                re.IGNORECASE,
            )
            if ifsc_match:
                extracted["ifsc_code"] = ifsc_match.group(1).strip()

        # 7. Identity Card (Aadhaar, PAN, Voter ID)
        elif doc_type == "identity_card":
            # PAN
            pan_match = re.search(r"\b([A-Z]{5}[0-9]{4}[A-Z])\b", clean_text)
            if pan_match:
                extracted["pan_number"] = pan_match.group(1)

            # Voter ID (EPIC)
            voter_match = re.search(r"\b([A-Z]{3}[0-9]{7})\b", clean_text)
            if voter_match:
                extracted["voter_id"] = voter_match.group(1)

            # Aadhaar masked (last 4 digits only for privacy)
            aadhaar_match = re.search(r"\b(?:[0-9]{4}\s[0-9]{4}\s([0-9]{4})|X{8}([0-9]{4}))\b", clean_text)
            if aadhaar_match:
                last_four = aadhaar_match.group(1) or aadhaar_match.group(2)
                extracted["aadhaar_last_four"] = last_four

        # 8. Domicile
        elif doc_type == "domicile_certificate":
            state_match = re.search(
                r"(?:State|राज्य)[\s\:\-]+([A-Za-z\u0900-\u097F\s]{3,20})",
                clean_text,
                re.IGNORECASE,
            )
            if state_match:
                extracted["state"] = state_match.group(1).strip()

        return extracted

    @staticmethod
    def _levenshtein_distance(s1: str, s2: str) -> int:
        """Calculates character edit distance between two strings."""
        if len(s1) < len(s2):
            return DocumentVerifier._levenshtein_distance(s2, s1)
        if len(s2) == 0:
            return len(s1)

        previous_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row

        return previous_row[-1]

    @staticmethod
    def _soundex(name: str) -> str:
        """Simplified Soundex for transliteration matching of Indian names."""
        name = re.sub(r"[^A-Za-z]", "", name.upper())
        if not name:
            return ""

        soundex_map = {
            "B": "1", "F": "1", "P": "1", "V": "1",
            "C": "2", "G": "2", "J": "2", "K": "2", "Q": "2", "S": "2", "X": "2", "Z": "2",
            "D": "3", "T": "3",
            "L": "4",
            "M": "5", "N": "5",
            "R": "6",
        }

        first_char = name[0]
        tail = name[1:]

        encoded = ""
        prev = soundex_map.get(first_char, "")
        for char in tail:
            code = soundex_map.get(char, "")
            if code and code != prev:
                encoded += code
                prev = code

        return (first_char + encoded + "000")[:4]

    @classmethod
    def compare_field_value(
        cls,
        field_name: str,
        doc_type: str,
        doc_value: Any,
        spoken_value: Any,
        lang: str = "hi",
        service_id: str = "scholarship",
    ) -> Dict[str, Any]:
        """
        Compares document value with citizen spoken value.
        Preserves provenance: user_spoken, user_typed, document_extracted, independently_verified.
        Detects exact match, phonetic match, or mismatch.
        Generates spoken audio messages in Hindi / Marathi so low-literacy users can hear differences.
        """
        s_doc = str(doc_value or "").strip()
        s_spk = str(spoken_value or "").strip()

        # Check document eligibility first
        eligible, inelig_reason = cls.check_document_eligibility(field_name, doc_type, lang)
        if not eligible:
            return {
                "field_name": field_name,
                "status": "INELIGIBLE_DOCUMENT",
                "is_match": False,
                "document_value": s_doc,
                "spoken_value": s_spk,
                "document_type": doc_type,
                "provenance": {
                    "document_value_source": "document_extracted",
                    "spoken_value_source": "user_spoken",
                    "eligibility_verified": False,
                },
                "explanation_text": inelig_reason,
                "spoken_message": inelig_reason,
                "suggested_action": "PROVIDE_ELIGIBLE_DOCUMENT",
            }

        # Exact match check
        norm_doc = " ".join(s_doc.lower().split())
        norm_spk = " ".join(s_spk.lower().split())

        # Numeric field comparison (e.g. income or account number)
        if field_name in ("annual_income", "account_number"):
            num_doc = re.sub(r"[^\d]", "", norm_doc)
            num_spk = re.sub(r"[^\d]", "", norm_spk)
            if num_doc and num_spk and num_doc == num_spk:
                match_status = "EXACT_MATCH"
            else:
                match_status = "MISMATCH"
        elif norm_doc == norm_spk:
            match_status = "EXACT_MATCH"
        else:
            # Name or textual field comparison
            dist = cls._levenshtein_distance(norm_doc, norm_spk)
            sx_doc = cls._soundex(norm_doc)
            sx_spk = cls._soundex(norm_spk)

            if dist <= 2 or (sx_doc and sx_doc == sx_spk):
                match_status = "PHONETIC_MATCH"
            else:
                match_status = "MISMATCH"

        # Check if 10th marksheet legal gold standard applies for scholarship
        is_gold_standard = (
            service_id in ("scholarship", "scholarship_application")
            and doc_type == "education_marksheet"
            and field_name == "applicant_name"
        )

        # Generate bilingual spoken audio messages
        spoken_msg = ""
        explanation = ""
        action = "KEEP_EXISTING"

        if match_status == "EXACT_MATCH":
            action = "CONFIRM_MATCH"
            if lang == "mr":
                explanation = f"कागदपत्रातील मूल्य '{s_doc}' आणि आपले उत्तर जुळले आहे."
                spoken_msg = f"आपले उत्तर कागदपत्राशी तंतोतंत जुळले आहे: {s_doc}."
            elif lang == "hi":
                explanation = f"दस्तावेज़ का मान '{s_doc}' और आपका उत्तर बिल्कुल सही मेल खा रहा है।"
                spoken_msg = f"दस्तावेज़ और आपकी आवाज़ का मान पूरी तरह मेल खाता है: {s_doc}।"
            else:
                explanation = f"Document value '{s_doc}' exactly matches your answer."
                spoken_msg = f"Document value '{s_doc}' perfectly matches your spoken response."

        elif match_status == "PHONETIC_MATCH":
            action = "ASK_SPELLING_CONFIRMATION"
            if is_gold_standard:
                if lang == "mr":
                    explanation = f"उच्चार जुळतोय परंतु स्पेलिंगमध्ये फरक आहे. शिष्यवृत्ती नियमानुसार १०वी गुणपत्रिकेवरील नाव '{s_doc}' ग्राह्य धरले जाईल."
                    spoken_msg = f"आपण उच्चारलेले नाव आणि कागदपत्रातील स्पेलिंगमध्ये किंचित फरक आहे. १०वी गुणपत्रिकेनुसार नाव '{s_doc}' ठेवायचे का?"
                elif lang == "hi":
                    explanation = f"उच्चारण मेल खा रहा है लेकिन स्पेलिंग में अंतर है। छात्रवृत्ति नियमानुसार 10वीं मार्कशीट का नाम '{s_doc}' मान्य होगा।"
                    spoken_msg = f"आपके बोले गए नाम और दस्तावेज़ में थोड़ा अंतर है। 10वीं मार्कशीट के अनुसार नाम '{s_doc}' रखना है? हाँ या नहीं बोलें।"
                else:
                    explanation = f"Phonetic match with minor spelling variation. 10th marksheet name '{s_doc}' is the benchmark."
                    spoken_msg = f"There is a minor spelling difference. Would you like to use the marksheet spelling: '{s_doc}'?"
            else:
                if lang == "mr":
                    explanation = f"उच्चार जुळतोय परंतु कागदपत्रात '{s_doc}' असे लिहिले आहे आणि आपण '{s_spk}' उच्चारले."
                    spoken_msg = f"कागदपत्रात स्पेलिंग '{s_doc}' आहे. हे बरोबर आहे का?"
                elif lang == "hi":
                    explanation = f"उच्चारण मेल खा रहा है, दस्तावेज़ में '{s_doc}' लिखा है और आपने '{s_spk}' बोला।"
                    spoken_msg = f"दस्तावेज़ में स्पेलिंग '{s_doc}' लिखी है। क्या आप इसे रखना चाहते हैं?"
                else:
                    explanation = f"Phonetic match: Document says '{s_doc}', you spoke '{s_spk}'."
                    spoken_msg = f"The document has spelling '{s_doc}'. Should we use this?"

        else:  # MISMATCH
            action = "ASK_CITIZEN_CHOICE"
            if field_name == "annual_income":
                if lang == "mr":
                    explanation = f"उत्पन्नात तफावत: आपण ₹{s_spk} सांगितले, परंतु उत्पन्नाच्या दाखल्यावर ₹{s_doc} नोंदवले आहे."
                    spoken_msg = f"लक्ष द्या! आपण ₹{s_spk} सांगितले होते, पण उत्पन्नाच्या दाखल्यावर ₹{s_doc} आहे. अधिकृत दाखल्यावरील ₹{s_doc} नोंदवायचे का?"
                elif lang == "hi":
                    explanation = f"आय में अंतर: आपने ₹{s_spk} बोला, लेकिन आय प्रमाण पत्र पर ₹{s_doc} दर्ज है।"
                    spoken_msg = f"ध्यान दें! आपने ₹{s_spk} बताया था, लेकिन प्रमाण पत्र में ₹{s_doc} लिखा है। क्या प्रमाण पत्र वाली राशि ₹{s_doc} दर्ज करें?"
                else:
                    explanation = f"Income mismatch: Spoken ₹{s_spk} vs Document ₹{s_doc}."
                    spoken_msg = f"Discrepancy detected: You spoke ₹{s_spk}, but the certificate states ₹{s_doc}. Use certificate amount?"
            else:
                if lang == "mr":
                    explanation = f"फरक आढळला: आपण '{s_spk}' सांगितले, कागदपत्रात '{s_doc}' आहे."
                    spoken_msg = f"कागदपत्रात '{s_doc}' आहे आणि आपण '{s_spk}' सांगितले. आपल्याला कोणते नाव ठेवायचे आहे?"
                elif lang == "hi":
                    explanation = f"अंतर पाया गया: आपने '{s_spk}' बताया, लेकिन दस्तावेज़ में '{s_doc}' है।"
                    spoken_msg = f"दस्तावेज़ में '{s_doc}' लिखा है जबकि आपने '{s_spk}' कहा। क्या आप दस्तावेज़ वाला मान उपयोग करना चाहते हैं?"
                else:
                    explanation = f"Mismatch: Spoken '{s_spk}' vs Document '{s_doc}'."
                    spoken_msg = f"Discrepancy: The document says '{s_doc}' while you said '{s_spk}'. Which one would you like to keep?"

        return {
            "field_name": field_name,
            "status": match_status,
            "is_match": match_status == "EXACT_MATCH",
            "document_value": s_doc,
            "spoken_value": s_spk,
            "document_type": doc_type,
            "is_gold_standard": is_gold_standard,
            "provenance": {
                "document_value_source": "document_extracted",
                "spoken_value_source": "user_spoken",
                "eligibility_verified": True,
                "gold_standard_applied": is_gold_standard,
            },
            "explanation_text": explanation,
            "spoken_message": spoken_msg,
            "suggested_action": action,
        }

    @classmethod
    def verify_document_payload(
        cls,
        doc_type: str,
        text_content: Optional[str] = None,
        target_fields: Optional[Dict[str, Any]] = None,
        lang: str = "hi",
        service_id: str = "scholarship",
        consent_granted: bool = True,
    ) -> Dict[str, Any]:
        """
        Primary verification pipeline:
        1. Checks citizen informed consent. Refuses processing if not granted.
        2. Masks any 12-digit Aadhaar numbers immediately from text buffers.
        3. Validates document type.
        4. Ingests and extracts fields from memory-only text buffer.
        5. Zero retention: raw input memory discarded immediately.
        6. Cross-checks against provided target fields (spoken / active form fields).
        7. Computes discrepancies and produces localized voice guidance.
        """
        if not consent_granted:
            return {
                "success": False,
                "error": "DOCUMENT_CONSENT_REFUSED",
                "message": (
                    "कागदपत्र तपासणीसाठी नागरिकाची संमती आवश्यक आहे."
                    if lang == "mr"
                    else "दस्तावेज़ सत्यापन के लिए नागरिक की सहमति आवश्यक है।"
                ),
                "discrepancies": [],
                "raw_storage_guarantee": "ZERO_STORAGE_MEMORY_ONLY_EPHEMERAL"
            }

        if doc_type not in cls.DOC_TYPES:
            return {
                "success": False,
                "error": f"Unsupported document type: '{doc_type}'.",
                "supported_types": list(cls.DOC_TYPES.keys()),
            }

        # Apply Aadhaar masking to scrub raw 12-digit identification numbers
        from app.services.name_pronunciation import NamePronunciationService
        safe_text = NamePronunciationService.mask_aadhaar_number(text_content or "")
        extracted_fields = cls.extract_fields_from_document_text(doc_type, safe_text)

        discrepancies: List[Dict[str, Any]] = []
        field_comparisons: Dict[str, Any] = {}

        targets = target_fields or {}
        for f_name, spoken_val in targets.items():
            if f_name in extracted_fields:
                doc_val = extracted_fields[f_name]
                comp = cls.compare_field_value(
                    field_name=f_name,
                    doc_type=doc_type,
                    doc_value=doc_val,
                    spoken_value=spoken_val,
                    lang=lang,
                    service_id=service_id,
                )
                field_comparisons[f_name] = comp
                if comp["status"] in ("MISMATCH", "PHONETIC_MATCH", "INELIGIBLE_DOCUMENT"):
                    discrepancies.append(comp)

        # Check for scheme eligibility violations if target field is requested with an ineligible document
        for f_name in targets.keys():
            if f_name not in extracted_fields:
                eligible, inelig_reason = cls.check_document_eligibility(f_name, doc_type, lang)
                if not eligible:
                    comp = {
                        "field_name": f_name,
                        "status": "INELIGIBLE_DOCUMENT",
                        "is_match": False,
                        "document_value": None,
                        "spoken_value": str(targets.get(f_name, "")),
                        "document_type": doc_type,
                        "explanation_text": inelig_reason,
                        "spoken_message": inelig_reason,
                        "suggested_action": "PROVIDE_ELIGIBLE_DOCUMENT",
                        "provenance": {
                            "document_value_source": "document_extracted",
                            "spoken_value_source": "user_spoken",
                            "eligibility_verified": False,
                        },
                    }
                    field_comparisons[f_name] = comp
                    discrepancies.append(comp)

        return {
            "success": True,
            "document_type": doc_type,
            "document_meta": cls.DOC_TYPES[doc_type],
            "extracted_fields": extracted_fields,
            "field_comparisons": field_comparisons,
            "discrepancies": discrepancies,
            "has_discrepancy": len(discrepancies) > 0,
            "raw_storage_guarantee": "ZERO_STORAGE_MEMORY_ONLY_EPHEMERAL",
        }
