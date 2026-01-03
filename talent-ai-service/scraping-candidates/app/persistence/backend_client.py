import httpx
from tenacity import retry, stop_after_attempt, wait_exponential
from app.settings import settings


class BackendClient:
    def __init__(self, http: httpx.Client):
        self.http = http

    def _headers(self, idempotency_key: str | None = None) -> dict:
        h = {
            "Authorization": f"Bearer {settings.backend_internal_token}",
            "Content-Type": "application/json",
        }
        if idempotency_key:
            h["Idempotency-Key"] = idempotency_key
        return h

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=0.5, min=0.5, max=4))
    def upsert_sourced_candidate(self, payload: dict, idempotency_key: str) -> dict:
        url = f"{settings.backend_base_url}/internal/sourced-candidates/upsert"
        resp = self.http.post(url, json=payload, headers=self._headers(idempotency_key))
        resp.raise_for_status()
        return resp.json()

    # ---------------------------
    # NEW: Run persistence
    # ---------------------------

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=0.5, min=0.5, max=4))
    def create_sourcing_run(self, payload: dict) -> dict:
        """
        payload example:
        {
          "run_id": "...",
          "triggered_by_user_id": null,
          "sources": ["github"],
          "query": "machine learning",
          "filters": null
        }
        """
        url = f"{settings.backend_base_url}/internal/sourcing-runs"
        resp = self.http.post(url, json=payload, headers=self._headers())
        resp.raise_for_status()
        return resp.json()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=0.5, min=0.5, max=4))
    def add_sourcing_run_item(self, run_id: str, payload: dict) -> dict:
        """
        payload example:
        {
          "sourced_candidate_id": "...",
          "source": "github",
          "source_uid": "123",
          "action": "created",
          "reason": null,
          "raw": null
        }
        """
        url = f"{settings.backend_base_url}/internal/sourcing-runs/{run_id}/items"
        resp = self.http.post(url, json=payload, headers=self._headers())
        resp.raise_for_status()
        return resp.json()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=0.5, min=0.5, max=4))
    def complete_sourcing_run(self, run_id: str, payload: dict) -> dict:
        """
        payload example:
        {
          "status": "COMPLETED",
          "total_found": 5,
          "total_saved": 5,
          "total_skipped": 0,
          "error": null
        }
        """
        url = f"{settings.backend_base_url}/internal/sourcing-runs/{run_id}/complete"
        resp = self.http.patch(url, json=payload, headers=self._headers())
        resp.raise_for_status()
        return resp.json()
