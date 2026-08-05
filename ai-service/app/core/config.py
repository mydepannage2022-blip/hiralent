import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    """Configuration for AI Question Generation Engine"""
    
    # API Configuration
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # AI Configuration - GEMINI AU LIEU D'OPENAI
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    AI_MODEL: str = os.getenv("AI_MODEL", "gemini-pro")
    
    # External Services
    NODE_BACKEND_URL: str = os.getenv("NODE_BACKEND_URL", "http://localhost:5000")

    # CORS — env-driven allowlist (comma-separated). A wildcard "*" with
    # allow_credentials is rejected by browsers and is unsafe, so we default to an
    # explicit localhost list and let deployment override CORS_ALLOW_ORIGINS.
    CORS_ALLOW_ORIGINS: list = [
        o.strip()
        for o in os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000,http://localhost:5000").split(",")
        if o.strip()
    ]

settings = Settings()