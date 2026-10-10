"""
Verification Suite for Migration 002: Provenance, Verification Status,
Document Verification Audit Trail, and Authenticated Field Encryption.
"""

import os
import sys
import uuid
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.main import app
from app.core.config import settings
from app.db.engine import get_raw_connection
from app.core.encryption import FieldEncryptionService
from app.services.form_engine import FormEngine

@pytest.fixture
def client():
    return TestClient(app)


def test_schema_migration_columns_and_tables_exist():
    """Verify that migration 002 added all required columns, constraints, and audit tables."""
    conn = get_raw_connection(settings.SQLITE_DB_PATH)
    cursor = conn.cursor()

    # Integrity
    cursor.execute("PRAGMA integrity_check;")
    assert cursor.fetchone()[0] == "ok"

    cursor.execute("PRAGMA foreign_key_check;")
    assert len(cursor.fetchall()) == 0

    # form_answers columns
    cursor.execute("PRAGMA table_info(form_answers);")
    fa_cols = {r["name"] for r in cursor.fetchall()}
    assert "source" in fa_cols
    assert "verification_status" in fa_cols
    assert "document_type" in fa_cols
    assert "is_encrypted" in fa_cols

    # field_values columns
    cursor.execute("PRAGMA table_info(field_values);")
    fv_cols = {r["name"] for r in cursor.fetchall()}
    assert "source" in fv_cols
    assert "verification_status" in fv_cols
    assert "is_encrypted" in fv_cols

    # document_verifications table
    cursor.execute("PRAGMA table_info(document_verifications);")
    dv_cols = {r["name"] for r in cursor.fetchall()}
    assert "session_id" in dv_cols
    assert "document_type" in dv_cols
    assert "status" in dv_cols
    assert "extracted_fields_hash" in dv_cols
    assert "discrepancy_count" in dv_cols

    conn.close()


def test_provenance_and_field_encryption_flow(client):
    """Verify field confirmation stores source, verification_status, and authenticated encryption."""
    engine = FormEngine()

    # 1. Create a session
    res = client.post("/api/session", json={"service_id": "scholarship_app", "language": "hi"})
    assert res.status_code == 200
    s_id = res.json()["session_id"]

    # 2. Stage a candidate for annual_income (sensitive field)
    conn = get_raw_connection(settings.SQLITE_DB_PATH)
    c = conn.cursor()
    c.execute(
        """
        UPDATE field_values
        SET candidate_value = '₹2,50,000', confidence = 0.95
        WHERE session_id = ? AND field_name = 'annual_income'
        """,
        (s_id,)
    )
    conn.commit()
    conn.close()

    # 3. Confirm with explicit provenance
    confirm_res = client.post(
        "/api/confirm",
        json={
            "session_id": s_id,
            "field_name": "annual_income",
            "action": "confirm",
            "source": "document_extraction",
            "verification_status": "document_matched",
            "document_type": "income_certificate"
        }
    )
    assert confirm_res.status_code == 200

    # 4. Inspect raw SQLite database directly: must be encrypted with source recorded
    conn = get_raw_connection(settings.SQLITE_DB_PATH)
    c = conn.cursor()
    c.execute(
        "SELECT confirmed_value, source, verification_status, is_encrypted FROM field_values WHERE session_id = ? AND field_name = 'annual_income'",
        (s_id,)
    )
    row = c.fetchone()
    assert row["confirmed_value"].startswith("enc:")
    assert "2,50,000" not in row["confirmed_value"]  # Plaintext hidden
    assert row["source"] == "document_extraction"
    assert row["verification_status"] == "document_matched"
    assert row["is_encrypted"] == 1

    # Check form_answers synchronization
    c.execute(
        "SELECT answer_value, source, verification_status, document_type, is_encrypted FROM form_answers WHERE service_session_id = ? AND field_key = 'annual_income'",
        (s_id,)
    )
    fa_row = c.fetchone()
    assert fa_row["answer_value"].startswith("enc:")
    assert fa_row["source"] == "document_extraction"
    assert fa_row["verification_status"] == "document_matched"
    assert fa_row["document_type"] == "income_certificate"
    assert fa_row["is_encrypted"] == 1
    conn.close()

    # 5. Verify get_session_state decrypts transparently for citizen review
    state = engine.get_session_state(s_id)
    assert state["confirmed_fields"]["annual_income"] == "₹2,50,000"


def test_document_verification_audit_logging(client):
    """Verify /api/verify/document records audit metadata in document_verifications table."""
    # 1. Create a session
    res = client.post("/api/session", json={"service_id": "scholarship_app", "language": "hi"})
    s_id = res.json()["session_id"]

    # 2. Verify document with session_id
    verify_res = client.post(
        "/api/verify/document",
        json={
            "document_type": "income_certificate",
            "document_text": "GOVERNMENT OF MAHARASHTRA TAHSILE OFFICE ANNUAL INCOME RS 180000 ONE LAKH EIGHTY THOUSAND",
            "target_fields": {"annual_income": "₹1,80,000"},
            "session_id": s_id
        }
    )
    assert verify_res.status_code == 200
    data = verify_res.json()
    assert data["success"] is True

    # 3. Check document_verifications audit entry in SQLite
    conn = get_raw_connection(settings.SQLITE_DB_PATH)
    c = conn.cursor()
    c.execute(
        "SELECT document_type, status, extracted_fields_hash, discrepancy_count FROM document_verifications WHERE session_id = ?",
        (s_id,)
    )
    audit_row = c.fetchone()
    conn.close()

    assert audit_row is not None
    assert audit_row["document_type"] == "income_certificate"
    assert len(audit_row["extracted_fields_hash"]) == 64  # SHA-256
