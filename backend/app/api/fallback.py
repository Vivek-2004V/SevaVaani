from fastapi import APIRouter, HTTPException
from app.schemas.field import FallbackTextRequest, HelpRequest
from app.services.form_engine import FormEngine

router = APIRouter(tags=["Fallback & Help"])
engine = FormEngine()

@router.post("/api/fallback/text")
def fallback_text(payload: FallbackTextRequest):
    try:
        field = payload.field or payload.field_name
        val = payload.value or payload.typed_value
        if not field:
            state = engine.get_session_state(payload.session_id)
            field = state.get("current_field")

        return engine.process_text_fallback(
            session_id=payload.session_id,
            field_name=field,
            typed_value=val or ""
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/help/request")
def request_help(payload: HelpRequest):
    try:
        return engine.create_help_ticket(
            session_id=payload.session_id,
            field_name=payload.field_name,
            reason=payload.reason
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
