"""
Contextual Vocabulary & Gazetteers for High-Impact Public-Service Information (Prompt 7).
Provides:
  1. Gazetteers for Applicant Names, Father/Guardian Names, Districts, Villages, States, Services
  2. Domain-specific biasing prompts and hotwords for Speech-to-Text providers
  3. Deterministic formatting for Indian Currency (₹2,00,000) and Spaced Digits
  4. District and service canonical matching
"""

from __future__ import annotations
import re
from typing import Dict, Any, List, Optional, Tuple


class ContextualVocabularyService:
    """
    Supplies contextual vocabulary lists, dynamic ASR hotwords,
    and deterministic formatting for critical public service fields.
    """

    # Official Maharashtra Districts (36 districts) + Key MP/UP Districts
    MAHARASHTRA_DISTRICTS = [
        "Ahmednagar", "Ahilyanagar", "Akola", "Amravati", "Aurangabad", "Chhatrapati Sambhajinagar",
        "Beed", "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia",
        "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban",
        "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Dharashiv", "Palghar",
        "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg",
        "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"
    ]

    MP_UP_DISTRICTS = [
        "Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Rewa", "Satna",
        "Lucknow", "Kanpur", "Varanasi", "Prayagraj", "Agra", "Meerut", "Gorakhpur", "Bareilly"
    ]

    ALL_DISTRICTS = MAHARASHTRA_DISTRICTS + MP_UP_DISTRICTS

    # Target States
    INDIAN_STATES = [
        "Maharashtra", "Madhya Pradesh", "Uttar Pradesh", "Delhi", "Gujarat",
        "Rajasthan", "Bihar", "Karnataka", "Punjab", "Haryana"
    ]

    # Public Service & Certificate Names
    PUBLIC_SERVICES = [
        {"id": "income_certificate", "en": "Income Certificate", "hi": "आय प्रमाण पत्र", "mr": "उत्पन्नाचा दाखला"},
        {"id": "caste_certificate", "en": "Caste Certificate", "hi": "जाति प्रमाण पत्र", "mr": "जातीचे प्रमाणपत्र"},
        {"id": "domicile_certificate", "en": "Domicile Certificate", "hi": "मूल निवास प्रमाण पत्र", "mr": "रहिवासी दाखला"},
        {"id": "ration_card", "en": "Ration Card", "hi": "राशन कार्ड", "mr": "रेशन कार्ड"},
        {"id": "scholarship_app", "en": "Post-Matric Scholarship", "hi": "पोस्ट-मैट्रिक छात्रवृत्ति", "mr": "पोस्ट-मॅट्रिक शिष्यवृत्ती"}
    ]

    # Administrative Units
    ADMIN_TERMS = [
        "Gram Panchayat", "Tehsil", "Taluka", "Ward", "District", "Village", "Gaon", "Khed",
        "ग्रामपंचायत", "तालुका", "तहसील", "वार्ड", "जिल्हा", "गाव", "खेड"
    ]

    # Family Relations & Guardian Terminology
    GUARDIAN_MARKERS = [
        "pita", "father", "vadil", "pitaji", "father's name", "guardian", "palak", "aai", "mother",
        "पिता", "पिताजी", "वडील", "वडिलांचे नाव", "आई", "पालक", "अभिभावक"
    ]

    # Number Words & Digits
    DIGIT_VOCABULARY = [
        "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
        "shunya", "ek", "do", "teen", "chaar", "char", "paanch", "chhah", "che", "saat", "aath", "nau",
        "शून्य", "एक", "दोन", "दो", "तीन", "चार", "पाच", "पांच", "सहा", "छह", "सात", "आठ", "नऊ", "नौ"
    ]

    INCOME_VOCABULARY = [
        "annual income", "varshik aay", "varshik utpanna", "lakh", "lakhs", "hazaar", "thousand", "rupees", "inr",
        "वार्षिक आय", "वार्षिक उत्पन्न", "लाख", "हजार", "रुपये", "दोन लाख", "दो लाख", "दीड लाख", "अडीच लाख"
    ]

    @classmethod
    def get_context_prompt_for_field(cls, field_name: str, language: str = "hi") -> str:
        """
        Generates contextual conditioning prompt for speech recognition models (e.g. Whisper initial_prompt).
        """
        field_lower = field_name.lower()
        if "income" in field_lower:
            return (
                "Annual family income in Indian Rupees: 50,000, 1,00,000, 1,80,000, 2,00,000, "
                "two lakh, teen lakh, do lakh rupees, वार्षिक आय, वार्षिक उत्पन्न, दोन लाख, दोन लाख रुपये."
            )
        elif "mobile" in field_lower or "phone" in field_lower:
            return (
                "Ten digit Indian mobile phone number: 9876543210, 8976543210, 7896543210, 6789543210. "
                "शून्य, एक, दो, तीन, चार, पांच, छह, सात, आठ, नौ, दोन, सहा, नऊ."
            )
        elif "district" in field_lower:
            return "District names in Maharashtra and MP: Pune, Nagpur, Nashik, Bhopal, Indore, Amravati, Kolhapur, ठाणे, पुणे, नाशिक, नागपूर."
        elif "village" in field_lower:
            return "Village and gram panchayat names: Khed, Baramati, Shirur, Haveli, Taluka, Gram Panchayat, गाव, खेड."
        elif "guardian" in field_lower or "father" in field_lower:
            return "Father and guardian names: Pita ka naam, Vadilanche naav, Suresh Kumar, Ramesh Patil, वडिलांचे नाव, पिता का नाम."
        elif "name" in field_lower:
            return "Citizen applicant names in India: Ramesh Kumar, Sachin Patil, Rahul Deshmukh, Sunita Devi, रमेश कुमार, सचिन पाटील."
        elif "dob" in field_lower or "date" in field_lower:
            return "Calendar date of birth: 14 August 2004, 15/08/1998, 01/01/2000, चौदह अगस्त, जानेवारी, ऑगस्ट."
        elif "service" in field_lower or "certificate" in field_lower:
            return "Public service names: Income Certificate, Caste Certificate, Domicile Certificate, आय प्रमाण पत्र, उत्पन्नाचा दाखला."
        
        return "SEVA VAANI public service assistance: Hindi, Marathi, English, names, dates, phone numbers, annual income."

    @classmethod
    def get_hotwords_for_field(cls, field_name: str) -> List[str]:
        """
        Returns phrase boosting hotword list for Conformer or cloud speech providers.
        """
        field_lower = field_name.lower()
        if "income" in field_lower:
            return cls.INCOME_VOCABULARY
        elif "mobile" in field_lower:
            return cls.DIGIT_VOCABULARY
        elif "district" in field_lower:
            return cls.ALL_DISTRICTS
        elif "guardian" in field_lower or "father" in field_lower:
            return cls.GUARDIAN_MARKERS
        elif "service" in field_lower:
            return [s["en"] for s in cls.PUBLIC_SERVICES] + [s["hi"] for s in cls.PUBLIC_SERVICES] + [s["mr"] for s in cls.PUBLIC_SERVICES]
        return ["SEVA VAANI", "Income Certificate", "Ramesh Kumar"]

    @classmethod
    def format_indian_currency(cls, amount: int | float | str) -> str:
        """
        Deterministically formats an integer amount into Indian numbering system:
        200000 -> ₹2,00,000
        180000 -> ₹1,80,000
        2500000 -> ₹25,00,000
        """
        try:
            num = int(float(str(amount).replace(",", "").replace("₹", "").strip()))
        except (ValueError, TypeError):
            return f"₹{amount}"

        s = str(num)
        if len(s) <= 3:
            return f"₹{s}"

        # Indian grouping: last 3 digits, then pairs of 2 digits
        last_three = s[-3:]
        remaining = s[:-3]
        groups = []
        while len(remaining) > 2:
            groups.insert(0, remaining[-2:])
            remaining = remaining[:-2]
        if remaining:
            groups.insert(0, remaining)

        formatted_groups = ",".join(groups) + "," + last_three
        return f"₹{formatted_groups}"

    @classmethod
    def format_spaced_digits(cls, phone_str: str) -> str:
        """
        Formats a 10-digit phone number into grouped digits for clean speech readback:
        '9876543210' -> '9 8 7 6 5, 4 3 2 1 0'
        Display string: '98765 43210'
        """
        cleaned = re.sub(r"\D", "", str(phone_str))
        if len(cleaned) == 10:
            first_half = " ".join(list(cleaned[:5]))
            second_half = " ".join(list(cleaned[5:]))
            return f"{first_half}, {second_half}"
        return " ".join(list(cleaned))

    @classmethod
    def format_phone_display(cls, phone_str: str) -> str:
        """Formats 10-digit phone number into standard 5-5 display: 98765 43210."""
        cleaned = re.sub(r"\D", "", str(phone_str))
        if len(cleaned) == 10:
            return f"{cleaned[:5]} {cleaned[5:]}"
        return cleaned

    @classmethod
    def match_district(cls, text: str) -> Optional[str]:
        """Fuzzy and exact match against official district gazetteer."""
        norm = text.lower().strip()
        for dist in cls.ALL_DISTRICTS:
            if dist.lower() in norm:
                return dist
        # Marathi / Hindi spelling aliases
        alias_map = {
            "पुणे": "Pune", "नागपूर": "Nagpur", "नाशिक": "Nashik", "ठाणे": "Thane",
            "भोपाळ": "Bhopal", "भोपाल": "Bhopal", "इंदूर": "Indore", "इन्दौर": "Indore",
            "संभाजीनगर": "Chhatrapati Sambhajinagar", "औरंगाबाद": "Chhatrapati Sambhajinagar",
            "अमरावती": "Amravati", "कोल्हापूर": "Kolhapur", "सोलापूर": "Solapur",
            "सातारा": "Satara", "सांगली": "Sangli", "लातूर": "Latur", "नांदेड": "Nanded"
        }
        for alias, canonical in alias_map.items():
            if alias in norm:
                return canonical
        return None

    @classmethod
    def match_service_name(cls, text: str) -> Optional[Dict[str, str]]:
        """Matches user phrasing to known official public services."""
        norm = text.lower().strip()
        if any(p in norm for p in ["income", "aay", "utpanna", "आय", "उत्पन्न"]):
            return {"service_id": "income_certificate", "canonical_name": "Income Certificate"}
        if any(p in norm for p in ["caste", "jati", "जाति", "जात"]):
            return {"service_id": "caste_certificate", "canonical_name": "Caste Certificate"}
        if any(p in norm for p in ["domicile", "niwas", "nivasi", "रहिवासी", "निवास"]):
            return {"service_id": "domicile_certificate", "canonical_name": "Domicile Certificate"}
        if any(p in norm for p in ["ration", "rashan", "राशन", "रेशन"]):
            return {"service_id": "ration_card", "canonical_name": "Ration Card"}
        if any(p in norm for p in ["scholarship", "chhatravritti", "shishyavrutti", "छात्रवृत्ति", "शिष्यवृत्ती"]):
            return {"service_id": "scholarship_app", "canonical_name": "Post-Matric Scholarship"}
        return None
