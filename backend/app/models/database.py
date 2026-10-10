"""
Database connection and initialization module for SEVA VAANI.
Provides backwards-compatible interface bridging to app.db.engine and app.db.init_db.
Enforces foreign-key constraints and owner-only 0o600 file permissions.
"""

import os
import sqlite3
from typing import Optional

from app.config import settings
from app.db.engine import get_raw_connection

DB_PATH = (
    settings.DATABASE_URL.replace("sqlite:///", "")
    if settings.DATABASE_URL.startswith("sqlite:///")
    else settings.SQLITE_DB_PATH
)


def get_connection(db_path: Optional[str] = None) -> sqlite3.Connection:
    """Returns a raw SQLite connection with PRAGMA foreign_keys = ON and Row factory."""
    return get_raw_connection(db_path or DB_PATH)


def init_db(db_path: Optional[str] = None) -> str:
    """Initializes all database tables, indexes, and applies security permissions."""
    from app.db.init_db import init_database
    return init_database(db_path or DB_PATH)

