-- SEVA VAANI (SV-TRD-002) - Provenance, Verification Status & Index Hardening
-- Backward-compatible schema evolution. Preserves all existing records.

PRAGMA foreign_keys = ON;

-- 1. Document Verification Audit Table (Metadata & Provenance ONLY - ZERO Raw Binaries)
CREATE TABLE IF NOT EXISTS document_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    document_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('MATCH', 'PHONETIC_MATCH', 'MISMATCH', 'INELIGIBLE_DOCUMENT')),
    extracted_fields_hash TEXT NOT NULL,
    discrepancy_count INTEGER NOT NULL DEFAULT 0,
    verified_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions (session_id) ON DELETE CASCADE
);

-- 2. Performance & Query Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_help_tickets_session ON help_tickets(session_id);
CREATE INDEX IF NOT EXISTS idx_applications_session ON applications(session_id);
CREATE INDEX IF NOT EXISTS idx_doc_verif_session ON document_verifications(session_id);
