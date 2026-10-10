"""
Context-Aware Form Guidance & Field Comprehension Service for SEVA VAANI.

Empowers low-literacy users and citizens who struggle with complex government terminology:
- Simple, accessible explanations in Hindi, Marathi, and English.
- Concrete real-world examples.
- Conversational spoken text for Text-to-Speech read-aloud.
- Spelling vs Speech Confirmation guidance for high-impact fields (names, Aadhaar).
"""

from __future__ import annotations
from typing import Dict, Any, Optional


FIELD_GUIDANCE_CATALOG: Dict[str, Dict[str, Any]] = {
    "full_name": {
        "field_name": "full_name",
        "title": {
            "hi": "पूरा नाम (Full Name)",
            "mr": "पूर्ण नाव (Full Name)",
            "en": "Full Name"
        },
        "explanation": {
            "hi": "यहाँ आवेदक (जिसके नाम पर फॉर्म भरा जा रहा है) का वही नाम लिखना है जो आधार कार्ड या स्कूल प्रमाण पत्र में दर्ज है।",
            "mr": "येथे अर्जदाराचे (ज्यांच्या नावाने अर्ज भरला जात आहे) तेच नाव सांगावे जे आधार कार्ड किंवा शाळा सोडल्याच्या दाखल्यावर आहे.",
            "en": "State the applicant's official name exactly as printed on their Aadhaar card or educational mark sheet."
        },
        "example": {
            "hi": "उदा. 'रमेश कुमार शर्मा' या 'सुनील बापूराव पाटिल'",
            "mr": "उदा. 'सचिन बापूराव पाटील' किंवा 'अनिता विठ्ठल गायकवाड'",
            "en": "e.g., 'Ramesh Kumar Sharma' or 'Pooja Sanjay Patil'"
        },
        "spoken_text": {
            "hi": "पूरा नाम का मतलब है आपका आधिकारिक नाम जैसा आधार कार्ड पर लिखा है। उदाहरण के लिए, रमेश कुमार शर्मा। आवाज़ से बोलने के बाद कृपया स्पेलिंग भी जांच लें।",
            "mr": "पूर्ण नाव म्हणजे आपले आधार कार्डावरील अधिकृत नाव. उदा. सचिन बापूराव पाटील. उच्चारानंतर कृपया स्पेलिंग देखील तपासून घ्या.",
            "en": "Full Name means your official name as shown on your Aadhaar card. After confirming by voice, please also verify the spelling character by character."
        },
        "spelling_sensitive": True,
        "spelling_guidance": {
            "hi": "⚠️ सरकारी प्रमाण पत्र में स्पेलिंग बहुत महत्वपूर्ण है। वॉइस पुष्टि के बाद यह जांच लें कि स्पेलिंग आधार कार्ड से मेल खाती है।",
            "mr": "⚠️ शासकीय प्रमाणपत्रात स्पेलिंग अत्यंत महत्त्वाची असते. आवाजाच्या पुष्टीनंतर स्पेलिंग आधार कार्डाप्रमाणे असल्याची खात्री करा.",
            "en": "⚠️ Official documents require exact character matching. Please verify spelling against your ID after voice confirmation."
        }
    },
    "father_name": {
        "field_name": "father_name",
        "title": {
            "hi": "पिता या अभिभावक का नाम",
            "mr": "वडिलांचे किंवा पालकांचे नाव",
            "en": "Father / Guardian Name"
        },
        "explanation": {
            "hi": "यहाँ आपके पिता या कानूनी संरक्षक का नाम आएगा। यदि पिता नहीं हैं तो माता या अभिभावक का नाम दें।",
            "mr": "येथे आपल्या वडिलांचे किंवा कायदेशीर पालकांचे नाव सांगावे.",
            "en": "The legal name of your father or guardian as shown on official family records."
        },
        "example": {
            "hi": "उदा. 'श्री रामप्रसाद शर्मा'",
            "mr": "उदा. 'बापूराव दत्तात्रय पाटील'",
            "en": "e.g., 'Ramprasad Sharma'"
        },
        "spoken_text": {
            "hi": "पिता या अभिभावक का नाम का मतलब है आपके पिता या संरक्षक का नाम जैसा राशन कार्ड या आधार में है।",
            "mr": "वडिलांचे किंवा पालकांचे नाव म्हणजे राशन कार्ड किंवा ओळखपत्रावरील अधिकृत नाव.",
            "en": "Father or Guardian Name is the legal name of your parent or legal guardian on official records."
        },
        "spelling_sensitive": True,
        "spelling_guidance": {
            "hi": "प्रमाण पत्रों में पिता के नाम की स्पेलिंग 10वीं की मार्कशीट या राशन कार्ड के अनुसार होनी चाहिए।",
            "mr": "दाखल्यामध्ये वडिलांच्या नावाची स्पेलिंग १०वीच्या गुणपत्रिकेप्रमाणे असावी.",
            "en": "Ensure father's name spelling matches the applicant's school mark sheet."
        }
    },
    "dob": {
        "field_name": "dob",
        "title": {
            "hi": "जन्म तिथि (Date of Birth)",
            "mr": "जन्मतारीख (Date of Birth)",
            "en": "Date of Birth"
        },
        "explanation": {
            "hi": "आप जिस दिन पैदा हुए थे, वह दिन, महीना और साल। इसे दिन/माह/वर्ष (DD/MM/YYYY) प्रारूप में समझा जाता है।",
            "mr": "आपला जन्म झालेला दिवस, महिना आणि वर्ष. उदा. दिवस/महिना/वर्ष.",
            "en": "The day, month, and year you were born, in Day/Month/Year format."
        },
        "example": {
            "hi": "उदा. '15 अगस्त 2004' (15/08/2004)",
            "mr": "उदा. 'चौदा ऑगस्ट दोन हजार चार' (14/08/2004)",
            "en": "e.g., '14 August 2004' (14/08/2004)"
        },
        "spoken_text": {
            "hi": "जन्म तिथि का मतलब है आपका जन्मदिन, महीना और साल। उदाहरण के लिए, पंद्रह अगस्त दो हज़ार चार।",
            "mr": "जन्मतारीख म्हणजे आपला जन्म झालेला दिवस, महिना आणि वर्ष. उदा. चौदा ऑगस्ट दोन हजार चार.",
            "en": "Date of birth means your day, month, and year of birth. For example, fourteenth of August two thousand four."
        },
        "spelling_sensitive": False
    },
    "mobile": {
        "field_name": "mobile",
        "title": {
            "hi": "मोबाइल नंबर (Mobile Number)",
            "mr": "मोबाईल क्रमांक (Mobile Number)",
            "en": "Mobile Number"
        },
        "explanation": {
            "hi": "आपका चालू दस अंकों का मोबाइल नंबर जिस पर सरकार से ओटीपी (OTP) और आवेदन स्थिति के संदेश (SMS) आते हैं।",
            "mr": "आपला चालू १० अंकी मोबाईल नंबर ज्यावर अर्जाची स्थिती आणि ओटीपी मेसेज येतील.",
            "en": "Your active 10-digit phone number that receives application status SMS and OTPs."
        },
        "example": {
            "hi": "उदा. '9876543210'",
            "mr": "उदा. '9876543210'",
            "en": "e.g., '9876543210'"
        },
        "spoken_text": {
            "hi": "मोबाइल नंबर पूरे दस अंक का होना चाहिए। हम आपको यह नंबर दोहराकर सुनाएंगे ताकि कोई अंक छूटे नहीं।",
            "mr": "मोबाईल नंबर पूर्ण दहा अंकांचा असावा. कोणताही अंक चुकू नये म्हणून आम्ही तो वाचून दाखवू.",
            "en": "Mobile number must be ten digits. We will read back the digits in groups so you can verify them."
        },
        "spelling_sensitive": False
    },
    "annual_income": {
        "field_name": "annual_income",
        "title": {
            "hi": "वार्षिक आय (Annual Income)",
            "mr": "वार्षिक उत्पन्न (Annual Income)",
            "en": "Annual Family Income"
        },
        "explanation": {
            "hi": "वार्षिक आय का मतलब है कि आपके पूरे परिवार की एक साल में सभी स्रोतों (खेती, मजदूरी, नौकरी, दुकान आदि) से कुल कितनी कमाई होती है। यह महीने की नहीं, पूरे 12 महीनों की आय है।",
            "mr": "वार्षिक उत्पन्न म्हणजे आपल्या संपूर्ण कुटुंबाची एका वर्षात सर्व मार्गांनी (शेती, मजुरी, नोकरी, व्यवसाय) झालेली एकूण कमाई. ही महिन्याची नव्हे, तर पूर्ण १२ महिन्यांची कमाई असते.",
            "en": "Annual income means total earnings of your whole household from all sources across an entire year (12 months), not monthly income."
        },
        "example": {
            "hi": "उदा. अगर महीने में लगभग ₹16,000 की कमाई है, तो साल की आय लगभग ₹2,00,000 (दो लाख रुपये) होगी।",
            "mr": "उदा. जर महिन्याला सुमारे ₹16,000 मिळत असतील, तर वर्षाचे उत्पन्न ₹2,00,000 (दोन लाख रुपये) होईल.",
            "en": "e.g., If monthly household earnings are ₹16,000, the annual income is approximately ₹2,00,000 (Two Lakh Rupees)."
        },
        "spoken_text": {
            "hi": "वार्षिक आय का मतलब है पूरे परिवार की एक साल की कुल कमाई। यह महीने की कमाई नहीं है। उदाहरण के लिए, दो लाख रुपये।",
            "mr": "वार्षिक उत्पन्न म्हणजे संपूर्ण कुटुंबाची एका वर्षाची एकूण कमाई. उदा. दोन लाख रुपये.",
            "en": "Annual income means your total family income for the whole year, not just one month. For example, two lakh rupees."
        },
        "spelling_sensitive": False
    },
    "category": {
        "field_name": "category",
        "title": {
            "hi": "सामाजिक श्रेणी / प्रवर्ग (Category)",
            "mr": "सामाजिक प्रवर्ग (Category)",
            "en": "Social Reservation Category"
        },
        "explanation": {
            "hi": "आपका जाति प्रवर्ग जिसके तहत आप आरक्षण या सरकारी लाभ प्राप्त करने के पात्र हैं। जैसे: अनुसूचित जाति (SC), अनुसूचित जनजाति (ST), अन्य पिछड़ा वर्ग (OBC), या सामान्य (General)।",
            "mr": "आपला सामाजिक प्रवर्ग ज्यानुसार आपल्याला शासकीय सवलती किंवा शिष्यवृत्ती मिळते. उदा. SC, ST, OBC किंवा खुला प्रवर्ग (General).",
            "en": "Your constitutional social category eligible for reservations and welfare scholarships (SC, ST, OBC, General, or Other)."
        },
        "example": {
            "hi": "उदा. 'ओबीसी' (OBC) या 'सामान्य' (General)",
            "mr": "उदा. 'ओबीसी' किंवा 'खुला प्रवर्ग'",
            "en": "e.g., 'OBC', 'SC', 'ST', or 'General'"
        },
        "spoken_text": {
            "hi": "कैटेगरी का मतलब आपकी जाति श्रेणी है, जैसे ओबीसी, एससी, एसटी या सामान्य।",
            "mr": "प्रवर्ग म्हणजे आपली सामाजिक जात श्रेणी, जसे की ओबीसी, एससी, एसटी किंवा खुला प्रवर्ग.",
            "en": "Category means your reservation category such as OBC, SC, ST, or General."
        },
        "spelling_sensitive": False
    },
    "district": {
        "field_name": "district",
        "title": {
            "hi": "गृह जिला (District)",
            "mr": "गृह जिल्हा (District)",
            "en": "District"
        },
        "explanation": {
            "hi": "वह प्रशासनिक जिला जहाँ आपका स्थायी निवास या गांव स्थित है।",
            "mr": "आपले गाव किंवा मूळ कायमस्वरूपी घर ज्या प्रशासकीय जिल्ह्यात येते.",
            "en": "The administrative district of your permanent legal residence."
        },
        "example": {
            "hi": "उदा. 'पुणे', 'नागपुर', 'भोपाल', 'इंदौर'",
            "mr": "उदा. 'पुणे', 'नागपूर', 'सातारा', 'छत्रपती संभाजीनगर'",
            "en": "e.g., 'Pune', 'Nagpur', 'Bhopal'"
        },
        "spoken_text": {
            "hi": "जिला का मतलब आपका गृह जिला जहाँ आपका स्थायी निवास है, जैसे पुणे या नागपुर।",
            "mr": "जिल्हा म्हणजे आपले मूळ गाव ज्या जिल्ह्यात येते, उदा. पुणे किंवा नागपूर.",
            "en": "District means your home administrative district where you permanently reside, such as Pune or Nagpur."
        },
        "spelling_sensitive": False
    },
    "college": {
        "field_name": "college",
        "title": {
            "hi": "कॉलेज या संस्थान का नाम",
            "mr": "महाविद्यालयाचे नाव",
            "en": "College / Institute Name"
        },
        "explanation": {
            "hi": "उस महाविद्यालय, विश्वविद्यालय या संस्थान का नाम जहाँ आप वर्तमान में पढ़ाई कर रहे हैं।",
            "mr": "आपण सध्या ज्या कॉलेज किंवा विद्यापीठात शिक्षण घेत आहात त्याचे नाव.",
            "en": "The name of the college, polytechnic, or university where you are currently enrolled."
        },
        "example": {
            "hi": "उदा. 'राजकीय इंजीनियरिंग कॉलेज' या 'आईआईटी मुंबई'",
            "mr": "उदा. 'शासकीय अभियांत्रिकी महाविद्यालय' किंवा 'व्हीजेटीआय मुंबई'",
            "en": "e.g., 'Government Engineering College' or 'IIT Bombay'"
        },
        "spoken_text": {
            "hi": "कॉलेज का मतलब उस कॉलेज या स्कूल का नाम जहाँ आप अभी पढ़ रहे हैं।",
            "mr": "कॉलेज म्हणजे आपण सध्या शिकत असलेल्या महाविद्यालयाचे नाव.",
            "en": "College means the school or institute where you are currently studying."
        },
        "spelling_sensitive": False
    },
    "course": {
        "field_name": "course",
        "title": {
            "hi": "कोर्स या डिग्री (Course)",
            "mr": "अभ्यासक्रम / पदवी (Course)",
            "en": "Course / Degree"
        },
        "explanation": {
            "hi": "वह पढ़ाई या डिग्री जो आप कर रहे हैं। जैसे: बी.टेक, बी.एससी, डिप्लोमा, आईटीआई आदि।",
            "mr": "आपण करत असलेला शैक्षणिक अभ्यासक्रम जसे की बी.टेक, बी.एस्सी, डिप्लोमा किंवा आयटीआय.",
            "en": "The specific degree, diploma, or vocational program you are currently pursuing."
        },
        "example": {
            "hi": "उदा. 'बी.टेक कंप्यूटर साइंस' या 'बी.एससी प्रथम वर्ष'",
            "mr": "उदा. 'बी.टेक' किंवा 'बी.फार्मसी'",
            "en": "e.g., 'B.Tech Computer Science' or 'Diploma in Mechanical'"
        },
        "spoken_text": {
            "hi": "कोर्स का मतलब आपकी डिग्री या डिप्लोमा, जैसे बीटेक या बीएससी।",
            "mr": "अभ्यासक्रम म्हणजे आपली पदवी किंवा डिप्लोमा, जसे की बीटेक किंवा बीफार्म.",
            "en": "Course means your degree or study program, such as B.Tech or B.Sc."
        },
        "spelling_sensitive": False
    },
    "academic_year": {
        "field_name": "academic_year",
        "title": {
            "hi": "शैक्षणिक वर्ष (Year of Study)",
            "mr": "शैक्षणिक वर्ष (Year of Study)",
            "en": "Academic Year"
        },
        "explanation": {
            "hi": "आप अपने कोर्स के किस साल में हैं: पहला साल (1st Year), दूसरा साल (2nd Year), तीसरा साल (3rd Year) या चौथा साल (4th Year)।",
            "mr": "आपण आपल्या अभ्यासक्रमाच्या कोणत्या वर्षात आहात: प्रथम वर्ष (१), द्वितीय वर्ष (२), तृतीय वर्ष (३) किंवा चतुर्थ वर्ष (४).",
            "en": "Which year of your degree program you are currently attending (1st, 2nd, 3rd, or 4th year)."
        },
        "example": {
            "hi": "उदा. 'दूसरा साल' (2) या 'फाइनल ईयर' (4)",
            "mr": "उदा. 'दुसरे वर्ष' (२) किंवा 'अंतिम वर्ष' (४)",
            "en": "e.g., 'Second Year (2)' or 'Final Year (4)'"
        },
        "spoken_text": {
            "hi": "शैक्षणिक वर्ष का मतलब आपका वर्तमान साल, जैसे पहला, दूसरा या तीसरा साल।",
            "mr": "शैक्षणिक वर्ष म्हणजे आपण सध्या कोणत्या वर्षात शिकत आहात, उदा. दुसरे वर्ष.",
            "en": "Academic year means whether you are in first, second, third, or fourth year."
        },
        "spelling_sensitive": False
    }
}


class FieldGuidanceService:
    """Provides plain-language context, examples, and read-aloud spoken audio text for public forms."""

    @classmethod
    def get_field_guidance(cls, field_name: str, language: str = "hi") -> Dict[str, Any]:
        lang = (language or "hi").lower()
        if lang not in ["hi", "mr", "en"]:
            lang = "hi"

        catalog_entry = FIELD_GUIDANCE_CATALOG.get(field_name.lower())
        if not catalog_entry:
            # Fallback general guidance
            return {
                "field_name": field_name,
                "title": field_name.replace("_", " ").title(),
                "explanation": (
                    f"कृपया {field_name} के लिए अपना विवरण दें।"
                    if lang == "hi"
                    else (
                        f"कृपया {field_name} साठी आपले तपशील द्या."
                        if lang == "mr"
                        else f"Please state your details for {field_name}."
                    )
                ),
                "example": "",
                "spoken_text": (
                    f"कृपया {field_name} के लिए बताएं।"
                    if lang == "hi"
                    else f"Please state {field_name}."
                ),
                "spelling_sensitive": False,
                "spelling_guidance": None
            }

        title = catalog_entry["title"].get(lang, catalog_entry["title"]["en"])
        explanation = catalog_entry["explanation"].get(lang, catalog_entry["explanation"]["en"])
        example = catalog_entry["example"].get(lang, catalog_entry["example"]["en"])
        spoken = catalog_entry["spoken_text"].get(lang, catalog_entry["spoken_text"]["en"])
        spelling_guidance = (
            catalog_entry.get("spelling_guidance", {}).get(lang)
            if catalog_entry.get("spelling_sensitive")
            else None
        )

        return {
            "field_name": field_name,
            "title": title,
            "explanation": explanation,
            "example": example,
            "spoken_text": spoken,
            "spelling_sensitive": bool(catalog_entry.get("spelling_sensitive")),
            "spelling_guidance": spelling_guidance
        }


field_guidance_service = FieldGuidanceService()
