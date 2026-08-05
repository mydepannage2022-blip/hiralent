"""Internal service-to-service authentication.

Guards inbound calls from the Node backend so that reaching the service port is not,
by itself, enough to drive document validation. The shared secret lives in the
INTERNAL_API_TOKEN env var and is compared in constant time. Fail-closed: an unset
token rejects every call (500) rather than silently accepting them.
"""
import hmac
import os

from fastapi import Depends, HTTPException, Security
from fastapi.security import APIKeyHeader

api_key_header = APIKeyHeader(name="X-API-Token", auto_error=False)


async def validate_internal_token(api_key: str = Security(api_key_header)):
    """Validate the X-API-Token header against INTERNAL_API_TOKEN."""
    expected = os.getenv("INTERNAL_API_TOKEN", "")
    if not expected:
        # Fail closed AND say why — so a missing token reads as "service misconfigured",
        # not as a bad caller credential.
        raise HTTPException(
            status_code=500,
            detail="INTERNAL_API_TOKEN is not configured on this service",
        )
    # Encode first: compare_digest on str raises TypeError for non-ASCII, which would be a
    # 500 instead of a clean 403 for a junk token.
    if not api_key or not hmac.compare_digest(api_key.encode("utf-8"), expected.encode("utf-8")):
        raise HTTPException(
            status_code=403,
            detail="Invalid or missing internal API token",
        )
    return api_key


# Dependency for internal routes
internal_auth = Depends(validate_internal_token)
