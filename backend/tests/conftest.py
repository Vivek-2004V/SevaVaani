"""
Pytest configuration for SEVA VAANI test suite.
Sets fast deterministic execution defaults and suppresses third-party deprecation warnings.
"""

import os
import sys
import warnings

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Use deterministic mock extraction during general test runs for sub-second speed
os.environ.setdefault("LLM_PROVIDER", "mock")
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")

# Isolate test suite to a dedicated temporary database to protect canonical database
_test_db_path = None
if "DATABASE_URL" not in os.environ:
    import tempfile
    _test_db_fd, _test_db_path = tempfile.mkstemp(suffix="_test_seva_vaani.db")
    os.close(_test_db_fd)
    os.environ["DATABASE_URL"] = f"sqlite:///{_test_db_path}"

def pytest_sessionfinish(session, exitstatus):
    """Clean up the isolated temporary database after test run."""
    global _test_db_path
    if _test_db_path:
        try:
            if os.path.exists(_test_db_path):
                os.remove(_test_db_path)
            for ext in ["-wal", "-shm"]:
                if os.path.exists(_test_db_path + ext):
                    os.remove(_test_db_path + ext)
        except OSError:
            pass

# Suppress Starlette/FastAPI TestClient third-party deprecation warnings for clean test output
warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", message=".*StarletteDeprecationWarning.*")
warnings.filterwarnings("ignore", message=".*Using `httpx` with `starlette.testclient` is deprecated.*")
