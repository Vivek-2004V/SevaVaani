"""
Core Application Configuration for SEVA VAANI.
Loads environment variables and sets system-wide paths and settings.
"""

import os
from typing import List


def _find_base_dir() -> str:
    """Finds canonical workspace root directory by resolving symlinks."""
    real_file = os.path.realpath(__file__)
    cur = real_file
    for _ in range(4):
        cur = os.path.dirname(cur)
    return cur


def _load_dotenv():
    base_dir = _find_base_dir()
    env_path = os.path.join(base_dir, ".env")
    if os.path.isfile(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip("'\"")
                    if k not in os.environ:
                        os.environ[k] = v


_load_dotenv()


class Settings:
    PROJECT_NAME: str = "SEVA VAANI"
    VERSION: str = "1.0.0"
    APP_ENV: str = os.getenv("APP_ENV", "development")

    # Base directory: points to root workspace (/Users/vivek/Desktop/SevaVaani)
    BASE_DIR: str = _find_base_dir()
    DATA_DIR: str = os.path.join(BASE_DIR, "data")
    SERVICES_DIR: str = os.path.join(DATA_DIR, "services")
    DEFAULT_SERVICE_PATH: str = os.path.join(SERVICES_DIR, "scholarship.json")

    # Database: Always normalize to canonical BASE_DIR/seva_vaani.db
    CANONICAL_DB_FILE: str = os.path.join(BASE_DIR, "seva_vaani.db")
    _raw_db_url = os.getenv("DATABASE_URL", "").strip()

    if _raw_db_url.startswith("sqlite:///"):
        _rel_path = _raw_db_url.replace("sqlite:///", "")
        if os.path.isabs(_rel_path):
            DATABASE_URL: str = _raw_db_url
            SQLITE_DB_PATH: str = _rel_path
        else:
            _norm_rel = _rel_path.lstrip("./")
            _resolved_file = os.path.join(BASE_DIR, _norm_rel) if _norm_rel else CANONICAL_DB_FILE
            DATABASE_URL: str = f"sqlite:///{_resolved_file}"
            SQLITE_DB_PATH: str = _resolved_file
    elif _raw_db_url:
        DATABASE_URL: str = _raw_db_url
        SQLITE_DB_PATH: str = CANONICAL_DB_FILE
    else:
        DATABASE_URL: str = f"sqlite:///{CANONICAL_DB_FILE}"
        SQLITE_DB_PATH: str = CANONICAL_DB_FILE

    # CORS - Restricted to authorized local frontend and extension ports
    FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]

    # Speech Providers
    STT_PROVIDER: str = os.getenv("STT_PROVIDER", "browser_hybrid")  # bhashini | browser_hybrid | mock
    TTS_PROVIDER: str = os.getenv("TTS_PROVIDER", "browser_hybrid")

    # LLM Provider Configuration
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "rules_structured")
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-3.5-turbo")
    LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")

    # Ollama Local Configuration
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen3:4b")
    OLLAMA_TIMEOUT_SEC: float = float(os.getenv("OLLAMA_TIMEOUT_SEC", "5.0"))

    BHASHINI_API_KEY: str = os.getenv("BHASHINI_API_KEY", "")
    BHASHINI_USER_ID: str = os.getenv("BHASHINI_USER_ID", "")

    # Scalability & Connection Pooling (PostgreSQL / MySQL)
    DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "20"))
    DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "40"))
    DB_POOL_TIMEOUT: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))
    DB_POOL_RECYCLE: int = int(os.getenv("DB_POOL_RECYCLE", "1800"))

    # Distributed Caching & Task Queues (Redis)
    REDIS_URL: str = os.getenv("REDIS_URL", "")
    CACHE_TTL_SECONDS: int = int(os.getenv("CACHE_TTL_SECONDS", "3600"))

    # Human Helpline & Support Configuration
    HELPLINE_PHONE: str = os.getenv("HELPLINE_PHONE", "")
    HELPLINE_WHATSAPP: str = os.getenv("HELPLINE_WHATSAPP", "")
    HELPLINE_HOURS: str = os.getenv("HELPLINE_HOURS", "Mon-Sat 9:00 AM - 6:00 PM IST")

    # Human Support Notification Configuration
    NOTIFICATION_ENABLED: bool = os.getenv("NOTIFICATION_ENABLED", "false").lower() in ("true", "1")
    NOTIFICATION_WEBHOOK_URL: str = os.getenv("NOTIFICATION_WEBHOOK_URL", "")
    NOTIFICATION_CHANNEL: str = os.getenv("NOTIFICATION_CHANNEL", "none_configured")


settings = Settings()
