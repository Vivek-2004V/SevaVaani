from typing import Optional, Dict, Any
from app.db.repositories import HelpTicketRepository, SessionRepository

class HelpService:
    @staticmethod
    def create_ticket(session_id: str, field_name: Optional[str] = None, reason: str = "citizen_request") -> Dict[str, Any]:
        session = SessionRepository.get(session_id)
        lang = session.language if session else "hi"
        ticket_id = HelpTicketRepository.create(session_id, field_name, reason)

        msg = (f"सहायता टिकट {ticket_id} दर्ज कर लिया गया है। सहायता ऑपरेटर जल्द ही आपके सत्र की समीक्षा करेगा।"
               if lang == "hi" else
               f"मदत तिकीट {ticket_id} नोंदवले गेले आहे. सहाय्यक ऑपरेटर लवकरच आपल्या सत्राचे पुनरावलोकन करेल.")

        return {
            "ticket_id": ticket_id,
            "session_id": session_id,
            "status": "ticket_created",
            "message": msg
        }
