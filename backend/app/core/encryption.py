"""
Application-Level Field Encryption at Rest for SEVA VAANI.

Provides authenticated symmetric encryption (AES-128-CBC + HMAC-SHA256 via Fernet)
for sensitive citizen personal data and form answers stored in SQLite.

Design Guarantees:
1. Encryption keys are kept completely OUT of the SQLite database and OUT of Git.
2. Transparent decryption: legacy unencrypted records are safely returned as plaintext.
3. Cryptographic integrity checking (authenticated ciphertext).
4. Never hashes data that must later be recovered (uses symmetric encryption instead of hashing).
"""

from __future__ import annotations
import os
import stat
from typing import Optional, Any

try:
    from cryptography.fernet import Fernet
    _CRYPTO_AVAILABLE = True
except ImportError:
    Fernet = None
    _CRYPTO_AVAILABLE = False


SENSITIVE_FIELD_KEYS = {
    "full_name",
    "father_name",
    "mobile",
    "mobile_number",
    "phone",
    "aadhaar",
    "aadhaar_number",
    "annual_income",
    "income",
    "bank_account",
    "bank_account_number",
    "address",
    "dob",
    "date_of_birth"
}


def _get_or_create_key() -> bytes:
    """
    Resolves master encryption key from environment or an owner-restricted key file.
    Never commits key to Git or persists into SQLite.
    """
    env_key = os.getenv("SEVA_VAANI_FIELD_ENCRYPTION_KEY")
    if env_key:
        return env_key.strip().encode("utf-8")

    # Base directory for security keys: outside git tracking
    real_f = os.path.realpath(__file__)
    base_dir = real_f
    for _ in range(4):
        base_dir = os.path.dirname(base_dir)
    key_dir = os.path.join(base_dir, "data", "security")
    os.makedirs(key_dir, exist_ok=True)
    key_path = os.path.join(key_dir, "field_encryption.key")

    if os.path.isfile(key_path):
        with open(key_path, "rb") as f:
            return f.read().strip()

    if not _CRYPTO_AVAILABLE or Fernet is None:
        return b""

    # Generate a fresh 256-bit Fernet key
    fresh_key = Fernet.generate_key()
    with open(key_path, "wb") as f:
        f.write(fresh_key)
    # Restrict file permissions: owner-read/write only (0o600)
    try:
        os.chmod(key_path, 0o600)
    except Exception:
        pass
    return fresh_key


class TamperedCiphertextError(Exception):
    """Raised when ciphertext HMAC integrity check fails or data is corrupted."""
    pass


class KeyUnavailableError(Exception):
    """Raised when encryption key is missing or cannot be initialized."""
    pass


class FieldEncryptionService:
    _fernet: Optional[Any] = None
    _initialized: bool = False

    @classmethod
    def reset_key_cache(cls) -> None:
        """Resets cached Fernet instance for testing and key rotation."""
        cls._fernet = None
        cls._initialized = False

    @classmethod
    def _get_fernet(cls, strict: bool = False) -> Optional[Fernet]:
        if not cls._initialized:
            if _CRYPTO_AVAILABLE and Fernet is not None:
                key = _get_or_create_key()
                if key:
                    try:
                        cls._fernet = Fernet(key)
                    except Exception as e:
                        if strict:
                            raise KeyUnavailableError(f"Invalid encryption key: {e}")
                        cls._fernet = None
                elif strict:
                    raise KeyUnavailableError("Encryption key is empty or unavailable")
            elif strict:
                raise KeyUnavailableError("Cryptography library is not installed")
            cls._initialized = True
        return cls._fernet

    @classmethod
    def is_sensitive_field(cls, field_key: str) -> bool:
        if not field_key:
            return False
        return field_key.lower().strip() in SENSITIVE_FIELD_KEYS

    @classmethod
    def encrypt_value(cls, value: Optional[str]) -> Optional[str]:
        """
        Encrypts a sensitive plaintext value before persisting into SQLite.
        Prefixes ciphertext with 'enc:' for deterministic identification.
        """
        if value is None or value == "":
            return value

        str_val = str(value)
        if str_val.startswith("enc:"):
            return str_val  # Already encrypted

        fernet = cls._get_fernet()
        if not fernet:
            return str_val  # Fallback if cryptography not available

        try:
            token = fernet.encrypt(str_val.encode("utf-8")).decode("utf-8")
            return f"enc:{token}"
        except Exception:
            return str_val

    @classmethod
    def decrypt_value(cls, value: Optional[str], strict: bool = False) -> Optional[str]:
        """
        Decrypts an encrypted value retrieved from SQLite.
        If value is legacy plaintext (does not start with 'enc:'), safely returns it unmodified.
        If strict is True and ciphertext has been tampered with, raises TamperedCiphertextError.
        """
        if value is None or value == "":
            return value

        str_val = str(value)
        if not str_val.startswith("enc:"):
            return str_val  # Transparently returns legacy plaintext without error

        fernet = cls._get_fernet(strict=strict)
        if not fernet:
            if strict:
                raise KeyUnavailableError("Cannot decrypt: encryption key is unavailable")
            return str_val

        try:
            raw_token = str_val[4:]  # Remove 'enc:' prefix
            decrypted = fernet.decrypt(raw_token.encode("utf-8")).decode("utf-8")
            return decrypted
        except Exception as e:
            if strict:
                raise TamperedCiphertextError(f"Ciphertext HMAC integrity verification failed: {e}")
            return str_val
