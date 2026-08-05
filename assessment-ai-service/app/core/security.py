import hmac

from fastapi import HTTPException, Security, Depends
from fastapi.security import APIKeyHeader
from app.core.config import settings

api_key_header = APIKeyHeader(name="X-API-Token", auto_error=False)

async def validate_internal_token(api_key: str = Security(api_key_header)):
    """Validate internal service-to-service communication"""
    expected = settings.INTERNAL_API_TOKEN
    if not expected:
        # No token configured. Fail closed AND say why — without this the missing-default
        # case would silently 403 every internal call and look like a bad caller token.
        raise HTTPException(
            status_code=500,
            detail="INTERNAL_API_TOKEN is not configured on this service"
        )
    # Constant-time compare so a caller can't infer the token byte-by-byte via timing.
    # Encode first: hmac.compare_digest on str raises TypeError for non-ASCII input, which
    # would surface as a 500 instead of a clean 403 for a junk token.
    if not api_key or not hmac.compare_digest(api_key.encode("utf-8"), expected.encode("utf-8")):
        raise HTTPException(
            status_code=403,
            detail="Invalid or missing internal API token"
        )
    return api_key

# Dependency for internal routes
internal_auth = Depends(validate_internal_token)