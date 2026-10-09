"""
Contract Integration Test for /api/assist/turn endpoint.
Verifies contract compatibility with frontend processVoiceTurn service.
"""

import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.main import app
from app.models.database import init_db


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


@pytest.fixture
def client():
    return TestClient(app)


def test_turn_response_contract_for_frontend(client):
    """Verify /api/assist/turn returns action='CONFIRM', candidate_value, and prompt matching frontend."""
    # 1. Create session
    create_res = client.post("/api/session", json={"service_id": "scholarship_app", "language": "hi"})
    assert create_res.status_code == 200
    s_id = create_res.json()["session_id"]

    # 2. Submit turn: "Mera naam Ramesh Kumar hai"
    turn_res = client.post("/api/assist/turn", json={
        "session_id": s_id,
        "transcript": "Mera naam Ramesh Kumar hai",
        "input_type": "voice",
        "latency_ms": 120
    })
    assert turn_res.status_code == 200
    data = turn_res.json()

    # Core contract checks
    assert data["session_id"] == s_id
    assert data["field_name"] == "full_name"
    assert data["status"] == "need_confirmation"
    assert data["action"] == "CONFIRM"
    assert data["candidate_value"] == "Ramesh Kumar"
    assert data["value"] == "Ramesh Kumar"
    assert "prompt" in data
    assert "Ramesh Kumar" in data["prompt"]
    assert data["confidence"] >= 0.70
