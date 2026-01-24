import httpx
from redis import Redis
from app.settings import settings


def get_redis() -> Redis:
    return Redis.from_url(settings.redis_url, decode_responses=True)


def get_http_client() -> httpx.Client:
    return httpx.Client(timeout=settings.http_timeout_sec)
