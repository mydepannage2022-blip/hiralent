import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.settings import settings


def build_headers(user_agent: str = "hiralent-scraping-candidates/1.0") -> dict:
    return {"User-Agent": user_agent}


@retry(
    stop=stop_after_attempt(settings.http_max_retries),
    wait=wait_exponential(multiplier=settings.http_backoff_min_sec, max=settings.http_backoff_max_sec),
)
def get_json(client: httpx.Client, url: str, headers: dict | None = None, params: dict | None = None) -> dict:
    resp = client.get(url, headers=headers, params=params)
    resp.raise_for_status()
    return resp.json()
