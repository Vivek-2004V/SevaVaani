"""
SEVA VAANI — High-Performance Multi-Tier Caching Layer.
Provides fast in-memory LRU cache with TTL expiration and pluggable Redis backend.
Reduces database & disk I/O for scheme schemas, lexicons, and static state machines.
"""

from __future__ import annotations

import functools
import json
import logging
import threading
import time
from typing import Any, Callable, Dict, Optional, Tuple

from app.core.config import settings

logger = logging.getLogger("seva_vaani.cache")


class InMemoryLRUCache:
    """Thread-safe in-memory cache with time-to-live (TTL) and LRU eviction."""

    def __init__(self, max_size: int = 1000, default_ttl: int = 3600):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self._cache: Dict[str, Tuple[Any, float]] = {}  # key -> (value, expiry_timestamp)
        self._lock = threading.RLock()
        self.hits = 0
        self.misses = 0

    def get(self, key: str) -> Optional[Any]:
        now = time.time()
        with self._lock:
            if key in self._cache:
                val, expiry = self._cache[key]
                if expiry > now:
                    self.hits += 1
                    return val
                # Expired
                del self._cache[key]
            self.misses += 1
            return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        effective_ttl = ttl if ttl is not None else self.default_ttl
        expiry = time.time() + effective_ttl
        with self._lock:
            # Evict if full
            if len(self._cache) >= self.max_size and key not in self._cache:
                oldest_key = next(iter(self._cache))
                del self._cache[oldest_key]
            self._cache[key] = (value, expiry)

    def delete(self, key: str) -> bool:
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()
            self.hits = 0
            self.misses = 0

    def stats(self) -> Dict[str, Any]:
        with self._lock:
            total = self.hits + self.misses
            hit_ratio = round((self.hits / total) * 100, 2) if total > 0 else 0.0
            return {
                "backend": "in_memory_lru",
                "keys_count": len(self._cache),
                "hits": self.hits,
                "misses": self.misses,
                "hit_ratio_pct": hit_ratio,
            }


class CacheService:
    """
    Unified Cache Service bridging memory and distributed Redis backends.
    Falls back gracefully to memory if Redis is unavailable or unconfigured.
    """

    def __init__(self):
        self._mem = InMemoryLRUCache(default_ttl=settings.CACHE_TTL_SECONDS)
        self._redis_client = None
        self._use_redis = False

        if settings.REDIS_URL:
            try:
                import redis
                self._redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
                self._redis_client.ping()
                self._use_redis = True
                logger.info("Connected to distributed Redis cache at %s", settings.REDIS_URL)
            except Exception as e:
                logger.warning("Redis initialization failed, falling back to in-memory cache: %s", str(e))
                self._use_redis = False

    def get(self, key: str) -> Optional[Any]:
        if self._use_redis and self._redis_client:
            try:
                raw = self._redis_client.get(key)
                if raw is not None:
                    return json.loads(raw)
            except Exception as e:
                logger.debug("Redis get failed for %s: %s", key, str(e))

        return self._mem.get(key)

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        effective_ttl = ttl if ttl is not None else settings.CACHE_TTL_SECONDS
        if self._use_redis and self._redis_client:
            try:
                self._redis_client.set(key, json.dumps(value), ex=effective_ttl)
            except Exception as e:
                logger.debug("Redis set failed for %s: %s", key, str(e))

        self._mem.set(key, value, ttl=effective_ttl)

    def delete(self, key: str) -> bool:
        if self._use_redis and self._redis_client:
            try:
                self._redis_client.delete(key)
            except Exception:
                pass
        return self._mem.delete(key)

    def clear(self) -> None:
        if self._use_redis and self._redis_client:
            try:
                self._redis_client.flushdb()
            except Exception:
                pass
        self._mem.clear()

    def stats(self) -> Dict[str, Any]:
        stats = self._mem.stats()
        stats["distributed_redis_active"] = self._use_redis
        return stats


# Global Singleton Cache Instance
cache = CacheService()


def cache_result(ttl: int = 300, prefix: str = ""):
    """Decorator to cache idempotent function results based on arguments."""
    def decorator(fn: Callable):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            key = f"{prefix or fn.__name__}:{str(args)}:{str(kwargs)}"
            cached = cache.get(key)
            if cached is not None:
                return cached
            result = fn(*args, **kwargs)
            if result is not None:
                cache.set(key, result, ttl=ttl)
            return result
        return wrapper
    return decorator
