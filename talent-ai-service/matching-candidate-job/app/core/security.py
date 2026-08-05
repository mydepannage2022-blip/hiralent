import hmac

from fastapi import Header, HTTPException
from .settings import settings

def require_internal_key(x_service_key: str = Header(default="", alias="X-Service-Key")):
    # Fail closed: an unset key means "not configured", which must reject every caller
    # (500) — NOT accept them. Previously this early-returned, so a missing key silently
    # disabled the guard and let anyone reach the matching endpoints.
    # `effective_service_key` accepts either SERVICE_API_KEY or INTERNAL_SERVICE_KEY (the
    # backend sends the latter's value), so a single shared secret works either way.
    expected_key = settings.effective_service_key
    if not expected_key:
        raise HTTPException(
            status_code=500,
            detail="SERVICE_API_KEY / INTERNAL_SERVICE_KEY is not configured on this service",
        )
    # Constant-time compare so the key can't be inferred byte-by-byte via timing.
    # Encode first: compare_digest on str raises TypeError for non-ASCII input.
    if not x_service_key or not hmac.compare_digest(
        x_service_key.encode("utf-8"), expected_key.encode("utf-8")
    ):
        raise HTTPException(status_code=401, detail="Invalid service key")
