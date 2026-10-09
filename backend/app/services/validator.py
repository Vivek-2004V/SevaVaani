import re
from datetime import datetime
from typing import Tuple, Optional, Any

class FieldValidator:
    @staticmethod
    def validate(field_name: str, value: Any, language: str = "hi") -> Tuple[bool, Optional[str]]:
        """
        Validates value against field rules for Hindi, Marathi, and English.
        Returns: (is_valid: bool, error_message: Optional[str])
        """
        if value is None:
            if language == "en":
                msg = "Value cannot be empty."
            elif language == "mr":
                msg = "मूल्य रिकामे असू शकत नाही."
            else:
                msg = "मान रिक्त नहीं हो सकता।"
            return False, msg

        str_val = str(value).strip()

        if field_name == "full_name":
            if len(str_val) < 2 or len(str_val) > 80:
                if language == "en":
                    msg = "Name must be between 2 and 80 characters."
                elif language == "mr":
                    msg = "नाव 2 ते 80 अक्षरांच्या दरम्यान असावे."
                else:
                    msg = "नाम 2 से 80 अक्षरों के बीच होना चाहिए।"
                return False, msg
            # Check not just digits
            if re.match(r"^\d+$", str_val):
                if language == "en":
                    msg = "Name must contain letters, not just numbers."
                elif language == "mr":
                    msg = "नावात अक्षरे असावीत, फक्त अंक नाहीत."
                else:
                    msg = "नाम में अक्षर होने चाहिए, केवल अंक नहीं।"
                return False, msg
            return True, None

        elif field_name == "dob":
            # Expect DD/MM/YYYY (or ISO YYYY-MM-DD)
            match = re.match(r"^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$", str_val)
            if not match:
                iso_match = re.match(r"^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$", str_val)
                if iso_match:
                    y, m, d = iso_match.groups()
                    match = re.match(r"^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$", f"{d}/{m}/{y}")
            if not match:
                if language == "en":
                    msg = "Date of birth must be in DD/MM/YYYY format (e.g. 14/08/2004)."
                elif language == "mr":
                    msg = "जन्मतारीख DD/MM/YYYY स्वरूपात असावी (उदा. 14/08/2004)."
                else:
                    msg = "जन्म तिथि DD/MM/YYYY प्रारूप में होनी चाहिए (उदा. 14/08/2004)।"
                return False, msg
            d, m, y = match.groups()
            try:
                date_obj = datetime(int(y), int(m), int(d))
                now = datetime.now()
                if date_obj > now:
                    if language == "en":
                        msg = "Date of birth cannot be in the future."
                    elif language == "mr":
                        msg = "जन्मतारीख भविष्यातील असू शकत नाही."
                    else:
                        msg = "जन्म तिथि भविष्य की नहीं हो सकती।"
                    return False, msg
                if int(y) < 1950:
                    if language == "en":
                        msg = "Please provide a valid year of birth."
                    elif language == "mr":
                        msg = "कृपया वैध जन्माचे वर्ष सांगा."
                    else:
                        msg = "कृपया मान्य जन्म वर्ष बताएं।"
                    return False, msg
                return True, None
            except ValueError:
                if language == "en":
                    msg = "This is not a valid calendar date."
                elif language == "mr":
                    msg = "ही वैध कॅलेंडर तारीख नाही."
                else:
                    msg = "यह कोई मान्य कैलेंडर तिथि नहीं है।"
                return False, msg

        elif field_name == "mobile":
            # TC04 / TC05: Must be 10 digits starting with 6-9
            cleaned = re.sub(r"\D", "", str_val)
            if len(cleaned) != 10:
                if language == "en":
                    msg = f"Mobile number must be exactly 10 digits (you provided {len(cleaned)} digits)."
                elif language == "mr":
                    msg = f"मोबाईल नंबर पूर्ण १० अंकी असावा (तुम्ही {len(cleaned)} अंक दिले)."
                else:
                    msg = f"मोबाइल नंबर पूरे 10 अंक का होना चाहिए (आपने {len(cleaned)} अंक दिए)।"
                return False, msg
            if not re.match(r"^[6-9]\d{9}$", cleaned):
                if language == "en":
                    msg = "Mobile number must start with 6, 7, 8, or 9."
                elif language == "mr":
                    msg = "मोबाईल नंबर 6, 7, 8 किंवा 9 ने सुरू झाला पाहिजे."
                else:
                    msg = "मोबाइल नंबर 6, 7, 8 या 9 से शुरू होना चाहिए।"
                return False, msg
            return True, None

        elif field_name == "college":
            if len(str_val) < 2:
                if language == "en":
                    msg = "College or institution name must be at least 2 characters."
                elif language == "mr":
                    msg = "महाविद्यालयाचे नाव किमान २ अक्षरांचे असावे."
                else:
                    msg = "कॉलेज या संस्थान का नाम कम से कम 2 अक्षर का होना चाहिए।"
                return False, msg
            return True, None

        elif field_name == "course":
            if len(str_val) < 2:
                if language == "en":
                    msg = "Course or degree name must be at least 2 characters."
                elif language == "mr":
                    msg = "अभ्यासक्रमाचे नाव किमान २ अक्षरांचे असावे."
                else:
                    msg = "कोर्स या डिग्री का नाम कम से कम 2 अक्षर का होना चाहिए।"
                return False, msg
            return True, None

        elif field_name == "academic_year":
            allowed = ["1", "2", "3", "4"]
            if str_val not in allowed:
                if language == "en":
                    msg = "Academic year must be 1, 2, 3, or 4."
                elif language == "mr":
                    msg = "शैक्षणिक वर्ष फक्त १, २, ३, किंवा ४ असू शकते."
                else:
                    msg = "शैक्षणिक वर्ष केवल 1, 2, 3, या 4 हो सकता है।"
                return False, msg
            return True, None

        elif field_name == "annual_income":
            try:
                num_val = float(str_val)
                if num_val < 0:
                    if language == "en":
                        msg = "Annual income must be 0 or greater."
                    elif language == "mr":
                        msg = "वार्षिक उत्पन्न ० किंवा त्याहून अधिक असावे."
                    else:
                        msg = "वार्षिक आय 0 या उससे अधिक होनी चाहिए।"
                    return False, msg
                return True, None
            except ValueError:
                if language == "en":
                    msg = "Annual income must be a valid numeric amount."
                elif language == "mr":
                    msg = "वार्षिक उत्पन्न फक्त संख्यात्मक (रुपयांमध्ये) असावे."
                else:
                    msg = "वार्षिक आय केवल संख्यात्मक (रुपयों में) होनी चाहिए।"
                return False, msg

        elif field_name == "category":
            allowed = ["SC", "ST", "OBC", "General", "Other"]
            if str_val not in allowed:
                if language == "en":
                    msg = "Allowed categories are: SC, ST, OBC, General, or Other."
                elif language == "mr":
                    msg = "ग्राह्य सामाजिक प्रवर्ग आहेत: SC, ST, OBC, General, किंवा Other."
                else:
                    msg = "मान्य सामाजिक श्रेणियां हैं: SC, ST, OBC, General, या Other।"
                return False, msg
            return True, None

        elif field_name == "district":
            if len(str_val) < 2:
                if language == "en":
                    msg = "District name must be at least 2 characters."
                elif language == "mr":
                    msg = "जिल्ह्याचे नाव किमान २ अक्षरांचे असावे."
                else:
                    msg = "जिले का नाम कम से कम 2 अक्षर का होना चाहिए।"
                return False, msg
            return True, None

        elif field_name == "document_status":
            allowed = ["Available", "Pending"]
            if str_val not in allowed:
                if language == "en":
                    msg = "Document status must be 'Available' or 'Pending'."
                elif language == "mr":
                    msg = "कागदपत्र स्थिती 'Available' किंवा 'Pending' असावी."
                else:
                    msg = "दस्तावेज़ स्थिति 'Available' या 'Pending' होनी चाहिए।"
                return False, msg
            return True, None

        # Fallback default
        if len(str_val) == 0:
            if language == "en":
                return False, "This field is required."
            elif language == "mr":
                return False, "हे फील्ड आवश्यक आहे."
            return False, "यह फ़ील्ड आवश्यक है।"
        return True, None
