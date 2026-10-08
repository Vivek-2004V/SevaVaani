from fastapi import APIRouter, HTTPException
from app.schemas.session import SessionCreateRequest, SessionLanguageRequest
from app.services.form_engine import FormEngine

router = APIRouter(prefix="/api/session", tags=["Session"])
engine = FormEngine()

@router.post("")
def create_session(payload: SessionCreateRequest):
    try:
        return engine.create_session(
            service_id=payload.service_id,
            language=payload.language
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{session_id}")
def get_session(session_id: str):
    try:
        return engine.get_session_state(session_id)
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
