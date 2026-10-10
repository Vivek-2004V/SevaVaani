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
async def voice_transcribe(audio: UploadFile = File(...), language: str = "hi", field_hint: str = None):
    try:
        content = await audio.read()
        ctx_prompt = None
        hotwords = None
        if field_hint:
            from app.services.contextual_vocabulary import ContextualVocabularyService
            ctx_prompt = ContextualVocabularyService.get_context_prompt_for_field(field_hint, language)
            hotwords = ContextualVocabularyService.get_hotwords_for_field(field_hint)
        return stt_provider.transcribe(content, language, initial_prompt=ctx_prompt, hotwords=hotwords)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
