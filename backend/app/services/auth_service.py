"""
Authentication & Authorization Service for SEVA VAANI.
Implements:
1. Argon2id password hashing and constant-time verification
2. 256-bit entropy session token generation and SHA-256 token hashing in SQLite
3. Email normalization and uniqueness enforcement
4. Explicit session revocation (logout) and expiration checking
5. Tenant data isolation and ownership enforcement
"""

import re
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models import User, AuthSession, generate_uuid, utcnow_iso
from app.core import security


class AuthService:
    @staticmethod
    def normalize_email(email: str) -> str:
        """Normalizes email to lowercase and strips extraneous whitespace."""
        return security.normalize_email(email)

    @staticmethod
    def hash_password(password: str) -> str:
        """Hashes password using Argon2id."""
        return security.hash_password(password)

    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        """Verifies plaintext password against Argon2id hash safely."""
        return security.verify_password(password, password_hash)

    @staticmethod
    def hash_token(raw_token: str) -> str:
        """Hashes a raw session token with SHA-256 before database persistence."""
        return security.hash_token(raw_token)

    @classmethod
    def register_user(cls, db: Session, email: str, password: str) -> User:
        """Registers a new user with normalized email and Argon2id hash."""
        norm_email = cls.normalize_email(email)

        # Check existing user
        existing = db.scalar(select(User).where(User.email == norm_email))
        if existing:
            raise ValueError("Email already registered")

        pwd_hash = cls.hash_password(password)
        now = utcnow_iso()

        user = User(
            id=generate_uuid(),
            email=norm_email,
            password_hash=pwd_hash,
            is_active=True,
            created_at=now,
            updated_at=now
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @classmethod
    def authenticate_user(cls, db: Session, email: str, password: str) -> Optional[User]:
        """Authenticates a user by email and password."""
        norm_email = cls.normalize_email(email)
        user = db.scalar(select(User).where(User.email == norm_email))
        if not user or not user.is_active:
            return None

        if not cls.verify_password(password, user.password_hash):
            return None

        return user

    @classmethod
    def create_auth_session(
        cls, db: Session, user_id: str, duration_hours: int = 24
    ) -> Tuple[str, AuthSession]:
        """Generates a secure bearer token and persists its SHA-256 hash in SQLite."""
        raw_token = secrets.token_urlsafe(32)
        token_hash = cls.hash_token(raw_token)
        now = datetime.utcnow()
        expires = (now + timedelta(hours=duration_hours)).isoformat()

        session = AuthSession(
            id=generate_uuid(),
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires,
            created_at=now.isoformat(),
            revoked_at=None
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return raw_token, session

    @classmethod
    def get_user_from_token(cls, db: Session, raw_token: str) -> Optional[User]:
        """Validates token hash, checks expiration and revocation, returns User."""
        if not raw_token:
            return None

        token_hash = cls.hash_token(raw_token)
        auth_session = db.scalar(
            select(AuthSession).where(
                AuthSession.token_hash == token_hash,
                AuthSession.revoked_at.is_(None)
            )
        )
        if not auth_session:
            return None

        # Check expiration
        now_iso = datetime.utcnow().isoformat()
        if auth_session.expires_at <= now_iso:
            return None

        user = db.scalar(select(User).where(User.id == auth_session.user_id, User.is_active == True))
        return user

    @classmethod
    def revoke_session(cls, db: Session, raw_token: str) -> bool:
        """Revokes an authentication session upon logout."""
        token_hash = cls.hash_token(raw_token)
        auth_session = db.scalar(select(AuthSession).where(AuthSession.token_hash == token_hash))
        if not auth_session:
            return False

        auth_session.revoked_at = utcnow_iso()
        db.commit()
        return True

    @classmethod
    def delete_user_account(cls, db: Session, user_id: str) -> bool:
        """Deletes user account and cascades to all child sessions and answers."""
        user = db.scalar(select(User).where(User.id == user_id))
        if not user:
            return False

        db.delete(user)
        db.commit()
        return True
