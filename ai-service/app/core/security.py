"""Internal service-to-service authentication.

This service defines its routes directly on the FastAPI app (plus a couple of included
routers), so there is no single router to hang a dependency on. Instead we guard every
non-public path with an HTTP middleware: reaching the port is not enough — callers must
present the shared secret in the X-API-Token header (compared in constant time).

Fail-closed: when INTERNAL_API_TOKEN is unset, every guarded call is rejected (500).
Public paths (liveness/docs) stay open, and CORS preflight (OPTIONS) is never blocked.
"""
import hmac
import os

from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

# Paths that must stay reachable without a token (probes / API docs).
PUBLIC_PATHS = {
    "/",
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/variations/health",
}

api_key_header = APIKeyHeader(name="X-API-Token", auto_error=False)


def _expected_token() -> str:
    return os.getenv("INTERNAL_API_TOKEN", "")


def _token_ok(token: str) -> bool:
    expected = _expected_token()
    if not expected:
        return False
    # Encode first: compare_digest on str raises TypeError for non-ASCII input.
    return bool(token) and hmac.compare_digest(token.encode("utf-8"), expected.encode("utf-8"))


async def validate_internal_token(api_key: str = Security(api_key_header)):
    """Dependency form of the guard (kept for per-route use / tests)."""
    expected = _expected_token()
    if not expected:
        raise HTTPException(
            status_code=500,
            detail="INTERNAL_API_TOKEN is not configured on this service",
        )
    if not api_key or not hmac.compare_digest(api_key.encode("utf-8"), expected.encode("utf-8")):
        raise HTTPException(
            status_code=403,
            detail="Invalid or missing internal API token",
        )
    return api_key


async def internal_token_guard(request, call_next):
    """ASGI middleware: enforce the internal token on every non-public path."""
    if request.method == "OPTIONS" or request.url.path in PUBLIC_PATHS:
        return await call_next(request)
    if not _expected_token():
        return JSONResponse(
            status_code=500,
            content={"detail": "INTERNAL_API_TOKEN is not configured on this service"},
        )
    token = request.headers.get("X-API-Token", "")
    if not _token_ok(token):
        return JSONResponse(
            status_code=403,
            content={"detail": "Invalid or missing internal API token"},
        )
    return await call_next(request)


def add_internal_token_guard(app) -> None:
    """Register the internal-token middleware on the FastAPI app."""
    app.add_middleware(BaseHTTPMiddleware, dispatch=internal_token_guard)
