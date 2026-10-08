import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.db.database import init_db
from app.api.sessions import router as sessions_router
from app.api.turns import router as turns_router
from app.api.confirmations import router as confirmations_router
from app.api.fallback import router as fallback_router
from app.api.submission import router as submission_router
from app.api.metrics import router as metrics_router

# Initialize Database Schema
init_db()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Multilingual Voice-Based Assistance for Completing Digital Public Services (SV-TRD-001)",
    version=settings.VERSION
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Modular Routers (TRD Section 6)
app.include_router(sessions_router)
app.include_router(turns_router)
app.include_router(confirmations_router)
app.include_router(fallback_router)
app.include_router(submission_router)
app.include_router(metrics_router)

# Mount frontend directory for production or unified serving
FRONTEND_DIST = os.path.join(settings.BASE_DIR, "frontend", "dist")
FRONTEND_DIR = os.path.join(settings.BASE_DIR, "frontend")

if os.path.exists(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend_dist")
elif os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
