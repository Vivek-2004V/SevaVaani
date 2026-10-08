from fastapi import APIRouter, HTTPException, UploadFile, File
from app.schemas.turn import TurnRequest
from app.services.form_engine import FormEngine
from app.providers.stt_provider import BrowserSTTFallback

router = APIRouter(tags=["Turns"])
engine = FormEngine()
stt_provider = BrowserSTTFallback()

@router.post("/api/assist/turn")
def assist_turn(payload: TurnRequest):
    try:
        return engine.process_turn(
            session_id=payload.session_id,
            transcript=payload.transcript,
            input_type=payload.input_type,
            latency_ms=payload.latency_ms or 0
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/voice/transcribe")
async def voice_transcribe(audio: UploadFile = File(...), language: str = "hi"):
    try:
        content = await audio.read()
        return stt_provider.transcribe(content, language)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
