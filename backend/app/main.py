from __future__ import annotations

import os
from fastapi import FastAPI
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
    allow_headers=["*"],
)

# Register Modular Routers (TRD Section 6)
app.include_router(auth_router)
app.include_router(voice_router)
app.include_router(service_sessions_router)
app.include_router(sessions_router)
app.include_router(submission_router)
app.include_router(metrics_router)
app.include_router(languages_router)

# Mount frontend directory for production or unified serving
FRONTEND_DIST = os.path.join(settings.BASE_DIR, "frontend", "dist")
FRONTEND_DIR = os.path.join(settings.BASE_DIR, "frontend")

if os.path.exists(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend_dist")
elif os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
