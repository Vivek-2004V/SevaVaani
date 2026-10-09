from fastapi import APIRouter, HTTPException
from app.schemas.submission import SubmissionRequest
from app.services.form_engine import FormEngine

router = APIRouter(prefix="/api/submit", tags=["Submission"])
engine = FormEngine()

@router.post("")
def submit_application(payload: SubmissionRequest):
    try:
        result = engine.submit_application(
            session_id=payload.session_id,
            consent=payload.consent
        )
        if result["status"] == "blocked":
            return {
                "status": "blocked",
                "message": result["message"],
                "application_id": None
            }
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
