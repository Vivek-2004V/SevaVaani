"""
Models Package for SEVA VAANI.
Exposes all SQLAlchemy ORM models and database initialization hooks.
"""

from app.models.user import User, generate_uuid, utcnow_iso
from app.models.auth_session import AuthSession
from app.models.service_session import ServiceSession
from app.models.form_answer import FormAnswer, ConsentRecord, DocumentVerification
from app.models.database import get_connection, init_db

__all__ = [
    "User",
    "AuthSession",
    "ServiceSession",
    "FormAnswer",
    "ConsentRecord",
    "DocumentVerification",
    "generate_uuid",
    "utcnow_iso",
    "get_connection",
    "init_db"
]
