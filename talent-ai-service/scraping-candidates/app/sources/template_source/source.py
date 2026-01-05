import httpx
from typing import Iterable, Optional

from app.sources.base import BaseSource
from app.sources.template_source.client import TemplateClient
from app.sources.template_source.parser import parse_template_profile


class TemplateSource(BaseSource):
    name = "template_source"

    def __init__(self, base_url: str = "https://example.com/api"):
        self._client = TemplateClient(httpx.Client(timeout=30), base_url=base_url)

    def descriptor(self) -> dict:
        return {
            "name": self.name,
            "enabled": False,
            "requires": ["CUSTOM_BASE_URL", "CUSTOM_AUTH"],
            "notes": "Template for new sources. Implement real base_url/auth and enable in registry.",
        }

    def fetch(self, query: Optional[str], limit: int) -> Iterable[dict]:
        data = self._client.list_profiles(query=query, limit=limit)
        items = data.get("items", []) if isinstance(data, dict) else []
        return items[:limit]

    def parse(self, raw: dict):
        return parse_template_profile(raw)
