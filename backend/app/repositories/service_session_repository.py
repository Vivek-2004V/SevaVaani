"""
Repository for ServiceSession database interactions.
"""

from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.service_session import ServiceSession
from app.repositories.base import BaseRepository


class ServiceSessionRepository(BaseRepository[ServiceSession]):
    def get_by_id(self, session_id: str) -> Optional[ServiceSession]:
        return self.db.get(ServiceSession, session_id)

    def list_by_user(self, user_id: str) -> List[ServiceSession]:
        stmt = select(ServiceSession).where(ServiceSession.user_id == user_id).order_by(ServiceSession.created_at.desc())
        return list(self.db.scalars(stmt).all())

    def create(self, session_id: str, service_type: str = "scholarship_app", language: str = "hi", user_id: Optional[str] = None) -> ServiceSession:
        session = ServiceSession(
            id=session_id,
            user_id=user_id,
            service_type=service_type,
            language=language,
            current_step="full_name",
            status="in_progress"
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def update_status(self, session: ServiceSession, status: str) -> ServiceSession:
        session.status = status
        self.db.commit()
        self.db.refresh(session)
        return session
