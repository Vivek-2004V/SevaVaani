"""
Integration tests for Human Help and Support Ticket System.
Covers:
1. Help ticket creation with categories, descriptions, and genuine ticket IDs.
2. User authentication association and strict cross-user access isolation.
3. Ticket status and history querying.
4. Helpline contact disclosure and truthfulness.
5. Support notification adapter behavior.
"""

import pytest
import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.main import app
from app.models.database import init_db, get_connection
from app.core.config import settings

@pytest.fixture(autouse=True)
def setup_db():
    init_db()

@pytest.fixture
def client():
    return TestClient(app)

def _register_and_login(client, email: str, password: str = "StrongPass123!"):
    reg = client.post("/api/auth/register", json={"email": email, "password": password})
    assert reg.status_code in (201, 200, 400)
    login = client.post("/api/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200
    token = login.json()["token"]
    user_id = login.json()["user"]["id"]
    return token, user_id

def test_create_help_ticket_unauthenticated(client):
    """Citizens can request human assistance even before logging in."""
    res = client.post("/api/help/tickets", json={
        "category": "voice_not_understood",
        "description": "The microphone could not understand my Hindi dialect.",
        "language": "hi"
    })
    assert res.status_code == 201
    data = res.json()
    assert data["ticket_id"].startswith("TKT-")
    assert data["status"] == "ticket_created"
    assert data["category"] == "voice_not_understood"
    assert data["persistence_scope"] == "saved_in_backend"
    assert data["external_notification_sent"] is False
    assert data["external_notification_channel"] == "none_configured"

    # Verify SQLite row exists
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT ticket_id, category, description, status FROM help_tickets WHERE ticket_id = ?", (data["ticket_id"],))
    row = c.fetchone()
    conn.close()
    assert row is not None
    assert row[0] == data["ticket_id"]
    assert row[1] == "voice_not_understood"
    assert "dialect" in row[2]
    assert row[3] == "open"

def test_create_help_ticket_authenticated(client):
    """Authenticated users have their user_id securely attached to the ticket."""
    token, user_id = _register_and_login(client, "citizen_help_1@example.com")
    res = client.post(
        "/api/help/tickets",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "category": "form_filling_problem",
            "description": "Cannot enter college admission year.",
            "language": "mr"
        }
    )
    assert res.status_code == 201
    data = res.json()
    assert data["ticket_id"].startswith("TKT-")
    assert data["user_id"] == user_id

    # Verify SQLite user_id
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT user_id FROM help_tickets WHERE ticket_id = ?", (data["ticket_id"],))
    row = c.fetchone()
    conn.close()
    assert row[0] == user_id

def test_ticket_history_and_isolation(client):
    """Citizens can list their tickets, and cannot access other citizens' tickets."""
    token_a, user_a = _register_and_login(client, "citizen_alice@example.com")
    token_b, user_b = _register_and_login(client, "citizen_bob@example.com")

    # User A creates ticket A
    res_a = client.post(
        "/api/help/tickets",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"category": "document_verification", "description": "Alice ticket"}
    )
    ticket_a_id = res_a.json()["ticket_id"]

    # User B creates ticket B
    res_b = client.post(
        "/api/help/tickets",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"category": "technical_issue", "description": "Bob ticket"}
    )
    ticket_b_id = res_b.json()["ticket_id"]

    # User A lists tickets: should contain ticket A and NEVER ticket B
    list_a = client.get("/api/help/tickets", headers={"Authorization": f"Bearer {token_a}"})
    assert list_a.status_code == 200
    tickets_a = list_a.json()
    ids_a = [t["ticket_id"] for t in tickets_a]
    assert ticket_a_id in ids_a
    assert ticket_b_id not in ids_a

    # User A views their own ticket details
    get_own = client.get(f"/api/help/tickets/{ticket_a_id}", headers={"Authorization": f"Bearer {token_a}"})
    assert get_own.status_code == 200
    assert get_own.json()["ticket_id"] == ticket_a_id
    assert get_own.json()["status"] == "open"

    # User A attempts to view Bob's ticket B -> strictly 403 Forbidden!
    get_bob = client.get(f"/api/help/tickets/{ticket_b_id}", headers={"Authorization": f"Bearer {token_a}"})
    assert get_bob.status_code == 403
    assert "Access denied" in get_bob.json()["detail"]

def test_helpline_config_truthfulness(client, monkeypatch):
    """When helpline numbers are not configured in settings, endpoint reports unconfigured gracefully."""
    monkeypatch.setattr(settings, "HELPLINE_PHONE", "")
    monkeypatch.setattr(settings, "HELPLINE_WHATSAPP", "")

    res = client.get("/api/help/helpline")
    assert res.status_code == 200
    data = res.json()
    assert data["is_configured"] is False
    assert data["phone"] is None
    assert data["whatsapp"] is None

    # When configured, returns verified contact info
    monkeypatch.setattr(settings, "HELPLINE_PHONE", "+911800111222")
    monkeypatch.setattr(settings, "HELPLINE_WHATSAPP", "+919876543210")
    res2 = client.get("/api/help/helpline")
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["is_configured"] is True
    assert data2["phone"] == "+911800111222"
    assert data2["whatsapp"] == "+919876543210"
    assert data2["whatsapp_digits"] == "919876543210"

def test_description_length_limit(client):
    """Description cannot exceed 500 characters."""
    long_desc = "x" * 1000
    res = client.post("/api/help/tickets", json={
        "category": "other",
        "description": long_desc
    })
    # Fastapi Field max_length will return 422
    assert res.status_code == 422
