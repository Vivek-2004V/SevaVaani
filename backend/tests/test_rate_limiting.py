"""
Tests for SlidingWindowRateLimiter and Authentication Rate Limiting.
"""

import os
import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.rate_limiter import auth_limiter, SlidingWindowRateLimiter

client = TestClient(app)


def test_rate_limiter_blocks_excessive_requests():
    """Verify rate limiter blocks after reaching limit and returns HTTP 429."""
    os.environ["RATE_LIMIT_ENABLED"] = "true"
    auth_limiter.reset()

    # Create a dedicated local limiter with small threshold
    limiter = SlidingWindowRateLimiter(times=3, seconds=10, scope="test_block")

    from fastapi import Request
    class DummyRequest:
        def __init__(self, ip: str):
            self.client = type("Client", (), {"host": ip})()
            self.headers = {}

    req = DummyRequest("192.168.1.100")

    # First 3 requests succeed
    limiter.check(req)
    limiter.check(req)
    limiter.check(req)

    # 4th request must raise 429
    with pytest.raises(Exception) as exc_info:
        limiter.check(req)

    assert exc_info.value.status_code == 429
    assert "Too many requests" in exc_info.value.detail
    assert "Retry-After" in exc_info.value.headers


def test_rate_limiter_trusted_proxy_handling():
    """Verify rate limiter parses X-Forwarded-For when TRUST_PROXY_HEADERS is enabled."""
    os.environ["RATE_LIMIT_ENABLED"] = "true"
    os.environ["TRUST_PROXY_HEADERS"] = "true"

    limiter = SlidingWindowRateLimiter(times=2, seconds=10, scope="test_proxy")

    class DummyRequest:
        def __init__(self, socket_ip: str, xff: str):
            self.client = type("Client", (), {"host": socket_ip})()
            self.headers = {"X-Forwarded-For": xff} if xff else {}

    # Two distinct clients routed through the same reverse proxy (socket IP 10.0.0.1)
    req_client_a = DummyRequest("10.0.0.1", "203.0.113.195, 10.0.0.1")
    req_client_b = DummyRequest("10.0.0.1", "198.51.100.42, 10.0.0.1")

    # Client A uses 2 requests
    limiter.check(req_client_a)
    limiter.check(req_client_a)

    # Client A's 3rd request is blocked
    with pytest.raises(Exception) as exc_info:
        limiter.check(req_client_a)
    assert exc_info.value.status_code == 429

    # Client B should NOT be blocked because their client IP is different
    limiter.check(req_client_b)  # Should succeed

    os.environ["TRUST_PROXY_HEADERS"] = "false"
    os.environ["RATE_LIMIT_ENABLED"] = "false"


def test_login_endpoint_enforces_rate_limit():
    """Verify /api/auth/login triggers HTTP 429 when enabled and exhausted."""
    os.environ["RATE_LIMIT_ENABLED"] = "true"
    auth_limiter.reset()

    # We configured auth_limiter with times=5
    # Send 5 attempts
    for _ in range(5):
        client.post("/api/auth/login", json={
            "email": "nonexistent_citizen@example.com",
            "password": "WrongPassword123!"
        })

    # 6th attempt must be throttled with 429
    res = client.post("/api/auth/login", json={
        "email": "nonexistent_citizen@example.com",
        "password": "WrongPassword123!"
    })

    assert res.status_code == 429
    assert "Too many requests" in res.json()["detail"]
    assert "Retry-After" in res.headers

    # Cleanup: disable rate limiting so subsequent tests run unrestricted
    os.environ["RATE_LIMIT_ENABLED"] = "false"
    auth_limiter.reset()
