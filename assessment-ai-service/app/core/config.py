import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Service info
    SERVICE_NAME = os.getenv("SERVICE_NAME", "ai-assessment")
    SERVICE_ENV = os.getenv("SERVICE_ENV", "dev")
    HOST = "0.0.0.0"
    PORT = int(os.getenv("SERVICE_PORT", 8001))

    # Security — no default: a shared, publicly-known token would accept any caller.
    # Unset means "not configured", which validate_internal_token() rejects outright.
    INTERNAL_API_TOKEN = os.getenv("INTERNAL_API_TOKEN", "")

    # Redis
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # NOTE: the Wafaa/Youssra gRPC client stubs + USE_MOCK_* toggles were removed (Wave 4 /
    # Session 3). They were orphaned placeholders returning fabricated data and were never
    # wired to any route; the counterpart services don't exist here. The real cross-service
    # integration lives in the Node backend over HTTP/webhook (externalClients.ts, compete
    # webhook) — see hiralent-master-plan/matrices/dead-code-and-cleanup.md.

    # Gemini API
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
    @property
    def GEMINI_ENABLED(self):
        return bool(self.GOOGLE_API_KEY)

    # CORS — env-driven allowlist (comma-separated), mirroring the ai-service pattern so
    # prod origins can be reconfigured without a code change. Defaults to the local Node
    # backend origin for dev. Never a "*" wildcard.
    CORS_ALLOW_ORIGINS = [
        o.strip()
        for o in os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:5000").split(",")
        if o.strip()
    ]

    # NLP model
    SPACY_MODEL = os.getenv("SPACY_MODEL", "en_core_web_sm")

    # Logging
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

settings = Settings()
