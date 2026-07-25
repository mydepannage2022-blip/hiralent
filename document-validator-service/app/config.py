from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # Service
    SERVICE_NAME: str = "document-validator"
    SERVICE_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8002

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:4000"]

    # MinIO/S3 Storage — credentials have NO default: a shared, publicly-known key pair
    # would silently grant access on any misconfigured deployment.
    # Must be supplied via env/.env; empty means "not configured".
    S3_ENDPOINT: str = "http://127.0.0.1:9000"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_BUCKET: str = "hiralent-uploads"
    S3_SECURE: bool = False

    # OCR Settings
    OCR_LANGS: str = "eng+fra"
    OCR_CONFIDENCE_THRESHOLD: float = 0.85
    OCR_TARGET_MIN_WIDTH: int = 1800
    TESSERACT_CMD: str = ""  # Path to tesseract if not in PATH
    USE_EASYOCR: bool = False  # Use EasyOCR instead of Tesseract

    # Redis/Queue
    REDIS_URL: str = "redis://127.0.0.1:6379"

    # Webhook
    BACKEND_WEBHOOK_URL: str = "http://localhost:4000/api/v1/webhooks/document-validation"
    BACKEND_INTERNAL_TOKEN: str = ""  # Token for backend webhook authentication

    # Timeouts
    VALIDATION_TIMEOUT_SECONDS: int = 120

    # AI Configuration (OpenAI or Gemini)
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Ignore extra environment variables


settings = Settings()

# Configure Tesseract path if specified
if settings.TESSERACT_CMD:
    import pytesseract
    pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
