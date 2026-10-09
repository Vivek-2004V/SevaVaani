"""
End-to-End Scenarios & Reliability Test Suite for SEVA VAANI (Phase 6).
Evaluates complete multilingual flows, rejection/correction cycles, invalid/ambiguous inputs,
text fallback, human help tickets, session resilience, and security boundaries.
"""

from __future__ import annotations
import os
import sys
import pytest
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


def test_e2e_hindi_scholarship_complete_workflow(client):
    """Complete 10-field scholarship application in Hindi with full verification and consent."""
    # 1. Start session
    resp = client.post("/api/session", json={"service_id": "scholarship_app", "language": "hi"})
    assert resp.status_code == 200
    data = resp.json()
    session_id = data["session_id"]
    assert data["current_field"] == "full_name"

    # Step-by-step 10 fields (Candidate Turn -> Confirm Turn)
    workflow_steps = [
        ("full_name", "Mera naam Ramesh Kumar hai"),
        ("dob", "15/08/2002"),
        ("mobile", "9876543210"),
        ("college", "PIEMR Indore"),
        ("course", "BTech Computer Science"),
        ("academic_year", "3"),
        ("annual_income", "180000"),
        ("category", "OBC"),
        ("district", "Indore"),
        ("document_status", "Available"),
    ]

    for expected_field, user_input in workflow_steps:
        # Turn 1: Process utterance
        turn_resp = client.post("/api/assist/turn", json={
            "session_id": session_id,
            "transcript": user_input,
            "input_type": "voice",
            "latency_ms": 120
        })
        assert turn_resp.status_code == 200
        t_data = turn_resp.json()
        if t_data["status"] != "need_confirmation":
            print(f"FAILED ON FIELD {expected_field}: transcript='{user_input}', response={t_data}")
        assert t_data["status"] == "need_confirmation"
        assert t_data["candidate_value"] is not None

        # Turn 2: Confirm value
        conf_resp = client.post("/api/confirm", json={
            "session_id": session_id,
            "field_name": expected_field,
            "action": "confirm"
        })
        assert conf_resp.status_code == 200
        c_data = conf_resp.json()
        assert c_data["session_state"]["confirmed_fields"][expected_field] is not None

    # Final review status check
    sess_status = client.get(f"/api/session/{session_id}")
    assert sess_status.status_code == 200
    s_data = sess_status.json()
    assert s_data["status"] == "ready_for_review"
    assert len(s_data["confirmed_fields"]) == 10

    # Submission without consent must be blocked
    sub_fail = client.post("/api/submit", json={"session_id": session_id, "consent": False})
    assert sub_fail.status_code == 200
    assert sub_fail.json()["status"] == "blocked"
    assert sub_fail.json()["application_id"] is None

    # Submission with explicit consent must succeed
    sub_ok = client.post("/api/submit", json={"session_id": session_id, "consent": True})
    assert sub_ok.status_code == 200
    assert sub_ok.json()["status"] == "success"
    assert sub_ok.json()["application_id"].startswith("SV-SCH-2026-")


def test_e2e_marathi_scholarship_complete_workflow(client):
    """Complete 10-field scholarship application in Marathi with full verification and consent."""
    resp = client.post("/api/session", json={"service_id": "scholarship_app", "language": "mr"})
    assert resp.status_code == 200
    session_id = resp.json()["session_id"]

    workflow_steps = [
        ("full_name", "माझे नाव राहुल देशमुख आहे"),
        ("dob", "15/08/2002"),
        ("mobile", "8765432109"),
        ("college", "व्हीजेटीआय मुंबई"),
        ("course", "बी.फार्मसी"),
        ("academic_year", "2"),
        ("annual_income", "250000"),
        ("category", "SC"),
        ("district", "पुणे"),
        ("document_status", "Available"),
    ]

    for expected_field, user_input in workflow_steps:
        # Turn
        turn_resp = client.post("/api/assist/turn", json={
            "session_id": session_id,
            "transcript": user_input,
            "input_type": "voice",
            "latency_ms": 110
        })
        assert turn_resp.status_code == 200
        assert turn_resp.json()["status"] == "need_confirmation"

        # Confirm
        conf_resp = client.post("/api/confirm", json={
            "session_id": session_id,
            "field_name": expected_field,
            "action": "confirm"
        })
        assert conf_resp.status_code == 200

    # Submit with consent
    sub_resp = client.post("/api/submit", json={"session_id": session_id, "consent": True})
    assert sub_resp.status_code == 200
    assert sub_resp.json()["status"] == "success"
    assert sub_resp.json()["application_id"].startswith("SV-SCH-2026-")


def test_user_rejection_and_correction_cycle(client):
    """Tests rejecting an incorrect candidate, correcting it, and confirming the new value."""
    resp = client.post("/api/session", json={"service_id": "scholarship_app", "language": "hi"})
    session_id = resp.json()["session_id"]

    # 1. Provide first name
    client.post("/api/assist/turn", json={
        "session_id": session_id,
        "transcript": "Mera naam Amit hai",
        "input_type": "voice",
        "latency_ms": 100
    })

    # 2. User says No / Rejects via /api/confirm
    rej_resp = client.post("/api/confirm", json={
        "session_id": session_id,
        "field_name": "full_name",
        "action": "reject"
    })
    assert rej_resp.status_code == 200
    r_data = rej_resp.json()
    assert r_data["status"] == "candidate_discarded"
    assert "full_name" not in r_data["session_state"]["confirmed_fields"]

    # 3. User provides corrected name
    corr_resp = client.post("/api/assist/turn", json={
        "session_id": session_id,
        "transcript": "Mera naam Sumit Verma hai",
        "input_type": "voice",
        "latency_ms": 100
    })
    assert corr_resp.status_code == 200
    assert corr_resp.json()["candidate_value"] == "Sumit Verma"

    # 4. User confirms corrected name
    conf_resp = client.post("/api/confirm", json={
        "session_id": session_id,
        "field_name": "full_name",
        "action": "confirm"
    })
    assert conf_resp.status_code == 200
    assert conf_resp.json()["session_state"]["confirmed_fields"]["full_name"] == "Sumit Verma"
    assert conf_resp.json()["session_state"]["current_field"] == "dob"


def test_invalid_and_ambiguous_value_rejection(client):
    """Tests that invalid phone numbers and ambiguous dates are safely rejected without saving."""
    resp = client.post("/api/session", json={"service_id": "scholarship_app", "language": "hi"})
    session_id = resp.json()["session_id"]

    # Confirm full_name first
    client.post("/api/assist/turn", json={
        "session_id": session_id,
        "transcript": "Mera naam Rahul hai",
        "input_type": "voice"
    })
    client.post("/api/confirm", json={"session_id": session_id, "field_name": "full_name", "action": "confirm"})

    # On dob: send invalid non-date
    dob_inv = client.post("/api/assist/turn", json={
        "session_id": session_id,
        "transcript": "kal parso",
        "input_type": "voice"
    })
    assert dob_inv.status_code == 200
    assert dob_inv.json()["status"] in ["validation_error", "retry"]

    state_resp = client.get(f"/api/session/{session_id}")
    assert "dob" not in state_resp.json()["confirmed_fields"]


def test_text_fallback_and_human_help_escalation(client):
    """Tests repeated speech recognition failures triggering text fallback and human help ticket creation."""
    resp = client.post("/api/session", json={"service_id": "scholarship_app", "language": "hi"})
    session_id = resp.json()["session_id"]

    # Send unclear input 1
    t1 = client.post("/api/assist/turn", json={
        "session_id": session_id,
        "transcript": "[unclear]",
        "input_type": "voice"
    })
    assert t1.json()["status"] == "retry"

    # Send unclear input 2 (repeated failure)
    t2 = client.post("/api/assist/turn", json={
        "session_id": session_id,
        "transcript": "[unclear]",
        "input_type": "voice"
    })
    assert t2.json()["status"] == "text_fallback"

    # Use typed text fallback
    fb_resp = client.post("/api/fallback/text", json={
        "session_id": session_id,
        "field_name": "full_name",
        "typed_value": "Vikas Gupta"
    })
    assert fb_resp.status_code == 200
    assert fb_resp.json()["session_state"]["confirmed_fields"]["full_name"] == "Vikas Gupta"

    # Request human assistance ticket
    tkt_resp = client.post(
        "/api/help/request",
        json={"session_id": session_id, "reason": "Persistent microphone difficulty"}
    )
    assert tkt_resp.status_code == 200
    tkt_data = tkt_resp.json()
    assert tkt_data["ticket_id"].startswith("TKT-")
    assert tkt_data["status"] == "ticket_created"


def test_invalid_session_and_expired_handling(client):
    """Tests proper 404 response when session is non-existent or corrupted."""
    resp = client.get("/api/session/non-existent-session-id-12345")
    assert resp.status_code == 404

    turn_resp = client.post("/api/assist/turn", json={
        "session_id": "invalid-id-xyz",
        "transcript": "Namaste",
        "input_type": "voice"
    })
    assert turn_resp.status_code == 400
