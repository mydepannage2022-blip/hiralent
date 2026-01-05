import httpx
from app.sources.http import get_json, build_headers


class TemplateClient:
    """
    Copy this source to implement a new API-based connector.
    """

    def __init__(self, http: httpx.Client, base_url: str):
        self.http = http
        self.base_url = base_url.rstrip("/")

    def _headers(self) -> dict:
        return build_headers()

    def list_profiles(self, query: str | None, limit: int) -> dict:
        url = f"{self.base_url}/profiles"
        params = {"q": query or "", "limit": limit}
        return get_json(self.http, url, headers=self._headers(), params=params)
