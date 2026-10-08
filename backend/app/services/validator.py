import re
from datetime import datetime
from typing import Tuple, Optional, Any

class FieldValidator:
    @staticmethod
    def validate(field_name: str, value: Any, language: str = "hi") -> Tuple[bool, Optional[str]]:
        """
        Validates value against field rules.
        Returns: (is_valid: bool, error_message: Optional[str])
        """
        if value is None:
            msg = "मान रिक्त नहीं हो सकता।" if language == "hi" else "मूल्य रिकामे असू शकत नाही."
            return False, msg

        str_val = str(value).strip()

        if field_name == "full_name":
            if len(str_val) < 2 or len(str_val) > 80:
                msg = ("नाम 2 से 80 अक्षरों के बीच होना चाहिए।" 
                       if language == "hi" else "नाव 2 ते 80 अक्षरांच्या दरम्यान असावे.")
                return False, msg
            # Check not just digits
            if re.match(r"^\d+$", str_val):
                msg = ("नाम में अक्षर होने चाहिए, केवल अंक नहीं।" 
                       if language == "hi" else "नावात अक्षरे असावीत, फक्त अंक नाहीत.")
                return False, msg
            return True, None

        elif field_name == "dob":
            # Expect DD/MM/YYYY
            match = re.match(r"^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$", str_val)
            if not match:
                msg = ("जन्म तिथि DD/MM/YYYY प्रारूप में होनी चाहिए (उदा. 14/08/2004)।" 
                       if language == "hi" else "जन्मतारीख DD/MM/YYYY स्वरूपात असावी (उदा. 14/08/2004).")
                return False, msg
            d, m, y = match.groups()
            try:
                date_obj = datetime(int(y), int(m), int(d))
                now = datetime.now()
                if date_obj > now:
                    msg = ("जन्म तिथि भविष्य की नहीं हो सकती।" 
                           if language == "hi" else "जन्मतारीख भविष्यातील असू शकत नाही.")
                    return False, msg
                if int(y) < 1950:
                    msg = ("कृपया मान्य जन्म वर्ष बताएं।" 
                           if language == "hi" else "कृपया वैध जन्माचे वर्ष सांगा.")
                    return False, msg
                return True, None
            except ValueError:
                msg = ("यह कोई मान्य कैलेंडर तिथि नहीं है।" 
                       if language == "hi" else "ही वैध कॅलेंडर तारीख नाही.")
                return False, msg

        elif field_name == "mobile":
            # TC04 / TC05: Must be 10 digits starting with 6-9
            cleaned = re.sub(r"\D", "", str_val)
            if len(cleaned) != 10:
                msg = (f"मोबाइल नंबर पूरे 10 अंक का होना चाहिए (आपने {len(cleaned)} अंक दिए)।" 
                       if language == "hi" else f"मोबाईल नंबर पूर्ण १० अंकी असावा (तुम्ही {len(cleaned)} अंक दिले).")
                return False, msg
            if not re.match(r"^[6-9]\d{9}$", cleaned):
                msg = ("मोबाइल नंबर 6, 7, 8 या 9 से शुरू होना चाहिए।" 
                       if language == "hi" else "मोबाईल नंबर 6, 7, 8 किंवा 9 ने सुरू झाला पाहिजे.")
                return False, msg
            return True, None

        elif field_name == "college":
            if len(str_val) < 2:
                msg = ("कॉलेज या संस्थान का नाम कम से कम 2 अक्षर का होना चाहिए।" 
                       if language == "hi" else "महाविद्यालयाचे नाव किमान २ अक्षरांचे असावे.")
                return False, msg
            return True, None

        elif field_name == "course":
            if len(str_val) < 2:
                msg = ("कोर्स या डिग्री का नाम कम से कम 2 अक्षर का होना चाहिए।" 
                       if language == "hi" else "अभ्यासक्रमाचे नाव किमान २ अक्षरांचे असावे.")
                return False, msg
            return True, None

        elif field_name == "academic_year":
            allowed = ["1", "2", "3", "4"]
            if str_val not in allowed:
                msg = ("शैक्षणिक वर्ष केवल 1, 2, 3, या 4 हो सकता है।" 
                       if language == "hi" else "शैक्षणिक वर्ष फक्त १, २, ३, किंवा ४ असू शकते.")
                return False, msg
            return True, None

        elif field_name == "annual_income":
            try:
                num_val = float(str_val)
                if num_val < 0:
                    msg = ("वार्षिक आय 0 या उससे अधिक होनी चाहिए।" 
                           if language == "hi" else "वार्षिक उत्पन्न ० किंवा त्याहून अधिक असावे.")
                    return False, msg
                return True, None
            except ValueError:
                msg = ("वार्षिक आय केवल संख्यात्मक (रुपयों में) होनी चाहिए।" 
                       if language == "hi" else "वार्षिक उत्पन्न फक्त संख्यात्मक (रुपयांमध्ये) असावे.")
                return False, msg

        elif field_name == "category":
            allowed = ["SC", "ST", "OBC", "General", "Other"]
            if str_val not in allowed:
                msg = ("मान्य सामाजिक श्रेणियां हैं: SC, ST, OBC, General, या Other।" 
                       if language == "hi" else "ग्राह्य सामाजिक प्रवर्ग आहेत: SC, ST, OBC, General, किंवा Other.")
                return False, msg
            return True, None

        elif field_name == "district":
            if len(str_val) < 2:
                msg = ("जिले का नाम कम से कम 2 अक्षर का होना चाहिए।" 
                       if language == "hi" else "जिल्ह्याचे नाव किमान २ अक्षरांचे असावे.")
                return False, msg
            return True, None

        elif field_name == "document_status":
            allowed = ["Available", "Pending"]
            if str_val not in allowed:
                msg = ("दस्तावेज़ स्थिति 'Available' या 'Pending' होनी चाहिए।" 
                       if language == "hi" else "कागदपत्र स्थिती 'Available' किंवा 'Pending' असावी.")
                return False, msg
            return True, None

        # Fallback default
        if len(str_val) == 0:
            return False, "यह फ़ील्ड आवश्यक है।"
        return True, None
