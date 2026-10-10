from __future__ import annotations

import os
import time
from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import text
from app.services.form_engine import FormEngine
from app.db.session import engine as db_engine
from app.core.cache import cache
from app.core.tasks import task_manager

router = APIRouter(tags=["Metrics & Health"])
engine = FormEngine()
_START_TIME = time.time()


@router.get("/api/health")
def health_check():
    """General health check endpoint for monitoring dashboards and reverse proxies."""
    # Test DB status
    db_ok = True
    try:
        with db_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    return {
        "status": "healthy" if db_ok else "degraded",
        "service": "SEVA VAANI",
        "version": "1.0.0",
        "uptime_seconds": int(time.time() - _START_TIME),
        "supported_languages": ["hi", "mr", "bn", "te", "ta", "gu", "kn", "ml", "pa", "or", "en"],
        "active_service": "scholarship_app",
        "architecture": "Pan-India Voice Interface + Deterministic State Machine (SV-TRD-001)",
        "subsystems": {
            "database": "connected" if db_ok else "unreachable",
            "db_dialect": db_engine.dialect.name,
            "cache": cache.stats(),
            "workers": task_manager.stats(),
        }
    }


@router.get("/api/health/live")
def liveness_probe():
    """Kubernetes liveness probe: returns 200 if the process is responsive."""
    return {"status": "alive", "timestamp": time.time()}


@router.get("/api/health/ready")
def readiness_probe(response: Response):
    """Kubernetes readiness probe: verifies database connectivity and core subsystems."""
    try:
        with db_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {
            "status": "ready",
            "database": "connected",
            "dialect": db_engine.dialect.name,
        }
    except Exception as e:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "not_ready",
            "database": "disconnected",
            "error": str(e),
        }


@router.get("/api/metrics")
def get_metrics():
    """Domain application metrics from the Form Engine state machine."""
    try:
        return engine.get_metrics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/metrics/system")
def get_system_metrics():
    """High-resolution scalability & infrastructure metrics."""
    pool_info = {}
    if hasattr(db_engine.pool, "size"):
        pool_info = {
            "pool_size": db_engine.pool.size(),
            "checked_in": db_engine.pool.checkedin(),
            "checked_out": db_engine.pool.checkedout(),
            "overflow": db_engine.pool.overflow(),
        }

    return {
        "timestamp": time.time(),
        "uptime_seconds": int(time.time() - _START_TIME),
        "database_pool": pool_info,
        "cache": cache.stats(),
        "tasks": task_manager.stats(),
    }
