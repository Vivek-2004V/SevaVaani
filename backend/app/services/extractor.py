import re
from typing import Dict, Any, Optional, Tuple

class ExtractorService:
    """
    Deterministic & rule-augmented NLU extractor.
    Extracts structured candidate data from natural speech in Hindi / Marathi / Hinglish / English.
    Assigns extraction confidence.
    """

    HINDI_DIGITS = {
        '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
        '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
    }

    HINDI_WORD_TO_DIGIT = {
        'shunya': '0', 'zero': '0', 'शून्य': '0',
        'ek': '1', 'एक': '1', 'one': '1',
        'do': '2', 'दो': '2', 'दोन': '2', 'two': '2',
        'teen': '3', 'तीन': '3', 'three': '3',
        'char': '4', 'chaar': '4', 'चार': '4', 'four': '4',
        'paanch': '5', 'panch': '5', 'पांच': '5', 'पाच': '5', 'five': '5',
        'chhah': '6', 'che': '6', 'छह': '6', 'सहा': '6', 'six': '6',
        'saat': '7', 'सात': '7', 'seven': '7',
        'aath': '8', 'आठ': '8', 'eight': '8',
        'nau': '9', 'नौ': '9', 'नऊ': '9', 'nine': '9'
    }

    MONTH_MAP = {
        'january': '01', 'jan': '01', 'जनवरी': '01', 'जानेवारी': '01',
        'february': '02', 'feb': '02', 'फरवरी': '02', 'फेब्रुवारी': '02',
        'march': '03', 'mar': '03', 'मार्च': '03',
        'april': '04', 'apr': '04', 'अप्रैल': '04', 'एप्रिल': '04',
        'may': '05', 'मई': '05', 'मे': '05',
        'june': '06', 'jun': '06', 'जून': '06',
        'july': '07', 'jul': '07', 'जुलाई': '07', 'जुलै': '07',
        'august': '08', 'aug': '08', 'अगस्त': '08', 'ऑगस्ट': '08',
        'september': '09', 'sep': '09', 'सितंबर': '09', 'सप्टेंबर': '09',
        'october': '10', 'oct': '10', 'अक्टूबर': '10', 'ऑक्टोबर': '10',
        'november': '11', 'nov': '11', 'नवंबर': '11', 'नोव्हेंबर': '11',
        'december': '12', 'dec': '12', 'दिसंबर': '12', 'डिसेंबर': '12'
    }

    @classmethod
    def clean_devnagari_digits(cls, text: str) -> str:
        for k, v in cls.HINDI_DIGITS.items():
            text = text.replace(k, v)
        return text

    @classmethod
    def normalize_numbers_in_transcript(cls, text: str) -> str:
        text = cls.clean_devnagari_digits(text)
        words = text.split()
        normalized = []
        for w in words:
            w_lower = w.lower().strip(',.')
            if w_lower in cls.HINDI_WORD_TO_DIGIT:
                normalized.append(cls.HINDI_WORD_TO_DIGIT[w_lower])
            else:
                normalized.append(w)
        return " ".join(normalized)

    @classmethod
    def extract_field(cls, field_name: str, transcript: str, language: str = "hi") -> Dict[str, Any]:
        transcript = (transcript or "").strip()
        
        # Guard for completely empty or unclear/gibberish utterance
        if not transcript or len(transcript.split()) == 0:
            return {
                "field": field_name,
                "value": None,
                "confidence": 0.0,
                "needs_clarification": False,
                "raw_transcript": transcript
            }

        # Check for unclear or noise indicators (TC07)
        unclear_indicators = ["...", "???", "[unclear]", "अस्पष्ट", "समजले नाही", "kuch nahi", "hmm", "umm", "xyz"]
        if transcript.lower() in [u.lower() for u in unclear_indicators] or (len(transcript) < 2 and not transcript.isdigit()):
            return {
                "field": field_name,
                "value": None,
                "confidence": 0.2,
                "needs_clarification": False,
                "raw_transcript": transcript
            }

        text = cls.clean_devnagari_digits(transcript)

        if field_name == "full_name":
            return cls._extract_name(text, language)
        elif field_name == "dob":
            return cls._extract_dob(text, language)
        elif field_name == "mobile":
            return cls._extract_mobile(text, language)
        elif field_name == "college":
            return cls._extract_college(text, language)
        elif field_name == "course":
            return cls._extract_course(text, language)
        elif field_name == "academic_year":
            return cls._extract_academic_year(text, language)
        elif field_name == "annual_income":
            return cls._extract_annual_income(text, language)
        elif field_name == "category":
            return cls._extract_category(text, language)
        elif field_name == "district":
            return cls._extract_district(text, language)
        elif field_name == "document_status":
            return cls._extract_document_status(text, language)
        
        # Generic fallback
        return {
            "field": field_name,
            "value": transcript,
            "confidence": 0.8,
            "needs_clarification": False,
            "raw_transcript": transcript
        }

    @classmethod
    def _extract_name(cls, text: str, language: str) -> Dict[str, Any]:
        # Strip common phrases:
        # "Mera naam ... hai", "Mera name ...", "माझं नाव ... आहे", "माझे नाव ... आहे", "My name is ..."
        patterns = [
            r"^(?:mera\s+naam|mera\s+name|मेरा\s+नाम|my\s+name\s+is|माझं\s+नाव|माझे\s+नाव|माझे\s+नांव|माझा\s+नाव)\s+(.+?)(?:\s+hai|\s+ahe|\s+आहे|\s+है|\s+ho)?$",
            r"^(?:mai\s+|main\s+|मैं\s+|मी\s+)(.+?)(?:\s+bol\s+raha\s+hoon|\s+boltoy|\s+बोलतोय|\s+बोल रहा हूँ|\s+हूं|\s+हूँ)?$"
        ]
        val = text
        for pat in patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                val = m.group(1).strip()
                break

        # Remove trailing punctuation or filler words
        val = re.sub(r"[.!?,]+", "", val).strip()
        words = val.split()
        
        # If words contain digits, confidence is low
        if re.search(r"\d", val):
            return {
                "field": "full_name",
                "value": val,
                "confidence": 0.4,
                "needs_clarification": True,
                "raw_transcript": text
            }

        confidence = 0.95 if len(words) >= 2 else 0.88
        return {
            "field": "full_name",
            "value": val,
            "confidence": confidence,
            "needs_clarification": False,
            "raw_transcript": text
        }

    @classmethod
    def _extract_dob(cls, text: str, language: str) -> Dict[str, Any]:
        # First check explicit format DD/MM/YYYY or DD-MM-YYYY
        m = re.search(r"\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b", text)
        if m:
            d, month, y = m.groups()
            formatted = f"{int(d):02d}/{int(month):02d}/{y}"
            return {
                "field": "dob",
                "value": formatted,
                "confidence": 0.98,
                "needs_clarification": False,
                "raw_transcript": text
            }

        # Check spoken date like "14 August 2004", "चौदह अगस्त दो हज़ार चार"
        # Normalize spoken words
        norm = text.lower()
        for month_name, month_num in cls.MONTH_MAP.items():
            if month_name in norm:
                # find numbers before and after
                # Example: "14 august 2004"
                m_date = re.search(r"(\d{1,2})\s+" + re.escape(month_name) + r"\s+(\d{4})", norm)
                if m_date:
                    d, y = m_date.groups()
                    formatted = f"{int(d):02d}/{month_num}/{y}"
                    return {
                        "field": "dob",
                        "value": formatted,
                        "confidence": 0.92,
                        "needs_clarification": False,
                        "raw_transcript": text
                    }

        # If natural speech has numbers
        num_matches = re.findall(r"\d+", text)
        if len(num_matches) == 3:
            d, m_val, y = num_matches
            if len(y) == 4 and 1 <= int(d) <= 31 and 1 <= int(m_val) <= 12:
                formatted = f"{int(d):02d}/{int(m_val):02d}/{y}"
                return {
                    "field": "dob",
                    "value": formatted,
                    "confidence": 0.90,
                    "needs_clarification": False,
                    "raw_transcript": text
                }

        return {
            "field": "dob",
            "value": text,
            "confidence": 0.5,
            "needs_clarification": True,
            "raw_transcript": text
        }

    @classmethod
    def _extract_mobile(cls, text: str, language: str) -> Dict[str, Any]:
        # Convert any number words first
        expanded = cls.normalize_numbers_in_transcript(text)
        digits_only = re.sub(r"\D", "", expanded)
        
        # If user spoke extra prefixes like +91 or 91
        if len(digits_only) == 12 and digits_only.startswith("91"):
            digits_only = digits_only[2:]
        elif len(digits_only) == 11 and digits_only.startswith("0"):
            digits_only = digits_only[1:]

        if len(digits_only) == 10:
            return {
                "field": "mobile",
                "value": digits_only,
                "confidence": 0.96,
                "needs_clarification": False,
                "raw_transcript": text
            }
        else:
            # Maybe 9 digits or invalid
            return {
                "field": "mobile",
                "value": digits_only if digits_only else text,
                "confidence": 0.65,
                "needs_clarification": True,
                "raw_transcript": text
            }

    @classmethod
    def _extract_college(cls, text: str, language: str) -> Dict[str, Any]:
        patterns = [
            r"^(?:mera\s+college|college\s+name|institute|मेरा\s+कॉलेज|कॉलेज\s+का\s+नाम|कॉलेज|माझे\s+कॉलेज|माझं\s+कॉलेज|महाविद्यालय)\s+(?:hai\s+|is\s+|आहे\s+)?(.+?)(?:\s+hai|\s+ahe|\s+आहे|\s+है)?$",
            r"^(?:main\s+|मी\s+|मैं\s+)(.+?)(?:\s+college\s+mein\s+padhta\s+hoon|\s+madhye\s+shiktoy|\s+कॉलेजमध्ये\s+शिकतो|\s+में\s+हूं|\s+में\s+पढ़ता\s+हूँ)?$"
        ]
        val = text
        for pat in patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                val = m.group(1).strip()
                break
        
        val = re.sub(r"[.!?,]+", "", val).strip()
        return {
            "field": "college",
            "value": val,
            "confidence": 0.92,
            "needs_clarification": False,
            "raw_transcript": text
        }

    @classmethod
    def _extract_course(cls, text: str, language: str) -> Dict[str, Any]:
        patterns = [
            r"^(?:mera\s+course|course\s+name|degree|मेरा\s+कोर्स|कोर्स\s+का\s+नाम|कोर्स|माझा\s+अभ्यासक्रम|माझी\s+पदवी|अभ्यासक्रम)\s+(?:hai\s+|is\s+|आहे\s+)?(.+?)(?:\s+hai|\s+ahe|\s+आहे|\s+है)?$",
            r"^(?:main\s+|मी\s+|मैं\s+)(.+?)(?:\s+kar\s+raha\s+hoon|\s+karto|\s+करतोय|\s+कर\s+रहा\s+हूं|\s+कर\s+रहा\s+हूँ)?$"
        ]
        val = text
        for pat in patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                val = m.group(1).strip()
                break
        
        val = re.sub(r"[.!?,]+", "", val).strip()
        return {
            "field": "course",
            "value": val,
            "confidence": 0.92,
            "needs_clarification": False,
            "raw_transcript": text
        }

    @classmethod
    def _extract_academic_year(cls, text: str, language: str) -> Dict[str, Any]:
        norm = text.lower()
        mapping = {
            'pehla': '1', 'first': '1', '1st': '1', '1': '1', 'पहला': '1', 'पहिले': '1', 'प्रथम': '1',
            'dusra': '2', 'doosra': '2', 'second': '2', '2nd': '2', '2': '2', 'दूसरा': '2', 'दुसरे': '2', 'द्वितीय': '2',
            'teesra': '3', 'tisra': '3', 'third': '3', '3rd': '3', '3': '3', 'तीसरा': '3', 'तिसरे': '3', 'तृतीय': '3',
            'chautha': '4', 'fourth': '4', 'final': '4', '4th': '4', '4': '4', 'चौथा': '4', 'चौथे': '4', 'चतुर्थ': '4'
        }
        for k, v in mapping.items():
            if k in norm:
                return {
                    "field": "academic_year",
                    "value": v,
                    "confidence": 0.95,
                    "needs_clarification": False,
                    "raw_transcript": text
                }
        
        # Check single digit
        m = re.search(r"\b([1-4])\b", norm)
        if m:
            return {
                "field": "academic_year",
                "value": m.group(1),
                "confidence": 0.90,
                "needs_clarification": False,
                "raw_transcript": text
            }
        
        return {
            "field": "academic_year",
            "value": text,
            "confidence": 0.50,
            "needs_clarification": True,
            "raw_transcript": text
        }

    @classmethod
    def _extract_annual_income(cls, text: str, language: str) -> Dict[str, Any]:
        """
        Normalizes spoken numbers like:
        - "Mere ghar ki saal ki income lagbhag ek lakh assi hazaar hai" -> 180000
        - "एक लाख ऐंशी हजार" -> 180000
        - "1 lakh 80 thousand" -> 180000
        - "180000" / "1,80,000" -> 180000
        """
        raw = text.strip()
        # Direct digits check first
        digits_direct = re.sub(r"[,\s]", "", raw)
        m_dig = re.search(r"\b(\d+)\b", digits_direct)
        if m_dig and int(m_dig.group(1)) > 1000:
            return {
                "field": "annual_income",
                "value": int(m_dig.group(1)),
                "confidence": 0.96,
                "needs_clarification": False,
                "raw_transcript": text
            }

        norm = raw.lower()
        # Word mappings for Indian denominations
        # Lakhs calculation
        total = 0
        lakh_found = False
        
        # Look for [X] lakh / लाख
        lakh_match = re.search(r"(\d+|ek|do|teen|chaar|char|paanch|chhah|saat|aath|nau|एक|दोन|दोन|तीन|चार|पाच|सहा|सात|आठ|नऊ)\s*(?:lakh|lac|लाख)", norm)
        if lakh_match:
            lakh_str = lakh_match.group(1)
            lakh_mult = 1
            if lakh_str.isdigit():
                lakh_mult = int(lakh_str)
            elif lakh_str in ['ek', 'एक', 'one']: lakh_mult = 1
            elif lakh_str in ['do', 'दोन', 'दो', 'two']: lakh_mult = 2
            elif lakh_str in ['teen', 'तीन', 'three']: lakh_mult = 3
            elif lakh_str in ['char', 'chaar', 'चार', 'four']: lakh_mult = 4
            elif lakh_str in ['paanch', 'पाच', 'पांच', 'five']: lakh_mult = 5
            total += lakh_mult * 100000
            lakh_found = True

        # Look for [Y] thousand / hazaar / हजार
        thousand_match = re.search(r"(\d+|assi|pachaas|saath|sattar|navve|panchis|tees|chalis|अस्सी|ऐंशी|पन्नास|पचास|साठ|सत्तर|नव्वद|नब्बे|तीस|चाळीस|चालीस|पच्चीस)\s*(?:thousand|hazaar|hazar|हज़ार|हजार)", norm)
        if thousand_match:
            th_str = thousand_match.group(1)
            th_mult = 0
            num_word_map = {
                'assi': 80, 'अस्सी': 80, 'ऐंशी': 80, '80': 80,
                'pachaas': 50, 'पचास': 50, 'पन्नास': 50, '50': 50,
                'saath': 60, 'साठ': 60, '60': 60,
                'sattar': 70, 'सत्तर': 70, '70': 70,
                'navve': 90, 'नव्वद': 90, 'नब्बे': 90, '90': 90,
                'tees': 30, 'तीस': 30, '30': 30,
                'chalis': 40, 'चालीस': 40, 'चाळीस': 40, '40': 40,
                'panchis': 25, 'पच्चीस': 25, 'पंचवीस': 25, '25': 25,
                'ek': 1, 'do': 2, 'teen': 3, 'chaar': 4, 'paanch': 5
            }
            if th_str.isdigit():
                th_mult = int(th_str)
            elif th_str in num_word_map:
                th_mult = num_word_map[th_str]
            total += th_mult * 1000

        if total > 0:
            return {
                "field": "annual_income",
                "value": total,
                "confidence": 0.94,
                "needs_clarification": False,
                "raw_transcript": text
            }

        # If user just said "two lakh" or "dhai lakh"
        if "dhai" in norm or "अडीच" in norm:
            return {
                "field": "annual_income",
                "value": 250000,
                "confidence": 0.92,
                "needs_clarification": False,
                "raw_transcript": text
            }
        if "dedh" in norm or "दीड" in norm:
            return {
                "field": "annual_income",
                "value": 150000,
                "confidence": 0.92,
                "needs_clarification": False,
                "raw_transcript": text
            }

        # Fallback to any number in string
        numbers = re.findall(r"\d+", text)
        if numbers:
            val = int("".join(numbers))
            return {
                "field": "annual_income",
                "value": val,
                "confidence": 0.85,
                "needs_clarification": False,
                "raw_transcript": text
            }

        return {
            "field": "annual_income",
            "value": text,
            "confidence": 0.4,
            "needs_clarification": True,
            "raw_transcript": text
        }

    @classmethod
    def _extract_category(cls, text: str, language: str) -> Dict[str, Any]:
        norm = text.lower()
        if any(w in norm for w in ["obc", "ओबीसी", "अन्य पिछड़ा वर्ग", "अन्य पिछडा वर्ग", "इतर मागासवर्ग"]):
            return {"field": "category", "value": "OBC", "confidence": 0.98, "needs_clarification": False, "raw_transcript": text}
        if any(w in norm for w in ["sc", "एससी", "अनुसूचित जाति", "अनुसूचित जाती"]):
            return {"field": "category", "value": "SC", "confidence": 0.98, "needs_clarification": False, "raw_transcript": text}
        if any(w in norm for w in ["st", "एसटी", "अनुसूचित जनजाति", "अनुसूचित जमाती"]):
            return {"field": "category", "value": "ST", "confidence": 0.98, "needs_clarification": False, "raw_transcript": text}
        if any(w in norm for w in ["general", "सामान्य", "खुला", "open"]):
            return {"field": "category", "value": "General", "confidence": 0.96, "needs_clarification": False, "raw_transcript": text}
        if any(w in norm for w in ["other", "अन्य", "इतर"]):
            return {"field": "category", "value": "Other", "confidence": 0.92, "needs_clarification": False, "raw_transcript": text}
        
        # TC15: Invalid category like "VIP" or "BPL" or gibberish
        return {
            "field": "category",
            "value": text.strip(),
            "confidence": 0.5,
            "needs_clarification": True,
            "raw_transcript": text
        }

    @classmethod
    def _extract_district(cls, text: str, language: str) -> Dict[str, Any]:
        patterns = [
            r"^(?:mera\s+jila|mera\s+district|मेरा\s+जिला|गृह\s+जिला|जिला|माझा\s+जिल्हा|जिल्हा)\s+(?:hai\s+|is\s+|आहे\s+)?(.+?)(?:\s+hai|\s+ahe|\s+आहे|\s+है)?$",
            r"^(?:main\s+|मी\s+|मैं\s+)(.+?)(?:\s+se\s+hoon|\s+cha\s+aahe|\s+मधून\s+आहे|\s+रहता\s+हूं|\s+रहता\s+हूँ)?$"
        ]
        val = text
        for pat in patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                val = m.group(1).strip()
                break
        
        val = re.sub(r"[.!?,]+", "", val).strip()
        return {
            "field": "district",
            "value": val,
            "confidence": 0.92,
            "needs_clarification": False,
            "raw_transcript": text
        }

    @classmethod
    def _extract_document_status(cls, text: str, language: str) -> Dict[str, Any]:
        norm = text.lower()
        if any(w in norm for w in ["pending", "लंबित", "प्रलंबित", "baaki", "बाकी", "नाहीत", "अजून नाही", "baki hai"]):
            return {"field": "document_status", "value": "Pending", "confidence": 0.95, "needs_clarification": False, "raw_transcript": text}
        if any(w in norm for w in ["available", "उपलब्ध", "हां", "होय", "yes", "sabhi hai"]):
            return {"field": "document_status", "value": "Available", "confidence": 0.95, "needs_clarification": False, "raw_transcript": text}
        
        return {
            "field": "document_status",
            "value": text.strip(),
            "confidence": 0.5,
            "needs_clarification": True,
            "raw_transcript": text
        }

    @classmethod
    def extract_confirmation_intent(cls, transcript: str) -> str:
        """
        Determines user confirmation response:
        'confirm' (Haan / Sahi hai / Ho / Yes)
        'reject' (Nahi / Galat / No / Nako)
        'uncertain' (Pata nahi / Repeat / ...)
        """
        norm = (transcript or "").lower().strip()
        affirmative = [
            "haan", "han", "ha", "sahi", "sahi hai", "theek", "theek hai", "yes", "bilkul", 
            "होय", "हो", "बरोबर", "बरोबर आहे", "होय बरोबर", "हां", "हाँ", "सही", "सही है", "ठीक है"
        ]
        negative = [
            "nahi", "nahin", "na", "no", "galat", "galat hai", "badlo", "change",
            "नाही", "नको", "चूक", "नाही चूक आहे", "नहीं", "गलत", "गलत है", "बदलो"
        ]
        for a in affirmative:
            if re.search(rf"\b{re.escape(a)}\b", norm) or norm == a:
                return "confirm"
        for n in negative:
            if re.search(rf"\b{re.escape(n)}\b", norm) or norm == n:
                return "reject"
        return "uncertain"
