from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from app.schemas.field import FallbackTextRequest, HelpRequest
from app.services.form_engine import FormEngine
from app.api.auth import get_optional_current_user
from app.db.models import User

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
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/help/request")
def request_help(
    payload: HelpRequest,
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    try:
        if not payload.session_id and not current_user:
            # Need either an active session or an authenticated user
            pass

        return engine.create_help_ticket(
            session_id=payload.session_id or "",
            field_name=payload.field_name,
            reason=payload.reason,
            category=payload.category or "other",
            description=payload.description,
            user_id=current_user.id if current_user else None
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
