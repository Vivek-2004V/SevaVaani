from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from app.schemas.submission import SubmissionRequest
from app.services.form_engine import FormEngine
from app.api.auth import get_optional_current_user
from app.db.models import User

router = APIRouter(prefix="/api/submit", tags=["Submission"])
engine = FormEngine()

@router.post("")
def submit_application(
    payload: SubmissionRequest,
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    try:
        from app.db.engine import get_raw_connection
        from app.core.config import settings

        conn = get_raw_connection(settings.SQLITE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT user_id FROM sessions WHERE session_id = ?", (payload.session_id,))
        row = cursor.fetchone()
        conn.close()

        if row:
            session_user_id = row["user_id"] if isinstance(row, dict) or hasattr(row, "keys") else row[0]
            if session_user_id:
                if not current_user or current_user.id != session_user_id:
                    raise HTTPException(
                        status_code=403,
                        detail="Access denied: You do not have permission to submit this session"
                    )

        result = engine.submit_application(
            session_id=payload.session_id,
            consent=payload.consent
        )
        if result["status"] in ("blocked", "incomplete"):
            return {
                "status": result["status"],
                "message": result["message"],
                "application_id": None,
                "persistence_scope": "none",
                "government_portal_submitted": False
            }
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
