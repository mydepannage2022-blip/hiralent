from redis import Redis

QUEUE_KEY = "queue:runs"


def enqueue_run(redis: Redis, run_id: str) -> None:
    redis.lpush(QUEUE_KEY, run_id)


def dequeue_run_blocking(redis: Redis, timeout_sec: int = 5) -> str | None:
    res = redis.brpop(QUEUE_KEY, timeout=timeout_sec)
    if not res:
        return None
    _, run_id = res
    return run_id
