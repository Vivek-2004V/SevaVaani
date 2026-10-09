import pytest
import os
import sys
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.main import app
from app.models.database import init_db

@pytest.fixture(autouse=True)
def setup_db():
    init_db()

@pytest.fixture
def client():
    return TestClient(app)

def test_api_health(client):
    """Verify GET /api/health returns 200 and expected metadata"""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["service"] == "SEVA VAANI"
    assert "hi" in data["supported_languages"]
    assert "mr" in data["supported_languages"]

def test_api_session_lifecycle(client):
    """Verify session creation, retrieval, and 404 on missing session"""
    # 1. Create Session
    create_res = client.post("/api/session", json={"service_id": "scholarship_app", "language": "hi"})
    assert create_res.status_code == 200
    session_data = create_res.json()
    s_id = session_data["session_id"]
    assert s_id.startswith("sv-")
    assert session_data["current_field"] == "full_name"
    assert session_data["status"] == "in_progress"

    # 2. Get Session State
    get_res = client.get(f"/api/session/{s_id}")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["session_id"] == s_id
    assert get_data["language"] == "hi"

    # 3. Missing Session returns 404
    missing_res = client.get("/api/session/sv-nonexistent999")
    assert missing_res.status_code == 404

def test_api_turn_and_confirmation_flow(client):
    """Verify turn processing, candidate extraction, and explicit confirmation gate"""
    # 1. Create session
    create_res = client.post("/api/session", json={"service_id": "scholarship_app", "language": "hi"})
    s_id = create_res.json()["session_id"]

    # 2. Submit Turn: "Mera naam Ramesh Kumar hai"
    turn_res = client.post("/api/assist/turn", json={
        "session_id": s_id,
        "transcript": "Mera naam Ramesh Kumar hai",
        "input_type": "voice",
        "latency_ms": 120
    })
    assert turn_res.status_code == 200
    turn_data = turn_res.json()
    assert turn_data["status"] == "need_confirmation"
    assert turn_data["candidate_value"] == "Ramesh Kumar"

    # Check that candidate is NOT yet in confirmed_fields
    state_res = client.get(f"/api/session/{s_id}")
    assert "full_name" not in state_res.json()["confirmed_fields"]

    # 3. Explicitly Confirm
    conf_res = client.post("/api/confirm", json={
        "session_id": s_id,
        "field_name": "full_name",
        "action": "confirm"
    })
    assert conf_res.status_code == 200
    conf_data = conf_res.json()
    assert conf_data["status"] == "saved_next_field"
    assert conf_data["session_state"]["confirmed_fields"]["full_name"] == "Ramesh Kumar"
    assert conf_data["session_state"]["current_field"] == "dob"

def test_api_text_fallback_and_help_ticket(client):
    """Verify text fallback input and help ticket creation"""
    create_res = client.post("/api/session", json={"service_id": "scholarship_app", "language": "hi"})
    s_id = create_res.json()["session_id"]

    # Fallback text
    fb_res = client.post("/api/fallback/text", json={
        "session_id": s_id,
        "field_name": "full_name",
        "typed_value": "Suresh Patil"
    })
    assert fb_res.status_code == 200
    fb_data = fb_res.json()
    assert fb_data["status"] == "saved_next_field"
    assert fb_data["session_state"]["confirmed_fields"]["full_name"] == "Suresh Patil"
    assert fb_data["session_state"]["current_field"] == "dob"

    # Help ticket
    help_res = client.post("/api/help/request", json={
        "session_id": s_id,
        "field_name": "dob",
        "reason": "citizen_requested_operator"
    })
    assert help_res.status_code == 200
    help_data = help_res.json()
    assert help_data["ticket_id"].startswith("TKT-")
    assert help_data["status"] == "ticket_created"

def test_api_submission_consent_barrier(client):
    """Verify that mock submission without consent is blocked, and submission with consent requires completed fields"""
    create_res = client.post("/api/session", json={"service_id": "scholarship_app", "language": "hi"})
    s_id = create_res.json()["session_id"]

    # 1. Submit with consent = False -> Blocked
    block_res = client.post("/api/submit", json={"session_id": s_id, "consent": False})
    assert block_res.status_code == 200
    assert block_res.json()["status"] == "blocked"
    assert block_res.json()["application_id"] is None

    # 2. Submit with consent = True but incomplete fields -> Incomplete
    incomp_res = client.post("/api/submit", json={"session_id": s_id, "consent": True})
    assert incomp_res.status_code == 200
    assert incomp_res.json()["status"] == "incomplete"

    # 3. Fill all 10 fields via fallback text
    fields = [
        ("full_name", "Ramesh Kumar"),
        ("dob", "14/08/2004"),
        ("mobile", "9876543210"),
        ("college", "PIEMR"),
        ("course", "B.Tech CSE"),
        ("academic_year", "4"),
        ("annual_income", "180000"),
        ("category", "OBC"),
        ("district", "Indore"),
        ("document_status", "Available")
    ]
    for k, v in fields:
        client.post("/api/fallback/text", json={"session_id": s_id, "field_name": k, "typed_value": v})

    # 4. Submit completed form with consent = True -> Success with Application ID
    submit_res = client.post("/api/submit", json={"session_id": s_id, "consent": True})
    assert submit_res.status_code == 200
    submit_data = submit_res.json()
    assert submit_data["status"] == "success"
    assert submit_data["application_id"].startswith("SV-SCH-2026-")

def test_api_metrics(client):
    """Verify GET /api/metrics returns aggregated telemetry"""
    res = client.get("/api/metrics")
    assert res.status_code == 200
    metrics = res.json()
    assert "total_sessions" in metrics
    assert "unconfirmed_critical_submitted" in metrics
    assert metrics["unconfirmed_critical_submitted"] == 0
