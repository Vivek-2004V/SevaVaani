"""
Help & Support API Routes for SEVA VAANI.
Implements:
- POST /api/help/tickets: Create human-assistance ticket
- GET  /api/help/tickets: List authenticated user's tickets
- GET  /api/help/tickets/{ticket_id}: Retrieve ticket status with ownership check
- GET  /api/help/helpline: Retrieve verified helpline contact config
"""

from __future__ import annotations

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.auth import get_current_user, get_optional_current_user
from app.db.models import User
from app.services.help_service import HelpService

router = APIRouter(prefix="/api/help", tags=["Human Help & Support"])


class CreateHelpTicketRequest(BaseModel):
    session_id: Optional[str] = None
    category: str = Field("other", description="Issue category: voice_not_understood, form_filling_problem, document_verification, technical_issue, other")
    description: Optional[str] = Field(None, max_length=500, description="Optional brief citizen issue description")
    field_name: Optional[str] = None
    reason: str = Field("citizen_request", description="Reason code or trigger")
    language: Optional[str] = Field("hi", description="Citizen language (hi/mr/en)")


class HelpTicketSummary(BaseModel):
    ticket_id: str
    session_id: Optional[str]
    user_id: Optional[str]
    field_name: Optional[str]
    category: str
    reason: str
    description: Optional[str]
    status: str
    notification_status: str
    notification_channel: str
    created_at: str
    updated_at: Optional[str]


class HelplineConfigResponse(BaseModel):
    phone: Optional[str]
    whatsapp: Optional[str]
    whatsapp_digits: Optional[str]
    hours: str
    is_configured: bool
    message: str


@router.post("/tickets", status_code=status.HTTP_201_CREATED)
def create_ticket(
    payload: CreateHelpTicketRequest,
    current_user: Optional[User] = Depends(get_optional_current_user)
) -> Dict[str, Any]:
    """
    Creates a citizen human-help ticket.
    Persists genuinely in SQLite before returning real ticket ID.
    """
    try:
        return HelpService.create_ticket(
            session_id=payload.session_id,
            user_id=current_user.id if current_user else None,
            category=payload.category,
            description=payload.description,
            field_name=payload.field_name,
            reason=payload.reason,
            language=payload.language
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/tickets", response_model=List[HelpTicketSummary])
def list_user_tickets(
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    """
    Returns all help tickets for the authenticated citizen.
    Strictly isolated: a user cannot see another citizen's tickets.
    """
    try:
        return HelpService.get_user_tickets(user_id=current_user.id, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/tickets/{ticket_id}", response_model=HelpTicketSummary)
def get_ticket_status(
    ticket_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves the status of a specific ticket.
    Enforces user authorization: returns 403 if ticket belongs to another user.
    """
    try:
        ticket = HelpService.get_ticket_by_id(ticket_id, requesting_user_id=current_user.id)
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Help ticket {ticket_id} not found"
            )
        return ticket
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/helpline", response_model=HelplineConfigResponse)
def get_helpline_config():
    """
    Returns configured helpline contact information.
    Truthfully reports pending configuration if no numbers are configured.
    """
    return HelpService.get_helpline_config()
