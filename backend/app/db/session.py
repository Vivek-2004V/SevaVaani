"""
Database Session and Engine Management for SEVA VAANI.
Provides engine, SessionLocal, get_db dependency, and raw SQLite connection helper.
Enforces foreign-key constraints and WAL journal mode on all SQLite connections.
"""

import os
import sqlite3
from typing import Generator, Optional
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import Engine

from app.core.config import settings
from app.db.base import Base

# 1. Database URL & Engine
DATABASE_URL = settings.DATABASE_URL
if DATABASE_URL.startswith("sqlite:///"):
    db_file_path = DATABASE_URL.replace("sqlite:///", "")
    db_dir = os.path.dirname(db_file_path)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False
    )
else:
    # Production-grade connection pooling for PostgreSQL / MySQL
    engine = create_engine(
        DATABASE_URL,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_timeout=settings.DB_POOL_TIMEOUT,
        pool_recycle=settings.DB_POOL_RECYCLE,
        pool_pre_ping=True,
        echo=False
    )


# 2. Enforce SQLite Foreign Keys on all connections
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.close()


# 3. Sessionmaker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# 4. Dependency for FastAPI endpoints
def get_db() -> Generator:
    """Yields a database session and safely closes it upon request completion."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# 5. Raw Connection Helper with Foreign Keys & Row Factory
def get_raw_connection(db_path: Optional[str] = None) -> sqlite3.Connection:
    """Returns a raw SQLite connection with foreign keys and row_factory enabled."""
    target_path = db_path or (
        DATABASE_URL.replace("sqlite:///", "") if DATABASE_URL.startswith("sqlite:///") else settings.SQLITE_DB_PATH
    )
    conn = sqlite3.connect(target_path)
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.row_factory = sqlite3.Row
    return conn
