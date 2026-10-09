from typing import Dict, Any, Tuple

class ConfidenceEngine:
    """
    Evaluates extraction confidence, validation status, and turn failure count
    to determine the state machine behavior and citizen feedback according to PRD Section 15.
    Supports Hindi ('hi'), Marathi ('mr'), and English ('en').
    """

    HIGH_CONFIDENCE_THRESHOLD = 0.85
    MEDIUM_CONFIDENCE_THRESHOLD = 0.60

    @classmethod
    def evaluate(
        cls,
        extraction_result: Dict[str, Any],
        is_valid: bool,
        validation_error: str,
        attempt_count: int,
        language: str = "hi"
    ) -> Dict[str, Any]:
        """
        Determines:
        - action: 'need_confirmation' | 'retry' | 'text_fallback' | 'human_help' | 'invalid'
        - prompt_message
        - audio_prompt
        """
        confidence = extraction_result.get("confidence", 0.0)
        needs_clarification = extraction_result.get("needs_clarification", False)
        candidate_value = extraction_result.get("value")

        # 1. Check if failure count >= 3 -> Escalate to human help
        if attempt_count >= 3:
            if language == "en":
                msg = "We had difficulty understanding after multiple attempts. We have created a Help Ticket for you. You can type below or request operator assistance."
            elif language == "mr":
                msg = "सतत तीन वेळा समजण्यात अडचण आली. आम्ही आपल्यासाठी मदत तिकीट तयार केले आहे. आपण मजकूर टाईप करू शकता किंवा ऑपरेटरची मदत घेऊ शकता."
            else:
                msg = "लगातार तीन बार समझने में कठिनाई हुई। हमने आपके लिए सहायता टिकट (Help Ticket) बना दिया है। आप टेक्स्ट में लिख सकते हैं या ऑपरेटर की मदद ले सकते हैं।"
            return {
                "action": "human_help",
                "candidate_value": None,
                "confidence": confidence,
                "message": msg,
                "audio_prompt": msg
            }

        # 2. Check if failure count == 2 -> Offer text fallback prominently (TC08)
        if attempt_count == 2 and (not is_valid or confidence < cls.MEDIUM_CONFIDENCE_THRESHOLD):
            if language == "en":
                msg = "We are having trouble recognizing speech. Please type your answer in the box below, or try speaking again."
            elif language == "mr":
                msg = "आवाज ओळखण्यात अडचण येत आहे. कृपया खाली दिलेल्या बॉक्समध्ये टाईप करून उत्तर नोंदवा, किंवा पुन्हा बोला."
            else:
                msg = "आवाज़ पहचानने में समस्या आ रही है। कृपया नीचे दिए गए बॉक्स में टाइप करके उत्तर दर्ज करें, या दोबारा बोलें।"
            return {
                "action": "text_fallback",
                "candidate_value": None,
                "confidence": confidence,
                "message": msg,
                "audio_prompt": msg
            }

        # 3. Low confidence (< 0.60) or no candidate extracted -> Ask user to repeat (TC07)
        if confidence < cls.MEDIUM_CONFIDENCE_THRESHOLD or candidate_value is None:
            if language == "en":
                msg = "I could not hear you clearly. Please speak clearly and try again."
            elif language == "mr":
                msg = "मला आपला आवाज स्पष्ट ऐकू आला नाही. कृपया थोडे स्पष्ट आणि जवळ येऊन पुन्हा बोला."
            else:
                msg = "मुझे आपकी आवाज़ स्पष्ट रूप से सुनाई नहीं दी। कृपया थोड़ा साफ़ और नज़दीक होकर दोबारा बोलें।"
            return {
                "action": "retry",
                "candidate_value": None,
                "confidence": confidence,
                "message": msg,
                "audio_prompt": msg
            }

        # 4. Check invalid value according to business rules (TC04, TC15)
        if not is_valid:
            return {
                "action": "invalid",
                "candidate_value": None,
                "confidence": confidence,
                "message": validation_error,
                "audio_prompt": validation_error
            }

        # 5. Medium confidence (0.60 to 0.85) -> Clarify question
        if confidence < cls.HIGH_CONFIDENCE_THRESHOLD or needs_clarification:
            if language == "en":
                msg = f"Did you mean '{candidate_value}'? Please confirm with Yes or No."
            elif language == "mr":
                msg = f"आपला अर्थ '{candidate_value}' असा आहे का? कृपया होय किंवा नाही असे सांगा."
            else:
                msg = f"क्या आपका आशय '{candidate_value}' है? कृपया हाँ या नहीं में पुष्टि करें।"
            return {
                "action": "need_confirmation",
                "candidate_value": candidate_value,
                "confidence": confidence,
                "message": msg,
                "audio_prompt": msg
            }

        # 6. High confidence + valid -> Need confirmation gate (PRD core rule: unconfirmed values = 0)
        return {
            "action": "need_confirmation",
            "candidate_value": candidate_value,
            "confidence": confidence,
            "message": None,  # Will be formatted by field confirmation template
            "audio_prompt": None
        }
