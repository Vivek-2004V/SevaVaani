import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.models.database import init_db
from app.schemas.schemas import (
    SessionCreate, TurnInput, ConfirmInput, FallbackTextInput,
    HelpTicketRequest, SubmitInput, LanguageSwitchInput
)
from app.services.form_engine import FormEngine

app = FastAPI(
    title="SEVA VAANI API",
    description="Multilingual Voice-Based Assistance for Completing Digital Public Services (PRD SV-PRD-001)",
    version="1.0.0"
)

# Enable CORS for local and web access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize SQLite database
init_db()

form_engine = FormEngine()

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "SEVA VAANI",
        "version": "1.0.0",
        "supported_languages": ["hi", "mr"],
        "active_service": "scholarship_app"
    }

@app.post("/api/session")
def create_session(payload: SessionCreate):
    try:
        return form_engine.create_session(
            service_id=payload.service_id,
            language=payload.language
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/session/{session_id}")
def get_session(session_id: str):
    try:
        return form_engine.get_session_state(session_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/session/language")
def switch_language(payload: LanguageSwitchInput):
    try:
        return form_engine.switch_language(payload.session_id, payload.language)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/assist/turn")
def assist_turn(payload: TurnInput):
    try:
        return form_engine.process_turn(
            session_id=payload.session_id,
            transcript=payload.transcript,
            input_type=payload.input_type,
            latency_ms=payload.latency_ms or 0
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/confirm")
def confirm_candidate(payload: ConfirmInput):
    try:
        return form_engine.confirm_candidate(
            session_id=payload.session_id,
            field_name=payload.field_name,
            action=payload.action
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/fallback/text")
def fallback_text(payload: FallbackTextInput):
    try:
        return form_engine.process_text_fallback(
            session_id=payload.session_id,
            field_name=payload.field_name,
            typed_value=payload.typed_value
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/help/request")
def request_help(payload: HelpTicketRequest):
    try:
        return form_engine.create_help_ticket(
            session_id=payload.session_id,
            field_name=payload.field_name,
            reason=payload.reason
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/submit")
def submit_application(payload: SubmitInput):
    try:
        result = form_engine.submit_application(
            session_id=payload.session_id,
            consent=payload.consent
        )
        if result["status"] == "blocked":
            return {"status": "blocked", "message": result["message"], "application_id": None}
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/metrics")
def get_metrics():
    try:
        return form_engine.get_metrics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Mount frontend directory for production or unified serving
FRONTEND_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "frontend"
)
if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
