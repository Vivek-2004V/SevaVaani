from fastapi import APIRouter, HTTPException
from app.schemas.field import ConfirmRequest
from app.services.form_engine import FormEngine

router = APIRouter(prefix="/api/confirm", tags=["Confirmation"])
engine = FormEngine()

@router.post("")
def confirm_candidate(payload: ConfirmRequest):
    try:
        # Resolve action: if confirmed is boolean True -> "confirm", False -> "reject"
        action = payload.action
        if not action and payload.confirmed is not None:
            if isinstance(payload.confirmed, bool):
                action = "confirm" if payload.confirmed else "reject"
            elif str(payload.confirmed).lower() in ["true", "yes", "1", "confirm"]:
                action = "confirm"
            else:
                action = "reject"
        
        # If field_name not provided, get from current state
        field_name = payload.field_name
        if not field_name:
            state = engine.get_session_state(payload.session_id)
            field_name = state.get("current_field")

        return engine.confirm_candidate(
            session_id=payload.session_id,
            field_name=field_name,
            action=action or "confirm"
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
