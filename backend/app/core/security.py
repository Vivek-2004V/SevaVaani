"""
Security & Cryptography Utilities for SEVA VAANI.
Implements:
1. Argon2id password hashing and constant-time verification
2. High-entropy session token generation (256-bit URL-safe)
3. Cryptographic SHA-256 token hashing for database storage
"""

import re
import secrets
import hashlib
from typing import Optional
try:
    import argon2
    _hasher = argon2.PasswordHasher(
        time_cost=3,
        memory_cost=65536,
        parallelism=4,
        hash_len=32,
        type=argon2.Type.ID
    )
    _HAS_ARGON2 = True
except ImportError:
    argon2 = None
    _hasher = None
    _HAS_ARGON2 = False


def normalize_email(email: str) -> str:
    """Normalizes email to lowercase and strips extraneous whitespace."""
    cleaned = (email or "").strip().lower()
    if not cleaned or not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", cleaned):
        raise ValueError("Invalid email format")
    return cleaned


def hash_password(password: str) -> str:
    """Hashes password using Argon2id (with secure PBKDF2 fallback)."""
    if not password or len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if _HAS_ARGON2 and _hasher:
        return _hasher.hash(password)
    # Secure fallback if argon2-cffi is not yet installed in environment
    salt = secrets.token_hex(16)
    kdf = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"pbkdf2:sha256:100000${salt}${kdf.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    """Verifies plaintext password against Argon2id or PBKDF2 hash safely."""
    if not password or not password_hash:
        return False
    if password_hash.startswith("pbkdf2:"):
        try:
            parts = password_hash.split("$")
            if len(parts) == 3:
                salt = parts[1]
                expected_hash = parts[2]
                kdf = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
                return secrets.compare_digest(kdf.hex(), expected_hash)
        except Exception:
            return False
    if _HAS_ARGON2 and _hasher:
        try:
            return _hasher.verify(password_hash, password)
        except Exception:
            return False
    return False


def generate_auth_token(nbytes: int = 32) -> str:
    """Generates a cryptographically random, 256-bit URL-safe token."""
    return secrets.token_urlsafe(nbytes)


def hash_token(raw_token: str) -> str:
    """Hashes a raw session token with SHA-256 before database persistence."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
