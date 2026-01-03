import httpx
from app.settings import settings
from app.sources.http import get_json, build_headers
from app.sources.rate_limit import TokenBucket


class GitHubClient:
    def __init__(self, http: httpx.Client):
        self.http = http
        self.bucket = TokenBucket.create(rate_per_sec=1.0, burst=3)

    def _headers(self) -> dict:
        h = build_headers()
        if settings.github_token:
            h["Authorization"] = f"Bearer {settings.github_token}"
        h["Accept"] = "application/vnd.github+json"
        return h

    def search_users(self, query: str, per_page: int = 30, page: int = 1) -> dict:
        self.bucket.take()
        url = "https://api.github.com/search/users"
        params = {"q": query, "per_page": per_page, "page": page}
        return get_json(self.http, url, headers=self._headers(), params=params)

    def get_user(self, login: str) -> dict:
        self.bucket.take()
        url = f"https://api.github.com/users/{login}"
        return get_json(self.http, url, headers=self._headers(), params=None)
