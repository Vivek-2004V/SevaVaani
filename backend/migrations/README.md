# SEVA VAANI — Database Migrations & Persistence Architecture

This directory houses the versioned schema definitions and migration scripts for the SEVA VAANI SQLite database.

## Architecture Highlights

1. **Atomic Engine & Connection Management**:
   - Connections are initialized via `app.db.session.SessionLocal` (SQLAlchemy 2.0 ORM) and `app.db.session.get_raw_connection()`.
   - On every SQLite connection, `PRAGMA foreign_keys = ON;` is strictly enforced.
   - Database journal mode is set to Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) for concurrent read/write throughput.

2. **Security & Data Isolation**:
   - File permissions are locked down to `0o600` (read/write by owner only).
   - Passwords are encrypted using Argon2id with recommended memory and iteration cost parameters.
   - Authentication tokens are hashed using SHA-256 before storage; raw tokens are never persisted in plaintext.

3. **Tables**:
   - `users`: Registered citizen accounts (`id`, `email`, `hashed_password`, `is_active`, timestamps).
   - `auth_sessions`: Revocable token sessions (`id`, `user_id`, `token_hash`, `expires_at`, `is_revoked`).
   - `service_sessions`: Workflow instances (`id`, `user_id`, `service_type`, `language`, `status`, `submitted_at`).
   - `form_answers`: Field-level responses (`id`, `service_session_id`, `field_key`, `answer_value`, `is_confirmed`).
   - `consent_records`: Explicit digital consent audit trail complying with the DPDP Act.
   - Legacy engine tables: `sessions`, `field_values`, `turns`, `help_tickets`, `applications`.

## Executing Migrations

To re-initialize or verify schema migrations programmatically:
```bash
python -m app.db.init_db
```
Or execute the DDL script via the SQLite CLI:
```bash
sqlite3 seva_vaani.db < migrations/001_initial_schema.sql
```
