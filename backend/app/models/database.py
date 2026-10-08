import sqlite3
import os
import json
from datetime import datetime
from typing import Optional, Dict, Any, List

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "seva_vaani.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Sessions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        service_id TEXT NOT NULL,
        language TEXT NOT NULL,
        current_field TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)
    
    # 2. FieldValues table
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
        FOREIGN KEY (session_id) REFERENCES sessions (session_id),
        UNIQUE(session_id, field_name)
    );
    """)
    
    # 3. Turns table
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
        FOREIGN KEY (session_id) REFERENCES sessions (session_id)
    );
    """)
    
    # 4. HelpTickets table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS help_tickets (
        ticket_id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        field_name TEXT,
        reason TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions (session_id)
    );
    """)
    
    # 5. Applications table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS applications (
        application_id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        service_id TEXT NOT NULL,
        data_json TEXT NOT NULL,
        consent INTEGER NOT NULL,
        status TEXT NOT NULL,
        submitted_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions (session_id)
    );
    """)
    
    conn.commit()
    conn.close()
