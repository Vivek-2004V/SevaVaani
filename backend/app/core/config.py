"""
Core Application Configuration for SEVA VAANI.
Loads environment variables and sets system-wide paths and settings.
"""

import os
from typing import List


def _load_dotenv():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
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
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    DATA_DIR: str = os.path.join(BASE_DIR, "data")
    SERVICES_DIR: str = os.path.join(DATA_DIR, "services")
    DEFAULT_SERVICE_PATH: str = os.path.join(SERVICES_DIR, "scholarship.json")

    # Database: Always normalize to canonical BASE_DIR/seva_vaani.db
    _raw_db_url = os.getenv("DATABASE_URL", "")
    if _raw_db_url and _raw_db_url.startswith("sqlite:///./"):
        DATABASE_URL: str = f"sqlite:///{os.path.join(BASE_DIR, _raw_db_url.replace('sqlite:///./', ''))}"
    elif _raw_db_url:
        DATABASE_URL: str = _raw_db_url
    else:
        DATABASE_URL: str = f"sqlite:///{os.path.join(BASE_DIR, 'seva_vaani.db')}"
    SQLITE_DB_PATH: str = os.path.join(BASE_DIR, "seva_vaani.db")

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


settings = Settings()
