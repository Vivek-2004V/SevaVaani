import sqlite3
import os
from app.config import settings

def get_connection():
    conn = sqlite3.connect(settings.SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # sessions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        service_id TEXT NOT NULL,
        language TEXT NOT NULL,
        status TEXT NOT NULL,
        current_field TEXT,
        attempts INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    # field_values table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS field_values (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        field_name TEXT NOT NULL,
        candidate_value TEXT,
        confirmed_value TEXT,
        confidence REAL DEFAULT 0.0,
        confirmed INTEGER DEFAULT 0,
        attempts INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions (id),
        UNIQUE(session_id, field_name)
    );
    """)

    # turns table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS turns (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        field_name TEXT NOT NULL,
        input_type TEXT NOT NULL,
        transcript TEXT,
        confidence REAL,
        action TEXT NOT NULL,
        latency_ms INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions (id)
    );
    """)

    # help_tickets table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS help_tickets (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        field_name TEXT,
        reason TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions (id)
    );
    """)

    # applications table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        service_id TEXT NOT NULL,
        consent INTEGER NOT NULL,
        status TEXT NOT NULL,
        data_json TEXT NOT NULL,
        submitted_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions (id)
    );
    """)

    conn.commit()
    conn.close()
