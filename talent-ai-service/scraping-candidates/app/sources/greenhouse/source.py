import httpx
from typing import Iterable, Optional

from app.sources.base import BaseSource
from app.sources.greenhouse.client import GreenhouseClient
from app.sources.greenhouse.parser import parse_greenhouse_candidate
from app.settings import settings


class GreenhouseSource(BaseSource):
    name = "greenhouse"

    def __init__(self):
        self._client: GreenhouseClient | None = None

    def _get_client(self) -> GreenhouseClient:
        if not self._client:
            self._client = GreenhouseClient(httpx.Client(timeout=30))
        return self._client

    def descriptor(self) -> dict:
        return {
            "name": self.name,
            "enabled": bool(settings.greenhouse_api_key),
            "requires": ["GREENHOUSE_API_KEY"],
            "notes": "ATS connector. Typically has email/phone. Best for real candidate data.",
        }

    def fetch(self, query: Optional[str], limit: int) -> Iterable[dict]:
        # Greenhouse doesn't have a simple public 'search' like GitHub; common approach is list candidates + filter.
        client = self._get_client()
        per_page = 100
        page = 1
        results = []

        while len(results) < limit:
            data = client.list_candidates(per_page=per_page, page=page)

            # Greenhouse returns list, not wrapped in {items:...}
            if isinstance(data, list):
                items = data
            else:
                items = data.get("candidates", []) if isinstance(data, dict) else []

            if not items:
                break

            for it in items:
                if len(results) >= limit:
                    break
                # Optional simple filter by query on name/email
                if query:
                    q = query.lower()
                    name = (it.get("first_name", "") + " " + it.get("last_name", "")).lower()
                    emails = " ".join([(e.get("value", "") or "") for e in (it.get("email_addresses") or [])]).lower()
                    if q not in name and q not in emails:
                        continue

                results.append(it)

            page += 1

        return results

    def parse(self, raw: dict):
        return parse_greenhouse_candidate(raw)
