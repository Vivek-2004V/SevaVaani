from typing import Dict, Any, Tuple

class ConfidenceGate:
    """
    Implements TRD Section 4 & 5 Confidence Gate.
    Determines next action based on extraction confidence, validation result, and failure count.
    """
    HIGH_CONFIDENCE = 0.85
    MEDIUM_CONFIDENCE = 0.60

    @classmethod
    def evaluate(
        cls,
        candidate_value: Any,
        confidence: float,
        is_valid: bool,
        validation_error: str,
        attempt_count: int,
        language: str = "hi"
    ) -> Dict[str, Any]:
        # 1. Check if failure count >= 3 -> Human help escalation (FR-011 / TC09)
        if attempt_count >= 3:
            msg = ("लगातार तीन बार समझने में कठिनाई हुई। सहायता टिकट जनरेट कर दिया गया है।"
                   if language == "hi" else
                   "सतत तीन वेळा समजण्यात अडचण आली. मदत तिकीट तयार केले आहे.")
            return {
                "action": "HUMAN_HELP",
                "candidate_value": None,
                "confidence": confidence,
                "prompt": msg
            }

        # 2. Check if failure count == 2 -> Text fallback (FR-010 / TC08)
        if attempt_count == 2 and (not is_valid or confidence < cls.MEDIUM_CONFIDENCE):
            msg = ("आवाज़ पहचानने में समस्या आ रही है। कृपया नीचे दिए गए बॉक्स में टाइप करें।"
                   if language == "hi" else
                   "आवाज ओळखण्यात अडचण येत आहे. कृपया खाली दिलेल्या बॉक्समध्ये टाईप करा.")
            return {
                "action": "TEXT_FALLBACK",
                "candidate_value": None,
                "confidence": confidence,
                "prompt": msg
            }

        # 3. Low confidence (< 0.60) or empty candidate -> Ask user to repeat (TC07)
        if confidence < cls.MEDIUM_CONFIDENCE or candidate_value is None:
            msg = ("मुझे आपकी आवाज़ स्पष्ट रूप से सुनाई नहीं दी। कृपया थोड़ा साफ़ और नज़दीक होकर दोबारा बोलें।"
                   if language == "hi" else
                   "मला आपला आवाज स्पष्ट ऐकू आला नाही. कृपया थोडे स्पष्ट आणि जवळ येऊन पुन्हा बोला.")
            return {
                "action": "RETRY",
                "candidate_value": None,
                "confidence": confidence,
                "prompt": msg
            }

        # 4. Check domain validation rules
        if not is_valid:
            return {
                "action": "INVALID",
                "candidate_value": None,
                "confidence": confidence,
                "prompt": validation_error
            }

        # 5. Medium confidence -> Ask clarification
        if confidence < cls.HIGH_CONFIDENCE:
            msg = (f"क्या आपका आशय '{candidate_value}' है? कृपया हाँ या नहीं में पुष्टि करें।"
                   if language == "hi" else
                   f"आपला अर्थ '{candidate_value}' असा आहे का? कृपया होय किंवा नाही असे सांगा.")
            return {
                "action": "CONFIRM",
                "candidate_value": candidate_value,
                "confidence": confidence,
                "prompt": msg
            }

        # 6. High confidence + valid -> Need confirmation gate
        return {
            "action": "CONFIRM",
            "candidate_value": candidate_value,
            "confidence": confidence,
            "prompt": None
        }
