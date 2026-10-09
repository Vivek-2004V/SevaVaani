"""
Repository for User and AuthSession database interactions.
"""

from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.user import User
from app.models.auth_session import AuthSession
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def get_by_id(self, user_id: str) -> Optional[User]:
        return self.db.get(User, user_id)

    def get_by_email(self, email: str) -> Optional[User]:
        stmt = select(User).where(User.email == email)
        return self.db.scalars(stmt).first()

    def create(self, email: str, password_hash: str) -> User:
        user = User(email=email, password_hash=password_hash)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user
