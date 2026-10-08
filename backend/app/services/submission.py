import json
from datetime import datetime
from typing import Dict, Any, List
from app.db.repositories import ApplicationRepository, SessionRepository, FieldValueRepository
from app.core.errors import ConsentRequiredError

class SubmissionService:
    @staticmethod
    def submit(session_id: str, consent: bool, required_fields: List[str]) -> Dict[str, Any]:
        session = SessionRepository.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        lang = session.language

        # TC12: Submission blocked without explicit consent
        if not consent:
            msg = ("आवेदन जमा करने के लिए आपकी स्पष्ट सहमति आवश्यक है।"
                   if lang == "hi" else
                   "अर्ज सादर करण्यासाठी आपली स्पष्ट संमती आवश्यक आहे.")
            return {
                "status": "blocked",
                "application_id": None,
                "message": msg
            }

        # Verify all fields confirmed
        fvs = FieldValueRepository.get_all_for_session(session_id)
        confirmed_dict = {}
        for fv in fvs:
            if fv.confirmed and fv.confirmed_value is not None:
                try:
                    val = json.loads(fv.confirmed_value)
                except Exception:
                    val = fv.confirmed_value
                confirmed_dict[fv.field_name] = val

        missing = [f for f in required_fields if f not in confirmed_dict]
        if missing:
            msg = (f"कृपया पहले सभी आवश्यक फ़ील्ड पूरे करें: {', '.join(missing)}"
                   if lang == "hi" else
                   f"कृपया आधी सर्व आवश्यक माहिती भरा: {', '.join(missing)}")
            return {
                "status": "incomplete",
                "application_id": None,
                "message": msg
            }

        # Generate Application ID
        app_id = ApplicationRepository.create(
            session_id=session_id,
            service_id=session.service_id,
            data_json=json.dumps(confirmed_dict, ensure_ascii=False),
            consent=consent
        )

        SessionRepository.update_field(session_id, current_field=None, status="completed", attempts=0)

        success_msg = (
            f"बधाई! आपका छात्रवृत्ति आवेदन सफलतापूर्वक जमा हो गया है। आपका आवेदन क्रमांक है: {app_id}."
            if lang == "hi" else
            f"अभिनंदन! आपला शिष्यवृत्ती अर्ज यशस्वीरित्या सादर झाला आहे. आपला अर्ज क्रमांक आहे: {app_id}."
        )

        return {
            "status": "success",
            "application_id": app_id,
            "submitted_at": datetime.utcnow().isoformat(),
            "message": success_msg
        }
