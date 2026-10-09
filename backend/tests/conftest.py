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

# Suppress Starlette/FastAPI TestClient third-party deprecation warnings for clean test output
warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", message=".*StarletteDeprecationWarning.*")
warnings.filterwarnings("ignore", message=".*Using `httpx` with `starlette.testclient` is deprecated.*")
