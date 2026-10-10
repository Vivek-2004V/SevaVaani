from __future__ import annotations

import os
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.models.database import init_db
from app.api.routes import (
    auth_router,
    voice_router,
    service_sessions_router,
)
from app.api.sessions import router as sessions_router
from app.api.submission import router as submission_router
from app.api.metrics import router as metrics_router
from app.api.languages import router as languages_router
from app.api.document_verification import router as doc_verify_router
from app.api.speech import router as speech_router
from app.api.dataset import router as dataset_router
from app.api.benchmark import router as benchmark_router
from app.api.fine_tuning import router as fine_tuning_router
from app.api.feedback import router as feedback_router
from app.api.guidance import router as guidance_router
from app.api.audio_chunks import router as audio_chunks_router
from app.api.help import router as help_router

import logging
from app.services.privacy_firewall import SensitiveDataLoggingFilter

# Install Privacy Log Filter to redact sensitive tokens & citizen identity data from all application logs
_privacy_log_filter = SensitiveDataLoggingFilter()
logging.getLogger().addFilter(_privacy_log_filter)
logging.getLogger("seva_vaani").addFilter(_privacy_log_filter)

# Initialize Database Schema
init_db()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Multilingual Voice-Based Assistance for Completing Digital Public Services (SV-TRD-001)",
    version=settings.VERSION
)

# CORS - Strictly restricted to authorized origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    # Explicit allowlist: Content-Type for JSON bodies, Authorization for bearer tokens.
    # Never use ["*"] here; that would permit any custom header including attacker-controlled ones.
    allow_headers=["Content-Type", "Authorization", "Accept", "X-Requested-With"],
    max_age=600,
)


# HTTP Security Headers middleware
# Applied to every response. These are defense-in-depth; they complement CSP/CORS, not replace them.
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    # Prevent MIME-type sniffing attacks.
    response.headers["X-Content-Type-Options"] = "nosniff"
    # Deny embedding in iframes from external origins (clickjacking protection).
    response.headers["X-Frame-Options"] = "DENY"
    # Restrict referrer to same origin; prevents form-field URLs leaking to third parties.
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    # Disable browser features not needed by this API backend.
    response.headers["Permissions-Policy"] = "microphone=(), camera=(), geolocation=()"
    # Note: HSTS (Strict-Transport-Security) is intentionally omitted here because
    # the local dev server runs on plain HTTP. Add it in your reverse-proxy/CDN config
    # for production with: Strict-Transport-Security: max-age=63072000; includeSubDomains
    return response

# Register Modular Routers (TRD Section 6)
app.include_router(auth_router)
app.include_router(voice_router)
app.include_router(service_sessions_router)
app.include_router(sessions_router)
app.include_router(submission_router)
app.include_router(metrics_router)
app.include_router(languages_router)
app.include_router(doc_verify_router)
app.include_router(speech_router)
app.include_router(dataset_router)
app.include_router(benchmark_router)
app.include_router(fine_tuning_router)
app.include_router(feedback_router)
app.include_router(guidance_router)
app.include_router(audio_chunks_router)
app.include_router(help_router)

# Mount frontend directory for production or unified serving
FRONTEND_DIST = os.path.join(settings.BASE_DIR, "frontend", "dist")
FRONTEND_DIR = os.path.join(settings.BASE_DIR, "frontend")

if os.path.exists(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend_dist")
elif os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
