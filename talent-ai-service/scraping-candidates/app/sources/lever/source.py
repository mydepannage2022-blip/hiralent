import httpx
from typing import Iterable, Optional

from app.sources.base import BaseSource
from app.sources.lever.client import LeverClient
from app.sources.lever.parser import parse_lever_candidate
from app.settings import settings


class LeverSource(BaseSource):
    name = "lever"

    def __init__(self):
        self._client: LeverClient | None = None

    def _get_client(self) -> LeverClient:
        if not self._client:
            self._client = LeverClient(httpx.Client(timeout=30))
        return self._client

    def descriptor(self) -> dict:
        return {
            "name": self.name,
            "enabled": bool(settings.lever_api_key),
            "requires": ["LEVER_API_KEY"],
            "notes": "ATS connector. API details can vary by org; adjust endpoints if needed.",
        }

    def fetch(self, query: Optional[str], limit: int) -> Iterable[dict]:
        client = self._get_client()
        results = []
        offset = None

        while len(results) < limit:
            data = client.list_candidates(limit=min(50, limit - len(results)), offset=offset)

            # common patterns: {"data":[...], "next": "..."} or just list
            if isinstance(data, list):
                items = data
                offset = None
            else:
                items = data.get("data") or data.get("items") or []
                offset = data.get("next") or data.get("offset")  # depends

            if not items:
                break

            for it in items:
                if len(results) >= limit:
                    break
                if query:
                    q = query.lower()
                    name = (it.get("name") or "").lower()
                    emails = " ".join(it.get("emails") or []).lower()
                    if q not in name and q not in emails:
                        continue
                results.append(it)

            if not offset:
                break

        return results

    def parse(self, raw: dict):
        return parse_lever_candidate(raw)
