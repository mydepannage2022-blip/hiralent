import base64
import httpx
from app.settings import settings
from app.sources.http import get_json, build_headers
from app.sources.rate_limit import TokenBucket


class GreenhouseClient:
    """
    Greenhouse Harvest API:
    - Basic auth: username = API key, password = blank
    - Base URL: https://harvest.greenhouse.io/v1/
    """

    BASE = "https://harvest.greenhouse.io/v1"

    def __init__(self, http: httpx.Client):
        self.http = http
        self.bucket = TokenBucket.create(rate_per_sec=2.0, burst=5)

    def _headers(self) -> dict:
        h = build_headers()
        if not settings.greenhouse_api_key:
            return h

        token = f"{settings.greenhouse_api_key}:".encode("utf-8")
        b64 = base64.b64encode(token).decode("utf-8")
        h["Authorization"] = f"Basic {b64}"
        h["Accept"] = "application/json"
        return h

    def list_candidates(self, per_page: int = 100, page: int = 1) -> dict:
        self.bucket.take()
        url = f"{self.BASE}/candidates"
        params = {"per_page": per_page, "page": page}
        return get_json(self.http, url, headers=self._headers(), params=params)
