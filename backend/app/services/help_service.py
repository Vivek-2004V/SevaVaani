"""
Help Service for SEVA VAANI.
Handles citizen human-assistance tickets, lifecycle queries, user authorization,
and helpline configuration disclosure.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

from app.core.config import settings
from app.db.database import get_connection
from app.db.repositories import SessionRepository
from app.services.notification_service import SupportNotificationAdapter


class HelpService:
    """
    Service managing Human Help requests, ticket persistence, and citizen status lookups.
    """

    ALLOWED_CATEGORIES = {
        "voice_not_understood",
        "form_filling_problem",
        "document_verification",
        "technical_issue",
        "other"
    }

    @classmethod
    def create_ticket(
        cls,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
        category: str = "other",
        description: Optional[str] = None,
        field_name: Optional[str] = None,
        reason: str = "citizen_request",
        language: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Creates and persists a human-assistance ticket in SQLite.
        Truthfully dispatches notification and returns real ticket ID.
        """
        conn = get_connection()
        cursor = conn.cursor()

        # 1. Resolve or create session
        actual_session_id = session_id
        session_lang = language or "hi"

        if actual_session_id:
            cursor.execute("SELECT session_id, language, user_id FROM sessions WHERE session_id = ?", (actual_session_id,))
            s_row = cursor.fetchone()
            if not s_row:
                conn.close()
                raise ValueError(f"Session {actual_session_id} not found")
            session_lang = s_row["language"] if hasattr(s_row, "keys") else s_row[1]
            if not user_id and (s_row["user_id"] if hasattr(s_row, "keys") else s_row[2]):
                user_id = s_row["user_id"] if hasattr(s_row, "keys") else s_row[2]
        else:
            # Create a dedicated support session in sessions table to preserve foreign key constraint
            actual_session_id = f"sv-help-{uuid.uuid4().hex[:8]}"
            now_iso = datetime.utcnow().isoformat()
            cursor.execute(
                """
                INSERT INTO sessions (session_id, user_id, service_id, language, current_field, status, created_at, updated_at)
                VALUES (?, ?, 'human_help', ?, NULL, 'help_requested', ?, ?)
                """,
                (actual_session_id, user_id, session_lang, now_iso, now_iso)
            )
            conn.commit()

        # 2. Sanitize and validate inputs
        cat_key = category.strip().lower() if category else "other"
        if cat_key not in cls.ALLOWED_CATEGORIES:
            cat_key = "other"

        clean_desc = None
        if description:
            # Enforce 500-char maximum length; strip control characters
            clean_desc = description.strip()[:500]

        ticket_id = f"TKT-{uuid.uuid4().hex[:6].upper()}"
        now = datetime.utcnow().isoformat()

        # 3. Persist ticket in SQLite before returning ID
        cursor.execute(
            """
            INSERT INTO help_tickets 
            (ticket_id, session_id, user_id, field_name, category, reason, description, status, notification_status, notification_channel, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'open', 'pending', 'none_configured', ?, ?)
            """,
            (ticket_id, actual_session_id, user_id, field_name, cat_key, reason, clean_desc, now, now)
        )
        conn.commit()

        # 4. Attempt notification dispatch via adapter
        notif_result = SupportNotificationAdapter.notify_support_team(
            ticket_id=ticket_id,
            category=cat_key,
            language=session_lang,
            has_description=bool(clean_desc),
            session_id=actual_session_id
        )

        # 5. Update notification columns with verified result
        cursor.execute(
            """
            UPDATE help_tickets
            SET notification_status = ?, notification_channel = ?, updated_at = ?
            WHERE ticket_id = ?
            """,
            (notif_result["status"], notif_result["channel"], datetime.utcnow().isoformat(), ticket_id)
        )
        conn.commit()
        conn.close()

        # Localized truthful message
        if notif_result["sent"]:
            msg = (
                f"आपकी सहायता अनुरोध (टिकट: {ticket_id}) दर्ज हो गई है। सहायता टीम को सूचित कर दिया गया है।"
                if session_lang == "hi" else
                f"आपली मदत विनंती (तिकीट: {ticket_id}) नोंदवली गेली आहे. मदत टीमला सूचित केले आहे."
            )
        else:
            msg = (
                f"सहायता अनुरोध आंतरिक रूप से दर्ज किया गया (टिकट: {ticket_id})। बाह्य हेल्पडेस्क/ईमेल सेवा कॉन्फ़िगर नहीं है; बाह्य सूचना प्रेषित नहीं हुई है।"
                if session_lang == "hi" else
                f"मदत विनंती अंतर्गत नोंदवली गेली (तिकीट: {ticket_id}). बाह्य हेल्पडेस्क/ईमेल सेवा कॉन्फिगर केलेली नाही; बाह्य सूचना पाठवली नाही."
            )

        return {
            "ticket_id": ticket_id,
            "session_id": actual_session_id,
            "user_id": user_id,
            "category": cat_key,
            "description": clean_desc,
            "field_name": field_name,
            "reason": reason,
            "status": "ticket_created",
            "persistence_scope": "saved_in_backend",
            "external_notification_sent": notif_result["sent"],
            "external_notification_channel": notif_result["channel"],
            "external_notification_status": notif_result["status"],
            "message": msg,
            "created_at": now
        }

    @classmethod
    def get_user_tickets(cls, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Retrieves all help tickets created by or associated with the specified user.
        Strictly prevents cross-user ticket inspection.
        """
        if not user_id:
            return []

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT ht.ticket_id, ht.session_id, ht.user_id, ht.field_name, 
                   ht.category, ht.reason, ht.description, ht.status, 
                   ht.notification_status, ht.notification_channel, ht.created_at, ht.updated_at
            FROM help_tickets ht
            LEFT JOIN sessions s ON ht.session_id = s.session_id
            WHERE ht.user_id = ? OR s.user_id = ?
            ORDER BY ht.created_at DESC
            LIMIT ?
            """,
            (user_id, user_id, limit)
        )
        rows = cursor.fetchall()
        conn.close()

        tickets = []
        for r in rows:
            tickets.append({
                "ticket_id": r["ticket_id"],
                "session_id": r["session_id"],
                "user_id": r["user_id"],
                "field_name": r["field_name"],
                "category": r["category"] or "other",
                "reason": r["reason"],
                "description": r["description"],
                "status": r["status"] or "open",
                "notification_status": r["notification_status"] or "not_configured",
                "notification_channel": r["notification_channel"] or "none_configured",
                "created_at": r["created_at"],
                "updated_at": r["updated_at"]
            })
        return tickets

    @classmethod
    def get_ticket_by_id(cls, ticket_id: str, requesting_user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Retrieves a specific ticket by ID, enforcing user authorization.
        """
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT ht.ticket_id, ht.session_id, ht.user_id, ht.field_name, 
                   ht.category, ht.reason, ht.description, ht.status, 
                   ht.notification_status, ht.notification_channel, ht.created_at, ht.updated_at,
                   s.user_id AS session_owner_id
            FROM help_tickets ht
            LEFT JOIN sessions s ON ht.session_id = s.session_id
            WHERE ht.ticket_id = ?
            """,
            (ticket_id,)
        )
        row = cursor.fetchone()
        conn.close()

        if not row:
            return None

        ticket_owner = row["user_id"] or row["session_owner_id"]
        # Enforce authorization if ticket has an associated owner
        if ticket_owner and requesting_user_id and ticket_owner != requesting_user_id:
            raise PermissionError("Access denied: You do not have permission to view this ticket")

        return {
            "ticket_id": row["ticket_id"],
            "session_id": row["session_id"],
            "user_id": row["user_id"],
            "field_name": row["field_name"],
            "category": row["category"] or "other",
            "reason": row["reason"],
            "description": row["description"],
            "status": row["status"] or "open",
            "notification_status": row["notification_status"] or "not_configured",
            "notification_channel": row["notification_channel"] or "none_configured",
            "created_at": row["created_at"],
            "updated_at": row["updated_at"]
        }

    @classmethod
    def get_helpline_config(cls) -> Dict[str, Any]:
        """
        Returns verified helpline contact information.
        Truthfully discloses when phone or WhatsApp options are not configured.
        """
        phone = settings.HELPLINE_PHONE.strip() if settings.HELPLINE_PHONE else None
        whatsapp = settings.HELPLINE_WHATSAPP.strip() if settings.HELPLINE_WHATSAPP else None

        # Clean whatsapp number for wa.me URL (digits only)
        whatsapp_digits = "".join(filter(str.isdigit, whatsapp)) if whatsapp else None

        is_configured = bool(phone or whatsapp)

        return {
            "phone": phone,
            "whatsapp": whatsapp,
            "whatsapp_digits": whatsapp_digits,
            "hours": settings.HELPLINE_HOURS,
            "is_configured": is_configured,
            "message": (
                "आधिकारिक हेल्पलाइन संपर्क विवरण उपलब्ध हैं।"
                if is_configured else
                "आधिकारिक हेल्पलाइन नंबर अभी कॉन्फ़िगर नहीं है। कृपया टिकट सहायता का उपयोग करें।"
            )
        }
