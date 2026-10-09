"""
Regression tests for Phase 1: Truthful Submissions and Help Ticket IDs.
Verifies:
1. Genuine persistence in SQLite database before ID generation.
2. Honest metadata: persistence_scope, government_portal_submitted = False.
3. Blocked and incomplete submissions generate NO application ID and NO database row.
4. Duplicate submissions are idempotent, returning existing ID with is_duplicate = True.
5. Nonexistent sessions return HTTP errors and NEVER synthetic IDs.
6. Help requests are genuinely stored in help_tickets table before ticket ID is returned.
7. External notification is explicitly marked as False / not configured.
"""

import pytest
import os
import sys
import json
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.main import app
from app.models.database import init_db, get_connection
from app.services.form_engine import FormEngine

@pytest.fixture(autouse=True)
def setup_db():
    init_db()

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def engine():
    return FormEngine()

ALL_FIELDS = [
    ("full_name", "Aarav Sharma"),
    ("dob", "15/05/2004"),
    ("mobile", "9876543210"),
    ("college", "Government Engineering College"),
    ("course", "Computer Science"),
    ("academic_year", "3"),
    ("annual_income", "200000"),
    ("category", "OBC"),
    ("district", "Pune"),
    ("document_status", "Available")
]

def _fill_all_fields(client, session_id: str):
    for field_name, value in ALL_FIELDS:
        res = client.post("/api/fallback/text", json={
            "session_id": session_id,
            "field_name": field_name,
            "typed_value": value
        })
        assert res.status_code == 200

def test_submission_successful_persistence_metadata(client):
    """Verify application is genuinely persisted before ID generation and metadata is truthful."""
    # 1. Create session
    create_res = client.post("/api/session", json={"service_id": "scholarship_app", "language": "hi"})
    assert create_res.status_code == 200
    s_id = create_res.json()["session_id"]

    # 2. Fill all fields
    _fill_all_fields(client, s_id)

    # 3. Submit with consent
    submit_res = client.post("/api/submit", json={"session_id": s_id, "consent": True})
    assert submit_res.status_code == 200
    data = submit_res.json()

    assert data["status"] == "success"
    app_id = data["application_id"]
    assert app_id is not None
    assert app_id.startswith("SV-SCH-2026-")

    # Honest disclosure metadata
    assert data["persistence_scope"] == "saved_in_backend"
    assert data["government_portal_submitted"] is False
    assert data["government_portal_status"] == "no_direct_integration"
    assert data["is_duplicate"] is False
    assert "आंतरिक संदर्भ क्रमांक" in data["message"] or "internal" in data["message"].lower()

    # 4. Verify GENUINE persistence in SQLite database
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT application_id, status, data_json, consent FROM applications WHERE session_id = ?", (s_id,))
    row = cursor.fetchone()
    conn.close()

    assert row is not None
    assert row[0] == app_id
    assert row[1] == "saved_in_backend"
    persisted_data = json.loads(row[2])
    assert persisted_data["full_name"] == "Aarav Sharma"
    assert persisted_data["mobile"] == "9876543210"
    assert row[3] == 1

def test_submission_blocked_no_consent(client):
    """Verify missing consent generates NO application ID and NO DB row."""
    create_res = client.post("/api/session", json={"service_id": "scholarship_app", "language": "hi"})
    s_id = create_res.json()["session_id"]
    _fill_all_fields(client, s_id)

    submit_res = client.post("/api/submit", json={"session_id": s_id, "consent": False})
    assert submit_res.status_code == 200
    data = submit_res.json()

    assert data["status"] == "blocked"
    assert data["application_id"] is None
    assert data["persistence_scope"] == "none"
    assert data["government_portal_submitted"] is False

    # Verify NO record in DB
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM applications WHERE session_id = ?", (s_id,))
    count = cursor.fetchone()[0]
    conn.close()
    assert count == 0

def test_submission_incomplete_fields(client):
    """Verify submitting with missing fields generates NO application ID and NO DB row."""
    create_res = client.post("/api/session", json={"service_id": "scholarship_app", "language": "hi"})
    s_id = create_res.json()["session_id"]

    # Fill only 1 field
    client.post("/api/fallback/text", json={
        "session_id": s_id,
        "field_name": "full_name",
        "typed_value": "Aarav Sharma"
    })

    submit_res = client.post("/api/submit", json={"session_id": s_id, "consent": True})
    assert submit_res.status_code == 200
    data = submit_res.json()

    assert data["status"] == "incomplete"
    assert data["application_id"] is None
    assert data["persistence_scope"] == "none"

    # Verify NO record in DB
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM applications WHERE session_id = ?", (s_id,))
    count = cursor.fetchone()[0]
    conn.close()
    assert count == 0

def test_submission_duplicate_request_idempotent(client):
    """Verify duplicate submission requests return the existing ID and do not duplicate DB rows."""
    create_res = client.post("/api/session", json={"service_id": "scholarship_app", "language": "hi"})
    s_id = create_res.json()["session_id"]
    _fill_all_fields(client, s_id)

    # First submit
    res1 = client.post("/api/submit", json={"session_id": s_id, "consent": True})
    data1 = res1.json()
    assert data1["status"] == "success"
    app_id_1 = data1["application_id"]

    # Second submit (duplicate/retry)
    res2 = client.post("/api/submit", json={"session_id": s_id, "consent": True})
    data2 = res2.json()
    assert data2["status"] == "success"
    assert data2["application_id"] == app_id_1
    assert data2["is_duplicate"] is True

    # Verify database still only has 1 row
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM applications WHERE session_id = ?", (s_id,))
    count = cursor.fetchone()[0]
    conn.close()
    assert count == 1

def test_submission_nonexistent_session(client):
    """Verify submitting a nonexistent session returns HTTP 400 and never generates an ID."""
    res = client.post("/api/submit", json={"session_id": "sv-invalid-random-uuid", "consent": True})
    assert res.status_code == 400
    assert "not found" in res.json()["detail"].lower()

def test_help_request_successful_persistence(client):
    """Verify help ticket is persisted in database and discloses no external dispatch."""
    create_res = client.post("/api/session", json={"service_id": "scholarship_app", "language": "mr"})
    s_id = create_res.json()["session_id"]

    help_res = client.post("/api/help/request", json={
        "session_id": s_id,
        "field_name": "annual_income",
        "reason": "Unsure about certificate number"
    })
    assert help_res.status_code == 200
    data = help_res.json()

    ticket_id = data["ticket_id"]
    assert ticket_id.startswith("TKT-")
    assert data["status"] == "ticket_created"
    assert data["persistence_scope"] == "saved_in_backend"
    assert data["external_notification_sent"] is False
    assert data["external_notification_channel"] == "none_configured"

    # Verify genuine persistence in help_tickets table
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT ticket_id, field_name, reason, status FROM help_tickets WHERE session_id = ?", (s_id,))
    row = cursor.fetchone()
    conn.close()

    assert row is not None
    assert row[0] == ticket_id
    assert row[1] == "annual_income"
    assert row[2] == "Unsure about certificate number"
    assert row[3] == "open"

def test_help_request_nonexistent_session(client):
    """Verify help request on nonexistent session raises 400 and creates no ticket."""
    help_res = client.post("/api/help/request", json={
        "session_id": "sv-nonexistent-session",
        "field_name": "full_name",
        "reason": "testing failure"
    })
    assert help_res.status_code == 400
    assert "not found" in help_res.json()["detail"].lower()
