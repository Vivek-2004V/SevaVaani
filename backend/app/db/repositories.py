import json
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from app.db.database import get_connection
from app.db.models import SessionModel, FieldValueModel, TurnModel, HelpTicketModel, ApplicationModel

class SessionRepository:
    @staticmethod
    def create(service_id: str, language: str, first_field: str) -> SessionModel:
        session_id = f"sv-{uuid.uuid4().hex[:8]}"
        now = datetime.utcnow().isoformat()
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO sessions (id, service_id, language, status, current_field, attempts, created_at, updated_at)
            VALUES (?, ?, ?, 'collecting', ?, 0, ?, ?)
            """,
            (session_id, service_id, language, first_field, now, now)
        )
        conn.commit()
        conn.close()
        return SessionModel(
            id=session_id,
            service_id=service_id,
            language=language,
            status="collecting",
            current_field=first_field,
            attempts=0,
            created_at=now,
            updated_at=now
        )

    @staticmethod
    def get(session_id: str) -> Optional[SessionModel]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        return SessionModel(
            id=row["id"],
            service_id=row["service_id"],
            language=row["language"],
            status=row["status"],
            current_field=row["current_field"],
            attempts=row["attempts"],
            created_at=row["created_at"],
            updated_at=row["updated_at"]
        )

    @staticmethod
    def update_field(session_id: str, current_field: Optional[str], status: str, attempts: int = 0):
        now = datetime.utcnow().isoformat()
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE sessions SET current_field = ?, status = ?, attempts = ?, updated_at = ? WHERE id = ?",
            (current_field, status, attempts, now, session_id)
        )
        conn.commit()
        conn.close()

    @staticmethod
    def update_language(session_id: str, language: str):
        now = datetime.utcnow().isoformat()
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE sessions SET language = ?, updated_at = ? WHERE id = ?",
            (language, now, session_id)
        )
        conn.commit()
        conn.close()

class FieldValueRepository:
    @staticmethod
    def init_fields(session_id: str, field_names: List[str]):
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.utcnow().isoformat()
        for fn in field_names:
            uid = f"fv-{uuid.uuid4().hex[:8]}"
            cursor.execute(
                """
                INSERT OR IGNORE INTO field_values 
                (id, session_id, field_name, candidate_value, confirmed_value, confidence, confirmed, attempts, created_at, updated_at)
                VALUES (?, ?, ?, NULL, NULL, 0.0, 0, 0, ?, ?)
                """,
                (uid, session_id, fn, now, now)
            )
        conn.commit()
        conn.close()

    @staticmethod
    def get_all_for_session(session_id: str) -> List[FieldValueModel]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM field_values WHERE session_id = ?", (session_id,))
        rows = cursor.fetchall()
        conn.close()
        return [
            FieldValueModel(
                id=r["id"],
                session_id=r["session_id"],
                field_name=r["field_name"],
                candidate_value=r["candidate_value"],
                confirmed_value=r["confirmed_value"],
                confidence=r["confidence"],
                confirmed=bool(r["confirmed"]),
                attempts=r["attempts"],
                created_at=r["created_at"],
                updated_at=r["updated_at"]
            )
            for r in rows
        ]

    @staticmethod
    def set_candidate(session_id: str, field_name: str, candidate_val: Any, confidence: float, attempts: int):
        now = datetime.utcnow().isoformat()
        conn = get_connection()
        cursor = conn.cursor()
        str_val = json.dumps(candidate_val, ensure_ascii=False) if candidate_val is not None else None
        cursor.execute(
            """
            UPDATE field_values
            SET candidate_value = ?, confidence = ?, attempts = ?, updated_at = ?
            WHERE session_id = ? AND field_name = ?
            """,
            (str_val, confidence, attempts, now, session_id, field_name)
        )
        conn.commit()
        conn.close()

    @staticmethod
    def clear_candidate(session_id: str, field_name: str):
        now = datetime.utcnow().isoformat()
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE field_values
            SET candidate_value = NULL, updated_at = ?
            WHERE session_id = ? AND field_name = ?
            """,
            (now, session_id, field_name)
        )
        conn.commit()
        conn.close()

    @staticmethod
    def confirm_value(session_id: str, field_name: str, value: Any):
        now = datetime.utcnow().isoformat()
        conn = get_connection()
        cursor = conn.cursor()
        str_val = json.dumps(value, ensure_ascii=False) if value is not None else None
        cursor.execute(
            """
            UPDATE field_values
            SET confirmed_value = ?, confirmed = 1, candidate_value = NULL, attempts = 0, updated_at = ?
            WHERE session_id = ? AND field_name = ?
            """,
            (str_val, now, session_id, field_name)
        )
        conn.commit()
        conn.close()

class TurnRepository:
    @staticmethod
    def record_turn(session_id: str, field_name: str, input_type: str, transcript: str, confidence: float, action: str, latency_ms: int):
        now = datetime.utcnow().isoformat()
        turn_id = f"trn-{uuid.uuid4().hex[:8]}"
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO turns (id, session_id, field_name, input_type, transcript, confidence, action, latency_ms, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (turn_id, session_id, field_name, input_type, transcript, confidence, action, latency_ms, now)
        )
        conn.commit()
        conn.close()

class HelpTicketRepository:
    @staticmethod
    def create(session_id: str, field_name: Optional[str], reason: str) -> str:
        ticket_id = f"TKT-{uuid.uuid4().hex[:6].upper()}"
        now = datetime.utcnow().isoformat()
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO help_tickets (ticket_id, session_id, field_name, reason, status, created_at)
            VALUES (?, ?, ?, ?, 'open', ?)
            """,
            (ticket_id, session_id, field_name, reason, now)
        )
        conn.commit()
        conn.close()
        return ticket_id

class ApplicationRepository:
    @staticmethod
    def create(session_id: str, service_id: str, data_json: str, consent: bool) -> str:
        app_id = f"SV-SCH-2026-{uuid.uuid4().hex[:6].upper()}"
        now = datetime.utcnow().isoformat()
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO applications (id, session_id, service_id, consent, status, data_json, submitted_at)
            VALUES (?, ?, ?, ?, 'submitted', ?, ?)
            """,
            (app_id, session_id, service_id, int(consent), data_json, now)
        )
        conn.commit()
        conn.close()
        return app_id
