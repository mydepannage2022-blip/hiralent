from fastapi import HTTPException, Security, Depends
from fastapi.security import APIKeyHeader
from app.core.config import settings

api_key_header = APIKeyHeader(name="X-API-Token", auto_error=False)

async def validate_internal_token(api_key: str = Security(api_key_header)):
    """Validate internal service-to-service communication"""
    if not api_key or api_key != settings.INTERNAL_API_TOKEN:
        raise HTTPException(
            status_code=403,
            detail="Invalid or missing internal API token"
        )
    return api_key

# Dependency for internal routes
internal_auth = Depends(validate_internal_token)