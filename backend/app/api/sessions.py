from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from app.schemas.session import SessionCreateRequest, SessionLanguageRequest
from app.services.form_engine import FormEngine
from app.api.auth import get_optional_current_user
from app.db.models import User

router = APIRouter(prefix="/api/session", tags=["Session"])
engine = FormEngine()

@router.post("")
def create_session(
    payload: SessionCreateRequest,
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    try:
        return engine.create_session(
            service_id=payload.service_id,
            language=payload.language,
            user_id=current_user.id if current_user else None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{session_id}")
def get_session(
    session_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    try:
        from app.db.engine import get_raw_connection
        from app.core.config import settings

        # Query session row to inspect ownership
        conn = get_raw_connection(settings.SQLITE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT user_id FROM sessions WHERE session_id = ?", (session_id,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

        # If session is owned by an authenticated user, enforce access control
        session_user_id = row["user_id"] if isinstance(row, dict) or hasattr(row, "keys") else row[0]
        if session_user_id:
            if not current_user or current_user.id != session_user_id:
                raise HTTPException(
                    status_code=403,
                    detail="Access denied: You do not have permission to access this session"
                )

        return engine.get_session_state(session_id)
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/language")
def switch_language(payload: SessionLanguageRequest):
    try:
        return engine.switch_language(payload.session_id, payload.language)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{session_id}/language")
def switch_language_path(session_id: str, payload: dict):
    try:
        language = payload.get("language", "hi")
        return engine.switch_language(session_id, language)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
