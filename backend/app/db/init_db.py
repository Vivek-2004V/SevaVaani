"""
Database Initialization & Migration Tool for SEVA VAANI.
Creates all required tables, applies schema migrations safely without data loss,
enforces SQLite foreign keys, creates indexes, and restricts file permissions (0o600).
"""

import os
import sys
import sqlite3
import logging
from typing import Optional

from app.config import settings
from app.db.engine import engine, Base, get_raw_connection
from app.db import models  # noqa: F401 - Register models with Base

logger = logging.getLogger("seva_vaani.db")


def init_database(db_path: Optional[str] = None) -> str:
    """
    Initializes database schema, creates tables, applies safe column migrations,
    and hardens file permissions. Returns path to initialized database.
    """
    target_path = db_path or (
        settings.DATABASE_URL.replace("sqlite:///", "")
        if settings.DATABASE_URL.startswith("sqlite:///")
        else settings.SQLITE_DB_PATH
    )

    db_dir = os.path.dirname(target_path)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)

    # 1. Create SQLAlchemy Models (users, auth_sessions, service_sessions, form_answers, consent_records)
    if db_path:
        from sqlalchemy import create_engine
        temp_engine = create_engine(f"sqlite:///{target_path}")
        Base.metadata.create_all(bind=temp_engine)
        temp_engine.dispose()
    else:
        Base.metadata.create_all(bind=engine)

    # 2. Connect via raw SQLite to verify and maintain legacy compatibility tables
    conn = get_raw_connection(target_path)
    cursor = conn.cursor()

    # Legacy & Form Engine compatibility tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        user_id TEXT,
        service_id TEXT NOT NULL,
        language TEXT NOT NULL,
        current_field TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS field_values (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        field_name TEXT NOT NULL,
        candidate_value TEXT,
        confirmed_value TEXT,
        confidence REAL,
        attempts INTEGER DEFAULT 0,
        confirmed_at TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions (session_id) ON DELETE CASCADE,
        UNIQUE(session_id, field_name)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS turns (
        turn_id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        field_name TEXT NOT NULL,
        input_type TEXT NOT NULL,
        transcript TEXT,
        result TEXT,
        latency_ms INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions (session_id) ON DELETE CASCADE
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS help_tickets (
        ticket_id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        field_name TEXT,
        reason TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions (session_id) ON DELETE CASCADE
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS applications (
        application_id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        service_id TEXT NOT NULL,
        data_json TEXT NOT NULL,
        consent INTEGER NOT NULL,
        status TEXT NOT NULL,
        submitted_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions (session_id) ON DELETE CASCADE
    );
    """)

    # 3. Safe Migrations for legacy databases
    cursor.execute("PRAGMA table_info(sessions);")
    columns = [row[1] for row in cursor.fetchall()]
    if "session_id" not in columns and "id" in columns:
        cursor.execute("ALTER TABLE sessions RENAME COLUMN id TO session_id;")
    if "user_id" not in columns:
        cursor.execute("ALTER TABLE sessions ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE;")

    cursor.execute("PRAGMA table_info(field_values);")
    fv_cols = [row[1] for row in cursor.fetchall()]
    if "confirmed_at" not in fv_cols:
        cursor.execute("ALTER TABLE field_values ADD COLUMN confirmed_at TEXT;")

    cursor.execute("PRAGMA table_info(turns);")
    turn_cols = [row[1] for row in cursor.fetchall()]
    if "turn_id" not in turn_cols and "id" in turn_cols:
        cursor.execute("ALTER TABLE turns RENAME COLUMN id TO turn_id;")
    if "result" not in turn_cols and "action" in turn_cols:
        cursor.execute("ALTER TABLE turns RENAME COLUMN action TO result;")
    elif "result" not in turn_cols:
        cursor.execute("ALTER TABLE turns ADD COLUMN result TEXT;")

    cursor.execute("PRAGMA table_info(help_tickets);")
    ht_cols = [row[1] for row in cursor.fetchall()]
    if "ticket_id" not in ht_cols and "id" in ht_cols:
        cursor.execute("ALTER TABLE help_tickets RENAME COLUMN id TO ticket_id;")

    cursor.execute("PRAGMA table_info(applications);")
    app_cols = [row[1] for row in cursor.fetchall()]
    if "application_id" not in app_cols and "id" in app_cols:
        cursor.execute("ALTER TABLE applications RENAME COLUMN id TO application_id;")

    # 4. Performance Indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token_hash);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_service_sessions_user ON service_sessions(user_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_form_answers_session ON form_answers(service_session_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_consent_session ON consent_records(service_session_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_field_values_session ON field_values(session_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_turns_session ON turns(session_id);")

    conn.commit()
    conn.close()

    # 5. Restrict Database File Permissions (0o600: read/write by owner only)
    try:
        if os.path.exists(target_path):
            os.chmod(target_path, 0o600)
    except Exception as e:
        logger.warning("Could not set 0o600 permissions on %s: %s", target_path, str(e))

    logger.info("Database initialized successfully at %s", target_path)
    return target_path


if __name__ == "__main__":
    path = init_database()
    print(f"SEVA VAANI Database initialized successfully at: {path}")
