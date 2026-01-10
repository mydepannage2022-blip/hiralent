import json
import time
import redis
from typing import Any, Dict, Optional, Tuple
from app.core.settings import settings

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

def enqueue(task_type: str, payload: dict, attempt: int = 0, run_at: float | None = None) -> None:
    """
    We store tasks as JSON.
    If run_at is in the future, worker will delay execution (simple scheduling).
    """
    job = {
        "type": task_type,
        "payload": payload,
        "attempt": attempt,
        "run_at": run_at,  # epoch seconds
        "ts": time.time(),
    }
    redis_client.lpush(settings.REDIS_QUEUE_NAME, json.dumps(job))

def dequeue(block: bool = True, timeout: int = 5) -> Optional[Dict[str, Any]]:
    res = redis_client.brpop(settings.REDIS_QUEUE_NAME, timeout=timeout if block else 0)
    if not res:
        return None
    _, raw = res
    return json.loads(raw)

def send_to_dlq(task: Dict[str, Any], error: str) -> None:
    dlq_item = {
        **task,
        "error": error,
        "failed_at": time.time(),
    }
    redis_client.lpush(settings.REDIS_DLQ_NAME, json.dumps(dlq_item))

def requeue_with_backoff(task: Dict[str, Any]) -> None:
    attempt = int(task.get("attempt", 0))
    attempt += 1
    base = max(1, int(settings.WORKER_RETRY_BASE_SECONDS))
    delay = base * (2 ** max(0, attempt - 1))  # 2,4,8,16...
    run_at = time.time() + min(delay, 60)      # cap delay at 60s (simple)
    enqueue(task["type"], task["payload"], attempt=attempt, run_at=run_at)
