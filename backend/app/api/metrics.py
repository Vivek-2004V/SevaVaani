from fastapi import APIRouter, HTTPException
from app.services.form_engine import FormEngine

router = APIRouter(tags=["Metrics & Health"])
engine = FormEngine()

@router.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "SEVA VAANI",
        "version": "1.0.0",
        "supported_languages": ["hi", "mr", "bn", "te", "ta", "gu", "kn", "ml", "pa", "or", "en"],
        "active_service": "scholarship_app",
        "architecture": "Pan-India Voice Interface + Deterministic State Machine (SV-TRD-001)"
    }

@router.get("/api/metrics")
def get_metrics():
    try:
        return engine.get_metrics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
