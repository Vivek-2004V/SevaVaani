"""
SEVA VAANI — In-Memory Sliding Window Rate Limiter.
Provides thread-safe IP-based rate limiting for sensitive mutation & auth endpoints.
Supports safe proxy header handling (X-Forwarded-For) and custom window/rate thresholds.
"""

import os
import time
import threading
from typing import Dict, List, Optional
from fastapi import Request, HTTPException, status


class SlidingWindowRateLimiter:
    """
    Thread-safe sliding window rate limiter.
    Keeps track of timestamps of recent requests per client IP.
    """

    def __init__(self, times: int = 5, seconds: int = 60, scope: str = "auth"):
        self.times = times
        self.seconds = seconds
        self.scope = scope
        self._records = {}  # type: Dict[str, List[float]]
        self._lock = threading.Lock()

    def _get_client_ip(self, request: Request) -> str:
        """
        Safely extracts client IP address.
        If TRUST_PROXY_HEADERS=true is set, parses the client from X-Forwarded-For.
        Otherwise falls back strictly to the direct socket client host.
        """
        trust_proxy = os.getenv("TRUST_PROXY_HEADERS", "false").lower() in ("true", "1", "yes")
        if trust_proxy:
            forwarded_for = request.headers.get("X-Forwarded-For")
            if forwarded_for:
                # First IP in X-Forwarded-For is client original IP
                client_ip = forwarded_for.split(",")[0].strip()
                if client_ip:
                    return client_ip

        if request.client and request.client.host:
            return request.client.host
        return "127.0.0.1"

    def check(self, request: Request) -> None:
        """
        Validates request against rate limit.
        Raises HTTP 429 Too Many Requests if rate is exceeded.
        """
        # Allow disabling rate limiting via env var (e.g., for certain bulk test runs)
        if os.getenv("RATE_LIMIT_ENABLED", "true").lower() in ("false", "0", "no"):
            return

        client_ip = self._get_client_ip(request)
        key = f"{self.scope}:{client_ip}"
        now = time.time()
        window_start = now - self.seconds

        with self._lock:
            history = self._records.get(key, [])
            # Filter timestamps outside the sliding window
            history = [ts for ts in history if ts > window_start]

            if len(history) >= self.times:
                oldest = history[0]
                retry_after = max(1, int(oldest + self.seconds - now))
                self._records[key] = history
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Too many requests on {self.scope}. Please try again in {retry_after} seconds.",
                    headers={"Retry-After": str(retry_after)}
                )

            # Record current request timestamp
            history.append(now)
            self._records[key] = history

    def reset(self) -> None:
        """Clears all recorded rate limit entries (useful for test setup)."""
        with self._lock:
            self._records.clear()

    def __call__(self, request: Request) -> None:
        self.check(request)


# Pre-configured rate limiters for authentication
auth_limiter = SlidingWindowRateLimiter(times=5, seconds=60, scope="auth")


def check_auth_rate_limit(request: Request) -> None:
    """FastAPI dependency for authenticating rate limit on endpoints."""
    auth_limiter.check(request)
