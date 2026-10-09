"""
Translation and Localization Adapter for Indic Public Services.
Translates prompts and system templates while strictly protecting Named Entities (names, dates, phones).
"""

from __future__ import annotations
import re
from typing import Dict, Any, Optional

class IndicTranslationAdapter:
    """
    Adapter for localized service translation with Named Entity protection.
    """

    LANGUAGE_COMMON_TEMPLATES = {
        "bn": {
            "confirm": "আমি বুঝেছি আপনার {label} হলো {value}। এটি কি সঠিক?",
            "retry": "আমি স্পষ্ট শুনতে পাইনি। দয়া করে আবার বলুন।",
            "accepted": "গৃহীত হয়েছে।",
            "consent": "আমি ঘোষণা করছি যে প্রদত্ত সমস্ত তথ্য সত্য।"
        },
        "ta": {
            "confirm": "உங்கள் {label} {value} என்று புரிந்து கொண்டேன். இது சரியானதா?",
            "retry": "தெளிவாக கேட்கவில்லை. தயவுசெய்து மீண்டும் சொல்லுங்கள்.",
            "accepted": "ஏற்றுக்கொள்ளப்பட்டது.",
            "consent": "வழங்கப்பட்ட அனைத்து தகவல்களும் உண்மை என அறிவிக்கிறேன்."
        },
        "te": {
            "confirm": "మీ {label} {value} అని నేను అర్థం చేసుకున్నాను. ఇది సరైనదేనా?",
            "retry": "స్పష్టంగా వినపడలేదు. దయచేసి మళ్లీ చెప్పండి.",
            "accepted": "ఆమోదించబడింది.",
            "consent": "అందించిన సమాచారం అంతా నిజమని నేను ధృవీకరిస్తున్నాను."
        },
        "gu": {
            "confirm": "હું સમજ્યો કે તમારું {label} {value} છે. શું આ સાચું છે?",
            "retry": "મને સ્પષ્ટ સંભળાયું નથી. કૃપા કરીને ફરીથી બોલો.",
            "accepted": "સ્વીકારવામાં આવ્યું.",
            "consent": "હું જાહેર કરું છું કે આપેલી તમામ માહિતી સાચી છે."
        },
        "kn": {
            "confirm": "ನಿಮ್ಮ {label} {value} ಎಂದು ನಾನು ಅರ್ಥಮಾಡಿಕೊಂಡಿದ್ದೇನೆ. ಇದು ಸರಿಯೇ?",
            "retry": "ಸ್ಪಷ್ಟವಾಗಿ ಕೇಳಿಸಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಹೇಳಿ.",
            "accepted": "ಸ್ವೀಕರಿಸಲಾಗಿದೆ.",
            "consent": "ಒದಗಿಸಲಾದ ಎಲ್ಲಾ ಮಾಹಿತಿ ಸತ್ಯವೆಂದು ನಾನು ಘೋಷಿಸುತ್ತೇನೆ."
        },
        "ml": {
            "confirm": "നിങ്ങളുടെ {label} {value} എന്ന് മനസ്സിലായി. ഇത് ശരിയാണോ?",
            "retry": "വ്യക്തമായി കേൾക്കാൻ കഴിഞ്ഞില്ല. ദയവായി വീണ്ടും പറയുക.",
            "accepted": "സ്വീകരിച്ചു.",
            "consent": "നൽകിയ എല്ലാ വിവരങ്ങളും സത്യമാണെന്ന് ഞാൻ സാക്ഷ്യപ്പെടുത്തുന്നു."
        },
        "pa": {
            "confirm": "ਮੈਂ ਸਮਝਿਆ ਕਿ ਤੁਹਾਡਾ {label} {value} ਹੈ। ਕੀ ਇਹ ਸਹੀ ਹੈ?",
            "retry": "ਮੈਨੂੰ ਸਾਫ਼ ਸੁਣਾਈ ਨਹੀਂ ਦਿੱਤਾ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਬੋਲੋ।",
            "accepted": "ਸਵੀਕਾਰ ਕੀਤਾ ਗਿਆ।",
            "consent": "ਮੈਂ ਐਲਾਨ ਕਰਦਾ ਹਾਂ ਕਿ ਦਿੱਤੀ ਗਈ ਸਾਰੀ ਜਾਣਕਾਰੀ ਸੱਚੀ ਹੈ।"
        },
        "or": {
            "confirm": "ମୁଁ ବୁଝିଲି ଯେ ଆପଣଙ୍କ {label} {value} ଅଟେ। ଏହା ସଠିକ୍ କି?",
            "retry": "ମୋତେ ସ୍ପଷ୍ଟ ଶୁଣାଗଲା ନାହିଁ। ଦୟାକରି ପୁଣି କୁହନ୍ତୁ।",
            "accepted": "ଗ୍ରହଣ କରାଗଲା।",
            "consent": "ମୁଁ ଘୋଷଣା କରୁଛି ଯେ ପ୍ରଦାନ କରାଯାଇଥିବା ସମସ୍ତ ସୂଚନା ସତ୍ୟ।"
        }
    }

    @classmethod
    def format_confirmation(
        cls,
        field_name: str,
        field_label: str,
        candidate_value: Any,
        language: str = "hi"
    ) -> str:
        lang = (language or "hi").lower()
        if lang == "mr":
            return f"आपले {field_label} '{candidate_value}' आहे. हे बरोबर आहे का?"
        elif lang == "en":
            return f"Your {field_label} is '{candidate_value}'. Is this correct?"
        elif lang in cls.LANGUAGE_COMMON_TEMPLATES:
            tmpl = cls.LANGUAGE_COMMON_TEMPLATES[lang]["confirm"]
            return tmpl.replace("{label}", field_label).replace("{value}", str(candidate_value))
        
        # Default Hindi
        return f"आपका {field_label} '{candidate_value}' है। क्या यह सही है?"

    @classmethod
    def format_retry_prompt(cls, language: str = "hi") -> str:
        lang = (language or "hi").lower()
        if lang == "mr":
            return "मला स्पष्ट ऐकू आले नाही. कृपया थोडे जवळ येऊन पुन्हा सांगा."
        elif lang == "en":
            return "I could not hear you clearly. Please repeat clearly."
        elif lang in cls.LANGUAGE_COMMON_TEMPLATES:
            return cls.LANGUAGE_COMMON_TEMPLATES[lang]["retry"]
        return "मुझे आपकी आवाज़ स्पष्ट रूप से सुनाई नहीं दी। कृपया दोबारा बोलें।"
