import httpx
from typing import Iterable, Optional

from app.sources.base import BaseSource
from app.sources.github.client import GitHubClient
from app.sources.github.parser import parse_github_user


class GitHubSource(BaseSource):
    name = "github"

    def __init__(self):
        self._client: GitHubClient | None = None

    def _get_client(self) -> GitHubClient:
        if not self._client:
            self._client = GitHubClient(httpx.Client(timeout=30))
        return self._client

    def descriptor(self) -> dict:
        return {
            "name": self.name,
            "enabled": True,
            "requires": ["GITHUB_TOKEN (optional)"],
            "notes": "Public API. Good for enrichment; emails are often missing.",
        }

    def fetch(self, query: Optional[str], limit: int) -> Iterable[dict]:
        q = query or "location:Portugal"
        client = self._get_client()

        results = []
        page = 1
        per_page = min(30, max(1, limit))
        while len(results) < limit:
            data = client.search_users(q, per_page=per_page, page=page)
            items = data.get("items", [])
            if not items:
                break
            for it in items:
                if len(results) >= limit:
                    break
                # fetch full user (bio/location/blog/email)
                login = it.get("login")
                if not login:
                    continue
                full = client.get_user(login)
                results.append(full)
            page += 1
        return results

    def parse(self, raw: dict):
        return parse_github_user(raw)
