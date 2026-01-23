from fastapi import Header, HTTPException
from .settings import settings

def require_internal_key(x_service_key: str = Header(default="", alias="X-Service-Key")):
    if not settings.SERVICE_API_KEY:
        return
    if x_service_key != settings.SERVICE_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid service key")
