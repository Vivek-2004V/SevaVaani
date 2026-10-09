"""
API Routes Package for SEVA VAANI.
Modular routing layer implementing:
- auth: citizen registration, login, session token validation
- voice: speech-to-text, turn orchestrator, confirmation gates, fallback
- service_sessions: persistent multi-step form applications and answer records
"""

from __future__ import annotations

from app.api.routes.auth import router as auth_router
from app.api.routes.voice import router as voice_router
from app.api.routes.service_sessions import router as service_sessions_router

__all__ = [
    "auth_router",
    "voice_router",
    "service_sessions_router",
]
