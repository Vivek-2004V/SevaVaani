"""
SEVA VAANI — Asynchronous Task Dispatch & Worker Queue Manager.
Enables non-blocking background job processing for heavy compute tasks:
- Document verification hash indexing
- Confirmation receipt compilation
- Analytics & Telemetry aggregation
- SMS / WhatsApp notification webhooks
Supports FastAPI BackgroundTasks, in-memory ThreadPoolExecutor, and pluggable Celery/Redis workers.
"""

from __future__ import annotations

import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging
import threading
import time
from typing import Any, Callable, Dict, Optional
import uuid

logger = logging.getLogger("seva_vaani.tasks")

# Thread pool for asynchronous CPU/IO operations (prevents event loop blocking)
_DEFAULT_EXECUTOR = ThreadPoolExecutor(max_workers=10, thread_name_prefix="seva_worker")


class TaskManager:
    """Manages background task registration, execution tracking, and status."""

    def __init__(self, executor: Optional[ThreadPoolExecutor] = None):
        self.executor = executor or _DEFAULT_EXECUTOR
        self._tasks: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()

    def dispatch(self, func: Callable, *args, **kwargs) -> str:
        """
        Dispatches a callable function to run asynchronously in the worker pool.
        Returns a unique task_id for tracking status.
        """
        task_id = str(uuid.uuid4())
        task_meta = {
            "task_id": task_id,
            "name": func.__name__,
            "status": "QUEUED",
            "enqueued_at": time.time(),
            "completed_at": None,
            "error": None,
        }

        with self._lock:
            self._tasks[task_id] = task_meta

        def _runner():
            with self._lock:
                self._tasks[task_id]["status"] = "RUNNING"
                self._tasks[task_id]["started_at"] = time.time()
            try:
                result = func(*args, **kwargs)
                with self._lock:
                    self._tasks[task_id]["status"] = "SUCCESS"
                    self._tasks[task_id]["result"] = result
                    self._tasks[task_id]["completed_at"] = time.time()
                return result
            except Exception as exc:
                logger.exception("Task %s failed: %s", task_id, str(exc))
                with self._lock:
                    self._tasks[task_id]["status"] = "FAILED"
                    self._tasks[task_id]["error"] = str(exc)
                    self._tasks[task_id]["completed_at"] = time.time()
                return None

        self.executor.submit(_runner)
        return task_id

    def get_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            task = self._tasks.get(task_id)
            if task:
                return dict(task)
            return None

    def active_task_count(self) -> int:
        with self._lock:
            return sum(1 for t in self._tasks.values() if t["status"] in ("QUEUED", "RUNNING"))

    def stats(self) -> Dict[str, Any]:
        with self._lock:
            total = len(self._tasks)
            completed = sum(1 for t in self._tasks.values() if t["status"] == "SUCCESS")
            failed = sum(1 for t in self._tasks.values() if t["status"] == "FAILED")
            active = total - completed - failed
            return {
                "total_tasks": total,
                "active_tasks": active,
                "completed_tasks": completed,
                "failed_tasks": failed,
                "worker_pool_size": self.executor._max_workers,
            }


# Singleton task manager
task_manager = TaskManager()
