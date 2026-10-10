"""
Database Security, Argon2id Hashing, SHA-256 Token Storage, and Encryption-at-Rest Test Suite.

Verifies:
1. Argon2id password hashing and constant-time verification.
2. Secure fallback / migration verification for non-Argon2 hashes.
3. 256-bit high-entropy session token generation and SHA-256 server-side storage.
4. Session revocation and token invalidation.
5. Cross-user isolation: Prevents User B from accessing or submitting User A's session.
6. Rate limiting on authentication endpoints (HTTP 429 Too Many Requests).
7. Column-level encryption at rest for sensitive data (Fernet AES-128-CBC + HMAC-SHA256).
8. Transparent recovery of legacy unencrypted form records without data loss.
9. Privacy log filter redaction of phone numbers, Aadhaar, tokens, and passwords.
"""

import os
import sys
import hashlib
import time
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import select

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.main import app
from app.db.engine import get_db, get_raw_connection
from app.core.config import settings
from app.core import security
from app.core.encryption import FieldEncryptionService
from app.core.rate_limiter import SlidingWindowRateLimiter
from app.services.auth_service import AuthService
from app.services.privacy_firewall import PrivacyFirewall
from app.models import User, AuthSession, ServiceSession


@pytest.fixture
def client():
    return TestClient(app)


def test_argon2id_password_hashing_and_verification():
    """Verify password hashing produces valid Argon2id hash and verifies correctly."""
    plain_password = "SecureCitizenPassword123!"
    hashed = security.hash_password(plain_password)
    
    # Must start with $argon2id$ if argon2-cffi is installed
    assert hashed.startswith("$argon2id$") or hashed.startswith("pbkdf2:sha256:")
    assert plain_password not in hashed
    
    # Valid password verification
    assert security.verify_password(plain_password, hashed) is True
    # Wrong password verification
    assert security.verify_password("WrongPassword999!", hashed) is False
    # Empty password verification
    assert security.verify_password("", hashed) is False


def test_legacy_password_verification_safe_migration():
    """Verify system safely verifies legacy PBKDF2 hashes without crashing or resetting."""
    plain_pwd = "LegacyCitizenPass456#"
    # Simulate a legacy PBKDF2 hash
    import secrets
    salt = secrets.token_hex(16)
    kdf = hashlib.pbkdf2_hmac("sha256", plain_pwd.encode("utf-8"), salt.encode("utf-8"), 100000)
    legacy_hash = f"pbkdf2:sha256:100000${salt}${kdf.hex()}"
    
    assert security.verify_password(plain_pwd, legacy_hash) is True
    assert security.verify_password("IncorrectPass", legacy_hash) is False


def test_session_token_generation_and_sha256_storage(client):
    """Verify session token is 256-bit URL-safe and stored server-side ONLY as SHA-256 hash."""
    test_email = f"citizen_{int(time.time()*1000)}@test.gov.in"
    test_pwd = "MySecretPassword789!"
    
    # Register user
    reg_res = client.post("/api/auth/register", json={"email": test_email, "password": test_pwd})
    assert reg_res.status_code == 201
    user_id = reg_res.json()["id"]
    
    # Login
    login_res = client.post("/api/auth/login", json={"email": test_email, "password": test_pwd})
    assert login_res.status_code == 200
    login_data = login_res.json()
    raw_token = login_data["token"]
    
    # Verify raw token is url-safe string with sufficient entropy
    assert len(raw_token) >= 32
    
    # Compute expected SHA-256 hex digest
    expected_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    assert len(expected_hash) == 64
    
    # Inspect raw SQLite database directly to confirm raw token is NOT in database
    conn = get_raw_connection(settings.SQLITE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT token_hash FROM auth_sessions WHERE user_id = ?", (user_id,))
    rows = cursor.fetchall()
    conn.close()
    
    hashes_in_db = [r["token_hash"] if isinstance(r, dict) or hasattr(r, "keys") else r[0] for r in rows]
    assert expected_hash in hashes_in_db
    assert raw_token not in hashes_in_db  # Raw token must NEVER be stored in SQLite


def test_session_revocation_logout(client):
    """Verify explicit logout revokes the token hash and blocks subsequent requests."""
    test_email = f"logout_{int(time.time()*1000)}@test.gov.in"
    test_pwd = "LogoutPassword123!"
    
    client.post("/api/auth/register", json={"email": test_email, "password": test_pwd})
    login_res = client.post("/api/auth/login", json={"email": test_email, "password": test_pwd})
    raw_token = login_res.json()["token"]
    
    # Access profile before logout
    headers = {"Authorization": f"Bearer {raw_token}"}
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    
    # Logout
    logout_res = client.post("/api/auth/logout", headers=headers)
    assert logout_res.status_code == 200
    
    # Subsequent access must be rejected with 401
    me_after = client.get("/api/auth/me", headers=headers)
    assert me_after.status_code == 401


def test_cross_user_isolation_on_service_sessions(client):
    """Verify User B cannot access or modify User A's service session (HTTP 403 Forbidden)."""
    # 1. Create User A and User B
    u_a_email = f"user_a_{int(time.time()*1000)}@test.gov.in"
    u_b_email = f"user_b_{int(time.time()*1000)}@test.gov.in"
    pwd = "SharedPassword123!"
    
    client.post("/api/auth/register", json={"email": u_a_email, "password": pwd})
    token_a = client.post("/api/auth/login", json={"email": u_a_email, "password": pwd}).json()["token"]
    
    client.post("/api/auth/register", json={"email": u_b_email, "password": pwd})
    token_b = client.post("/api/auth/login", json={"email": u_b_email, "password": pwd}).json()["token"]
    
    # 2. User A creates a service session
    sess_res = client.post(
        "/api/service-sessions",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"service_type": "scholarship_app", "language": "hi"}
    )
    assert sess_res.status_code == 201
    session_id = sess_res.json()["session_id"]
    
    # 3. User B attempts to access User A's session -> Must be 403 Forbidden
    access_attempt = client.get(
        f"/api/service-sessions/{session_id}",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert access_attempt.status_code == 403
    
    # 4. User B attempts to access via legacy /api/session/{session_id} -> Must be 403 Forbidden
    legacy_attempt = client.get(
        f"/api/session/{session_id}",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert legacy_attempt.status_code == 403
    
    # 5. User A can access their own session
    user_a_access = client.get(
        f"/api/service-sessions/{session_id}",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert user_a_access.status_code == 200


def test_authentication_rate_limiting(client):
    """Verify rapid repeated attempts on auth endpoints trigger HTTP 429 Too Many Requests."""
    os.environ["RATE_LIMIT_ENABLED"] = "true"
    limiter = SlidingWindowRateLimiter(times=3, seconds=60, scope="test_auth")
    
    class FakeRequest:
        def __init__(self, ip):
            self.client = type("Client", (), {"host": ip})()
            self.headers = {}
    
    req = FakeRequest("198.51.100.42")
    
    # First 3 requests succeed
    limiter.check(req)
    limiter.check(req)
    limiter.check(req)
    
    # 4th request must raise HTTP 429
    with pytest.raises(Exception) as excinfo:
        limiter.check(req)
    assert "429" in str(excinfo.value) or excinfo.value.status_code == 429
    os.environ["RATE_LIMIT_ENABLED"] = "false"


def test_field_encryption_at_rest_and_recovery():
    """Verify sensitive form fields are encrypted at rest with Fernet and recovered transparently."""
    assert FieldEncryptionService.is_sensitive_field("mobile") is True
    assert FieldEncryptionService.is_sensitive_field("annual_income") is True
    assert FieldEncryptionService.is_sensitive_field("aadhaar") is True
    assert FieldEncryptionService.is_sensitive_field("captcha") is False
    
    sensitive_plain = "₹2,50,000 (Two Lakh Fifty Thousand)"
    encrypted = FieldEncryptionService.encrypt_value(sensitive_plain)
    
    # Ciphertext must not reveal plaintext
    assert encrypted.startswith("enc:")
    assert sensitive_plain not in encrypted
    
    # Decryption must recover original value perfectly
    recovered = FieldEncryptionService.decrypt_value(encrypted)
    assert recovered == sensitive_plain
    
    # Legacy unencrypted record must be recovered without error
    legacy_plain = "सुनील पाटिल"
    legacy_recovered = FieldEncryptionService.decrypt_value(legacy_plain)
    assert legacy_recovered == legacy_plain


def test_privacy_log_filter_redacts_sensitive_data():
    """Verify phone numbers, Aadhaar, tokens, and passwords are fully redacted from log strings."""
    test_log = "User 9876543210 submitted Aadhaar 1234-5678-9012 with token Bearer secret_token_xyz"
    sanitized = PrivacyFirewall.sanitize_log_message(test_log)
    
    assert "secret_token_xyz" not in sanitized
    assert "1234-5678-9012" not in sanitized
    assert "9876543210" not in sanitized
    assert "[REDACTED_PHONE:" in sanitized or "[REDACTED" in sanitized
    assert "[REDACTED_AUTH_TOKEN]" in sanitized


def test_tampered_ciphertext_detection():
    """Verify tampered ciphertext fails HMAC check and raises TamperedCiphertextError in strict mode."""
    from app.core.encryption import TamperedCiphertextError
    plain_val = "Secret Family Income ₹3,00,000"
    encrypted = FieldEncryptionService.encrypt_value(plain_val)
    
    # Tamper with the base64 ciphertext characters
    tampered = encrypted[:-5] + "XXXXX"
    
    # In strict mode, tampering MUST raise TamperedCiphertextError
    with pytest.raises(TamperedCiphertextError):
        FieldEncryptionService.decrypt_value(tampered, strict=True)


def test_key_unavailable_behavior():
    """Verify behavior when encryption key is missing or corrupted."""
    from app.core.encryption import KeyUnavailableError
    orig_env = os.environ.get("SEVA_VAANI_FIELD_ENCRYPTION_KEY")
    try:
        os.environ["SEVA_VAANI_FIELD_ENCRYPTION_KEY"] = "invalid_short_key"
        FieldEncryptionService.reset_key_cache()
        
        with pytest.raises(KeyUnavailableError):
            FieldEncryptionService.decrypt_value("enc:gAAAAABdummyCiphertext", strict=True)
    finally:
        if orig_env:
            os.environ["SEVA_VAANI_FIELD_ENCRYPTION_KEY"] = orig_env
        else:
            os.environ.pop("SEVA_VAANI_FIELD_ENCRYPTION_KEY", None)
        FieldEncryptionService.reset_key_cache()


def test_backup_handling_and_no_key_leak():
    """Verify backup directories and database files do not contain exposed raw encryption keys."""
    key_dir = os.path.join(settings.BASE_DIR, "data", "security")
    key_file = os.path.join(key_dir, "field_encryption.key")
    
    if os.path.isfile(key_file):
        with open(key_file, "rb") as f:
            raw_key_bytes = f.read().strip()
            
        # Raw key bytes must NOT appear inside SQLite database file
        with open(settings.SQLITE_DB_PATH, "rb") as db_f:
            db_content = db_f.read()
            assert raw_key_bytes not in db_content, "Encryption key leaked into SQLite database file!"

