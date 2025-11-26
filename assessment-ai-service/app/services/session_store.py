import json
from typing import Optional

from redis.asyncio import Redis

from app.domain.schemas import ChatbotSession


class RedisSessionStore:
    """
    Async Redis-backed store for ChatbotSession.

    - Connects using a Redis URL (e.g. redis://localhost:6379/0)
    - Stores sessions as JSON strings
    - Uses Pydantic's JSON mode so datetimes are serializable
    """

    def __init__(self, redis_url: str, ttl_seconds: int = 60 * 60 * 4) -> None:
        # Create async Redis client from URL
        self.redis: Redis = Redis.from_url(
            redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
        self.ttl_seconds = ttl_seconds

    async def save(self, session: ChatbotSession) -> None:
        key = f"chatbot_session:{session.session_id}"

        # Pydantic v2: mode="json" makes everything JSON-safe (datetimes → ISO strings)
        payload = session.model_dump(mode="json")

        # Store as JSON string with TTL
        await self.redis.set(key, json.dumps(payload), ex=self.ttl_seconds)

    async def get(self, session_id: str) -> Optional[ChatbotSession]:
        key = f"chatbot_session:{session_id}"
        raw = await self.redis.get(key)
        if not raw:
            return None

        data = json.loads(raw)
        # Rebuild typed Pydantic model (datetimes parsed from ISO)
        return ChatbotSession(**data)

    async def delete(self, session_id: str) -> None:
        key = f"chatbot_session:{session_id}"
        await self.redis.delete(key)
