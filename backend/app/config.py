import os
from typing import List

class Settings:
    PROJECT_NAME: str = "SEVA VAANI"
    VERSION: str = "1.0.0"
    APP_ENV: str = os.getenv("APP_ENV", "development")
    
    # Base directory
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    DATA_DIR: str = os.path.join(BASE_DIR, "data")
    SERVICES_DIR: str = os.path.join(DATA_DIR, "services")
    DEFAULT_SERVICE_PATH: str = os.path.join(SERVICES_DIR, "scholarship.json")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'seva_vaani.db')}")
    SQLITE_DB_PATH: str = os.path.join(BASE_DIR, "seva_vaani.db")
    
    # CORS
    FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    ALLOWED_ORIGINS: List[str] = ["*", "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8000", "http://127.0.0.1:8000"]
    
    # Speech Providers
    STT_PROVIDER: str = os.getenv("STT_PROVIDER", "browser_hybrid")  # bhashini | browser_hybrid | mock
    TTS_PROVIDER: str = os.getenv("TTS_PROVIDER", "browser_hybrid")
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "rules_structured")
    
    BHASHINI_API_KEY: str = os.getenv("BHASHINI_API_KEY", "")
    BHASHINI_USER_ID: str = os.getenv("BHASHINI_USER_ID", "")

settings = Settings()
