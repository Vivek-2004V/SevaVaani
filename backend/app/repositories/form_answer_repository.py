"""
Repository for FormAnswer and ConsentRecord database interactions.
"""

from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.form_answer import FormAnswer, ConsentRecord
from app.repositories.base import BaseRepository


class FormAnswerRepository(BaseRepository[FormAnswer]):
    def get_by_session_and_field(self, session_id: str, field_key: str) -> Optional[FormAnswer]:
        stmt = select(FormAnswer).where(
            FormAnswer.service_session_id == session_id,
            FormAnswer.field_key == field_key
        )
        return self.db.scalars(stmt).first()

    def list_by_session(self, session_id: str) -> List[FormAnswer]:
        stmt = select(FormAnswer).where(FormAnswer.service_session_id == session_id)
        return list(self.db.scalars(stmt).all())

    def save_confirmed_answer(self, session_id: str, field_key: str, answer_value: str) -> FormAnswer:
        ans = self.get_by_session_and_field(session_id, field_key)
        if ans:
            ans.answer_value = answer_value
            ans.is_confirmed = True
        else:
            ans = FormAnswer(
                service_session_id=session_id,
                field_key=field_key,
                answer_value=answer_value,
                is_confirmed=True
            )
            self.db.add(ans)
        self.db.commit()
        self.db.refresh(ans)
        return ans


class ConsentRecordRepository(BaseRepository[ConsentRecord]):
    def create(self, session_id: str, consent_type: str = "final_submission", granted: bool = True) -> ConsentRecord:
        record = ConsentRecord(
            service_session_id=session_id,
            consent_type=consent_type,
            granted=granted
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record
