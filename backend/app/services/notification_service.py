"""
Human Support Notification Adapter for SEVA VAANI.
Provides clearly separated dispatch logic for notifying human support operators/CSCs.
Strictly truth-telling:
- Never claims notification was delivered unless the external provider confirms HTTP 2xx.
- Discloses 'none_configured' / 'not_configured' when credentials/endpoints are absent.
- Never sends sensitive citizen PII (Aadhaar, biometric, personal credentials) over notification webhooks.
- Implements exponential backoff retry for transient network errors.
"""

from __future__ import annotations

import json
import logging
import time
import urllib.request
import urllib.error
from typing import Dict, Any, Optional

from app.core.config import settings

logger = logging.getLogger("seva_vaani.notification")


class SupportNotificationAdapter:
    """
    Adapter for notifying human support personnel when a citizen submits a help ticket.
    """

    @classmethod
    def notify_support_team(
        cls,
        ticket_id: str,
        category: str,
        language: str = "hi",
        has_description: bool = False,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Attempts to deliver an asynchronous notification to the configured support endpoint.
        Returns truthful outcome metadata.
        """
        # 1. Check if notifications are enabled and configured
        if not settings.NOTIFICATION_ENABLED or not settings.NOTIFICATION_WEBHOOK_URL:
            logger.info(
                "External support notification not dispatched for ticket %s: "
                "NOTIFICATION_ENABLED=%s, Webhook=%s",
                ticket_id,
                settings.NOTIFICATION_ENABLED,
                bool(settings.NOTIFICATION_WEBHOOK_URL)
            )
            return {
                "sent": False,
                "channel": "none_configured",
                "status": "not_configured",
                "detail": "External notification service is not configured. Ticket safely stored in backend."
            }

        # 2. Build sanitized payload - strictly NO PII
        payload = {
            "ticket_id": ticket_id,
            "category": category,
            "language": language,
            "has_description": has_description,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "source": "SevaVaani Citizen Portal"
        }
        if session_id:
            payload["session_id"] = session_id

        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            settings.NOTIFICATION_WEBHOOK_URL,
            data=data_bytes,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "SevaVaani-Support-Notifier/1.0"
            },
            method="POST"
        )

        # 3. Retry loop with exponential backoff (max 2 retries)
        channel_name = settings.NOTIFICATION_CHANNEL if settings.NOTIFICATION_CHANNEL != "none_configured" else "webhook"
        max_attempts = 2
        last_error = ""

        for attempt in range(1, max_attempts + 1):
            try:
                # 3-second timeout to prevent stalling citizen request
                with urllib.request.urlopen(req, timeout=3.0) as response:
                    if 200 <= response.status < 300:
                        logger.info("Notification successfully delivered for ticket %s via %s", ticket_id, channel_name)
                        return {
                            "sent": True,
                            "channel": channel_name,
                            "status": "delivered",
                            "detail": f"Notification confirmed delivered via {channel_name}."
                        }
                    else:
                        last_error = f"HTTP {response.status}"
            except urllib.error.HTTPError as e:
                last_error = f"HTTP {e.code}: {e.reason}"
            except Exception as e:
                last_error = str(e)

            if attempt < max_attempts:
                time.sleep(0.5 * attempt)

        logger.warning("Notification delivery failed for ticket %s: %s", ticket_id, last_error)
        return {
            "sent": False,
            "channel": channel_name,
            "status": "delivery_failed",
            "detail": f"Notification delivery failed after {max_attempts} attempts: {last_error}"
        }
