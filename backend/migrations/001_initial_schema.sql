-- SEVA VAANI (SV-TRD-001) - Initial SQLite Schema Migration
-- PRAGMA requirements: SQLite foreign keys must be enabled per connection:
-- PRAGMA foreign_keys = ON;
-- PRAGMA journal_mode = WAL;

-- 1. Users Table (Argon2id password hashes, ISO-8601 timestamps)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 2. Auth Sessions Table (SHA-256 token hashes, revocable sessions)
CREATE TABLE IF NOT EXISTS auth_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    is_revoked INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 3. Service Sessions Table (Multi-step digital public service workflows)
CREATE TABLE IF NOT EXISTS service_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    service_type TEXT NOT NULL DEFAULT 'scholarship_app',
    language TEXT NOT NULL DEFAULT 'hi',
    status TEXT NOT NULL DEFAULT 'in_progress',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    submitted_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 4. Form Answers Table (Step-by-step citizen answers with explicit confirmation barriers)
CREATE TABLE IF NOT EXISTS form_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_session_id TEXT NOT NULL,
    field_key TEXT NOT NULL,
    answer_value TEXT,
    is_confirmed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (service_session_id) REFERENCES service_sessions (id) ON DELETE CASCADE,
    UNIQUE(service_session_id, field_key)
);

-- 5. Consent Records Table (DPDP Act compliance, explicit consent audit trail)
CREATE TABLE IF NOT EXISTS consent_records (
    id TEXT PRIMARY KEY,
    service_session_id TEXT NOT NULL,
    consent_type TEXT NOT NULL,
    granted INTEGER NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (service_session_id) REFERENCES service_sessions (id) ON DELETE CASCADE
);

-- 6. Engine Compatibility Tables
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

CREATE TABLE IF NOT EXISTS help_tickets (
    ticket_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    field_name TEXT,
    reason TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions (session_id) ON DELETE CASCADE
);

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

-- 7. Performance & Query Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_service_sessions_user ON service_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_form_answers_session ON form_answers(service_session_id);
CREATE INDEX IF NOT EXISTS idx_consent_session ON consent_records(service_session_id);
CREATE INDEX IF NOT EXISTS idx_field_values_session ON field_values(session_id);
CREATE INDEX IF NOT EXISTS idx_turns_session ON turns(session_id);
