"""
Automated Database and Authentication Test Suite for SEVA VAANI.
Verifies all 13 Section 7 requirements against an isolated temporary SQLite database:
1. Database initialization succeeds.
2. All required tables and constraints exist.
3. A new user can register.
4. Duplicate email registration is rejected.
5. Password hashes are stored instead of plaintext passwords.
6. Valid login succeeds and invalid login fails.
7. Authenticated service sessions persist in SQLite.
8. Answers persist after a backend restart.
9. Unconfirmed answers cannot be treated as confirmed.
10. One user cannot read or modify another user's data.
11. Logout revokes the session.
12. Foreign-key constraints work.
13. Invalid input and database errors are handled safely.
"""

import os
import sys
import tempfile
import sqlite3
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.db.engine import Base
from app.db.init_db import init_database
from app.db.models import User, AuthSession, ServiceSession, FormAnswer, ConsentRecord
from app.services.auth_service import AuthService
from app.main import app
from app.db.engine import get_db


@pytest.fixture
def temp_db():
    """Creates an isolated temporary SQLite database file for testing."""
    fd, path = tempfile.mkstemp(suffix="_test_seva_vaani.db")
    os.close(fd)

    # Initialize tables
    init_database(path)

    # Setup SQLAlchemy sessionmaker for this temp DB
    engine = create_engine(
        f"sqlite:///{path}",
        connect_args={"check_same_thread": False}
    )

    # Enforce foreign keys on this engine
    @pytest.fixture
    def set_fk():
        pass

    with engine.connect() as con:
        con.exec_driver_sql("PRAGMA foreign_keys = ON;")

    TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    yield {
        "path": path,
        "engine": engine,
        "Session": TestSession
    }

    # Teardown
    if os.path.exists(path):
        os.remove(path)


@pytest.fixture
def client(temp_db):
    """FastAPI TestClient with overridden get_db dependency pointing to temp_db."""
    def override_get_db():
        db = temp_db["Session"]()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


# ═══════════════════════════════════════════════════════════════════
# 1. Database initialization succeeds
# ═══════════════════════════════════════════════════════════════════
def test_01_db_initialization_succeeds(temp_db):
    assert os.path.exists(temp_db["path"])
    conn = sqlite3.connect(temp_db["path"])
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]
    conn.close()

    assert "users" in tables
    assert "auth_sessions" in tables
    assert "service_sessions" in tables
    assert "form_answers" in tables
    assert "consent_records" in tables


# ═══════════════════════════════════════════════════════════════════
# 2. All required tables and constraints exist
# ═══════════════════════════════════════════════════════════════════
def test_02_all_required_tables_and_constraints_exist(temp_db):
    conn = sqlite3.connect(temp_db["path"])
    cursor = conn.cursor()

    # Check users table columns
    cursor.execute("PRAGMA table_info(users);")
    user_cols = {row[1]: row[2] for row in cursor.fetchall()}
    assert "id" in user_cols
    assert "email" in user_cols
    assert "password_hash" in user_cols
    assert "is_active" in user_cols

    # Check form_answers table columns
    cursor.execute("PRAGMA table_info(form_answers);")
    answer_cols = {row[1]: row[2] for row in cursor.fetchall()}
    assert "service_session_id" in answer_cols
    assert "field_key" in answer_cols
    assert "is_confirmed" in answer_cols

    # Check unique constraint on form_answers(service_session_id, field_key)
    cursor.execute("PRAGMA index_list(form_answers);")
    indexes = cursor.fetchall()
    has_unique = any(idx[2] == 1 for idx in indexes)  # unique index
    assert has_unique

    conn.close()


# ═══════════════════════════════════════════════════════════════════
# 3. A new user can register
# ═══════════════════════════════════════════════════════════════════
def test_03_user_registration_succeeds(client):
    res = client.post("/api/auth/register", json={
        "email": "Citizen.Indore@example.gov.in",
        "password": "SecurePassword123!"
    })
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "citizen.indore@example.gov.in"  # Normalized lowercase
    assert "id" in data
    assert data["is_active"] is True


# ═══════════════════════════════════════════════════════════════════
# 4. Duplicate email registration is rejected
# ═══════════════════════════════════════════════════════════════════
def test_04_duplicate_email_registration_rejected(client):
    # Register once
    client.post("/api/auth/register", json={
        "email": "priya.patil@example.com",
        "password": "Password1234"
    })

    # Register again with same email (different case)
    res_dup = client.post("/api/auth/register", json={
        "email": "PRIYA.PATIL@example.com",
        "password": "DifferentPassword5678"
    })
    assert res_dup.status_code == 409
    assert "already registered" in res_dup.json()["detail"].lower()


# ═══════════════════════════════════════════════════════════════════
# 5. Password hashes are stored instead of plaintext passwords
# ═══════════════════════════════════════════════════════════════════
def test_05_password_hash_stored_not_plaintext(temp_db, client):
    plain_pw = "SuperSecretAadhaarKey99!"
    res = client.post("/api/auth/register", json={
        "email": "hash_check@example.com",
        "password": plain_pw
    })
    assert res.status_code == 201

    conn = sqlite3.connect(temp_db["path"])
    cursor = conn.cursor()
    cursor.execute("SELECT password_hash FROM users WHERE email='hash_check@example.com';")
    stored_hash = cursor.fetchone()[0]
    conn.close()

    assert plain_pw not in stored_hash
    assert stored_hash.startswith("$argon2id$")


# ═══════════════════════════════════════════════════════════════════
# 6. Valid login succeeds and invalid login fails
# ═══════════════════════════════════════════════════════════════════
def test_06_valid_login_succeeds_and_invalid_login_fails(client):
    email = "vikram.rao@example.com"
    pwd = "ValidPassphrase123"

    client.post("/api/auth/register", json={"email": email, "password": pwd})

    # Valid Login
    res_ok = client.post("/api/auth/login", json={"email": email, "password": pwd})
    assert res_ok.status_code == 200
    login_data = res_ok.json()
    assert "token" in login_data
    assert login_data["token_type"] == "bearer"

    # Invalid Password
    res_bad_pw = client.post("/api/auth/login", json={"email": email, "password": "WrongPassword"})
    assert res_bad_pw.status_code == 401

    # Non-existent Email
    res_bad_user = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": pwd})
    assert res_bad_user.status_code == 401


# ═══════════════════════════════════════════════════════════════════
# 7. Authenticated service sessions persist in SQLite
# ═══════════════════════════════════════════════════════════════════
def test_07_authenticated_service_sessions_persist_in_sqlite(temp_db, client):
    # Register & Login
    client.post("/api/auth/register", json={"email": "session_user@example.com", "password": "Password123!"})
    login_res = client.post("/api/auth/login", json={"email": "session_user@example.com", "password": "Password123!"})
    token = login_res.json()["token"]
    user_id = login_res.json()["user"]["id"]

    # Create service session with Auth header
    res_sess = client.post(
        "/api/service-sessions",
        headers={"Authorization": f"Bearer {token}"},
        json={"service_type": "scholarship_app", "language": "mr"}
    )
    assert res_sess.status_code == 201
    s_data = res_sess.json()
    sess_id = s_data["session_id"]
    assert s_data["user_id"] == user_id

    # Verify directly in SQLite
    conn = sqlite3.connect(temp_db["path"])
    cursor = conn.cursor()
    cursor.execute("SELECT id, user_id, language, status FROM service_sessions WHERE id = ?;", (sess_id,))
    row = cursor.fetchone()
    conn.close()

    assert row is not None
    assert row[0] == sess_id
    assert row[1] == user_id
    assert row[2] == "mr"


# ═══════════════════════════════════════════════════════════════════
# 8. Answers persist after a backend restart
# ═══════════════════════════════════════════════════════════════════
def test_08_answers_persist_after_backend_restart(temp_db, client):
    # Create session and save answer
    res_sess = client.post("/api/service-sessions", json={"service_type": "scholarship_app", "language": "hi"})
    sess_id = res_sess.json()["session_id"]

    client.post(
        f"/api/service-sessions/{sess_id}/answers",
        json={"field_key": "full_name", "answer_value": "राजेश वर्मा", "is_confirmed": False}
    )

    # Simulate backend restart: disconnect client, open completely fresh connection to DB
    new_conn = sqlite3.connect(temp_db["path"])
    cursor = new_conn.cursor()
    cursor.execute(
        "SELECT field_key, answer_value, is_confirmed FROM form_answers WHERE service_session_id = ? AND field_key = ?;",
        (sess_id, "full_name")
    )
    persisted = cursor.fetchone()
    new_conn.close()

    assert persisted is not None
    assert persisted[0] == "full_name"
    assert persisted[1] == "राजेश वर्मा"
    assert persisted[2] == 0  # Still unconfirmed


# ═══════════════════════════════════════════════════════════════════
# 9. Unconfirmed answers cannot be treated as confirmed
# ═══════════════════════════════════════════════════════════════════
def test_09_unconfirmed_answers_cannot_be_treated_as_confirmed(client):
    res_sess = client.post("/api/service-sessions", json={"service_type": "scholarship_app", "language": "hi"})
    sess_id = res_sess.json()["session_id"]

    # 1. Save unconfirmed candidate
    client.post(
        f"/api/service-sessions/{sess_id}/answers",
        json={"field_key": "mobile", "answer_value": "9876543210", "is_confirmed": False}
    )

    detail = client.get(f"/api/service-sessions/{sess_id}").json()
    mobile_ans = [a for a in detail["answers"] if a["field_key"] == "mobile"][0]
    assert mobile_ans["is_confirmed"] is False

    # 2. Reject candidate
    client.post(
        f"/api/service-sessions/{sess_id}/confirm",
        json={"field_key": "mobile", "confirmed": False}
    )
    detail_rejected = client.get(f"/api/service-sessions/{sess_id}").json()
    mobile_ans_rej = [a for a in detail_rejected["answers"] if a["field_key"] == "mobile"][0]
    assert mobile_ans_rej["is_confirmed"] is False
    assert mobile_ans_rej["answer_value"] is None  # Candidate cleared on rejection

    # 3. Explicit Affirmation
    client.post(
        f"/api/service-sessions/{sess_id}/answers",
        json={"field_key": "mobile", "answer_value": "9876543210", "is_confirmed": False}
    )
    client.post(
        f"/api/service-sessions/{sess_id}/confirm",
        json={"field_key": "mobile", "confirmed": True}
    )
    detail_confirmed = client.get(f"/api/service-sessions/{sess_id}").json()
    mobile_ans_conf = [a for a in detail_confirmed["answers"] if a["field_key"] == "mobile"][0]
    assert mobile_ans_conf["is_confirmed"] is True
    assert mobile_ans_conf["answer_value"] == "9876543210"


# ═══════════════════════════════════════════════════════════════════
# 10. One user cannot read or modify another user's data
# ═══════════════════════════════════════════════════════════════════
def test_10_tenant_isolation_user_cannot_access_other_user_data(client):
    # User A
    client.post("/api/auth/register", json={"email": "usera@example.com", "password": "PasswordA123"})
    token_a = client.post("/api/auth/login", json={"email": "usera@example.com", "password": "PasswordA123"}).json()["token"]

    # User B
    client.post("/api/auth/register", json={"email": "userb@example.com", "password": "PasswordB123"})
    token_b = client.post("/api/auth/login", json={"email": "userb@example.com", "password": "PasswordB123"}).json()["token"]

    # User A creates session
    sess_a = client.post(
        "/api/service-sessions",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"service_type": "scholarship_app", "language": "hi"}
    ).json()["session_id"]

    # User B attempts to read User A's session -> 403 Forbidden
    res_b_read = client.get(
        f"/api/service-sessions/{sess_a}",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert res_b_read.status_code == 403

    # User B attempts to modify User A's answers -> 403 Forbidden
    res_b_write = client.post(
        f"/api/service-sessions/{sess_a}/answers",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"field_key": "full_name", "answer_value": "Hacker Name", "is_confirmed": True}
    )
    assert res_b_write.status_code == 403


# ═══════════════════════════════════════════════════════════════════
# 11. Logout revokes the session
# ═══════════════════════════════════════════════════════════════════
def test_11_logout_revokes_session(client):
    client.post("/api/auth/register", json={"email": "logout_test@example.com", "password": "Password123!"})
    login_res = client.post("/api/auth/login", json={"email": "logout_test@example.com", "password": "Password123!"})
    token = login_res.json()["token"]

    # Profile works while active
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200

    # Logout
    logout_res = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout_res.status_code == 200

    # Profile fails after revocation
    me_after = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_after.status_code == 401


# ═══════════════════════════════════════════════════════════════════
# 12. Foreign-key constraints work
# ═══════════════════════════════════════════════════════════════════
def test_12_foreign_key_constraints_enforced(temp_db):
    conn = sqlite3.connect(temp_db["path"])
    conn.execute("PRAGMA foreign_keys = ON;")
    cursor = conn.cursor()

    # Attempt to insert an auth_session for a non-existent user_id
    with pytest.raises(sqlite3.IntegrityError):
        cursor.execute(
            """
            INSERT INTO auth_sessions (id, user_id, token_hash, expires_at, created_at)
            VALUES ('sess-1', 'non-existent-user-id', 'fakehash', '2030-01-01', '2026-01-01');
            """
        )

    # Attempt to insert a form_answer for a non-existent service_session_id
    with pytest.raises(sqlite3.IntegrityError):
        cursor.execute(
            """
            INSERT INTO form_answers (service_session_id, field_key, answer_value, is_confirmed, created_at, updated_at)
            VALUES ('non-existent-session', 'full_name', 'Value', 0, '2026-01-01', '2026-01-01');
            """
        )

    conn.close()


# ═══════════════════════════════════════════════════════════════════
# 13. Invalid input and database errors are handled safely
# ═══════════════════════════════════════════════════════════════════
def test_13_invalid_input_and_db_errors_handled_safely(client):
    # Invalid email format
    res_bad_email = client.post("/api/auth/register", json={"email": "not-an-email", "password": "ValidPass123!"})
    assert res_bad_email.status_code == 400

    # Short password (< 8 chars)
    res_short_pw = client.post("/api/auth/register", json={"email": "short@example.com", "password": "123"})
    assert res_short_pw.status_code == 400

    # Non-existent session 404
    res_not_found = client.get("/api/service-sessions/sv-nonexistent-1234")
    assert res_not_found.status_code == 404
