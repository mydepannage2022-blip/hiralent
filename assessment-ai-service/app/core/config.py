from pydantic import BaseModel
import os

class Settings(BaseModel):
    service_name: str = os.getenv("SERVICE_NAME", "ai-assessment")
    service_env: str = os.getenv("SERVICE_ENV", "dev")
    service_port: int = int(os.getenv("SERVICE_PORT", "8000"))
    internal_api_token: str = os.getenv("INTERNAL_API_TOKEN", "dev-token")
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    wafaa_qgen_addr: str = os.getenv("WAFAA_QGEN_ADDR", "localhost:50052")
    youssra_exec_addr: str = os.getenv("YOUSSRA_EXEC_ADDR", "localhost:50053")

settings = Settings()
