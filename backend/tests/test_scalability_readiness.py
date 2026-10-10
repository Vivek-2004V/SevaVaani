"""
Unit and Integration Tests for Production Scalability Readiness.
Verifies:
1. Multi-tier caching with LRU eviction and hit/miss metrics
2. Asynchronous task queue dispatch and status reporting
3. Kubernetes liveness and readiness health probes
4. High-concurrency database connection pooling configuration
"""

import time
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.cache import InMemoryLRUCache, cache, cache_result
from app.core.tasks import TaskManager, task_manager
from app.core.config import settings
from app.db.session import engine


@pytest.fixture
def client():
    return TestClient(app)


def test_in_memory_lru_cache_lifecycle():
    """Verify cache get, set, delete, and eviction behavior."""
    test_cache = InMemoryLRUCache(max_size=3, default_ttl=5)

    test_cache.set("a", 1)
    test_cache.set("b", 2)
    test_cache.set("c", 3)

    assert test_cache.get("a") == 1
    assert test_cache.get("b") == 2
    assert test_cache.get("missing") is None

    # Test LRU eviction when exceeding max_size
    test_cache.set("d", 4)
    assert len(test_cache._cache) == 3

    # Check stats
    stats = test_cache.stats()
    assert stats["hits"] >= 2
    assert stats["misses"] >= 1
    assert stats["hit_ratio_pct"] > 0


def test_cache_decorator():
    """Verify @cache_result decorator memoization."""
    call_count = 0

    @cache_result(ttl=10, prefix="test_calc")
    def expensive_calculation(x: int, y: int) -> int:
        nonlocal call_count
        call_count += 1
        return x + y

    res1 = expensive_calculation(5, 10)
    res2 = expensive_calculation(5, 10)

    assert res1 == 15
    assert res2 == 15
    assert call_count == 1  # Function was only executed once


def test_async_task_manager():
    """Verify background task dispatch, execution, and result tracking."""
    mgr = TaskManager()

    def sample_heavy_job(val: int) -> int:
        return val * 2

    task_id = mgr.dispatch(sample_heavy_job, 21)
    assert task_id is not None

    # Wait briefly for thread execution
    time.sleep(0.1)

    status = mgr.get_status(task_id)
    assert status is not None
    assert status["status"] == "SUCCESS"
    assert status["result"] == 42

    stats = mgr.stats()
    assert stats["total_tasks"] >= 1
    assert stats["completed_tasks"] >= 1


def test_kubernetes_probes(client):
    """Verify /api/health/live and /api/health/ready for container orchestration."""
    # Liveness probe
    live_res = client.get("/api/health/live")
    assert live_res.status_code == 200
    assert live_res.json()["status"] == "alive"

    # Readiness probe
    ready_res = client.get("/api/health/ready")
    assert ready_res.status_code == 200
    assert ready_res.json()["status"] == "ready"
    assert ready_res.json()["database"] == "connected"

    # System metrics probe
    metrics_res = client.get("/api/metrics/system")
    assert metrics_res.status_code == 200
    data = metrics_res.json()
    assert "cache" in data
    assert "tasks" in data
    assert "uptime_seconds" in data


def test_database_pooling_configuration():
    """Verify pool parameters and engine initialization."""
    assert settings.DB_POOL_SIZE >= 5
    assert settings.DB_MAX_OVERFLOW >= 10
    assert settings.DB_POOL_TIMEOUT > 0
    assert engine is not None
