import httpx
from app.settings import settings
from app.sources.http import get_json, build_headers
from app.sources.rate_limit import TokenBucket


class LeverClient:
    """
    Lever API:
    Base depends on account / endpoint.
    Many setups use:
      https://api.lever.co/v1/
    Auth commonly uses Bearer token (depends on Lever token type).
    """

    BASE = "https://api.lever.co/v1"

    def __init__(self, http: httpx.Client):
        self.http = http
        self.bucket = TokenBucket.create(rate_per_sec=2.0, burst=5)

    def _headers(self) -> dict:
        h = build_headers()
        if settings.lever_api_key:
            h["Authorization"] = f"Bearer {settings.lever_api_key}"
        h["Accept"] = "application/json"
        return h

    def list_candidates(self, limit: int = 50, offset: str | None = None) -> dict:
        """
        Lever uses pagination; some endpoints return 'next' offsets.
        Endpoint names can vary by Lever API version; adjust if your org uses different routes.
        """
        self.bucket.take()
        url = f"{self.BASE}/candidates"
        params = {"limit": limit}
        if offset:
            params["offset"] = offset
        return get_json(self.http, url, headers=self._headers(), params=params)
