import time
import logging
from app.core.settings import settings
from app.workers.queue import dequeue, requeue_with_backoff, send_to_dlq
from app.vector_store.collections import ensure_collections
from app.vector_store.repo import upsert
from app.embeddings.provider import embed
from app.embeddings.text_builders import candidate_text, job_text

log = logging.getLogger("matching.worker")

def process_task(task: dict) -> None:
    t = task["type"]
    p = task["payload"]

    if t == "INDEX_JOB":
        text = job_text(type("Obj", (), p))  # quick adapter
        vec = embed(text)
        upsert(settings.QDRANT_COLLECTION_JOBS, p["job_id"], vec, p)
        return

    if t == "INDEX_CANDIDATE":
        text = candidate_text(type("Obj", (), p))
        vec = embed(text)
        upsert(settings.QDRANT_COLLECTION_CANDIDATES, p["candidate_id"], vec, p)
        return

    raise ValueError(f"Unknown task type: {t}")

def run() -> None:
    ensure_collections()
    log.info("Worker started. queue=%s dlq=%s", settings.REDIS_QUEUE_NAME, settings.REDIS_DLQ_NAME)

    while True:
        task = dequeue(block=True, timeout=5)
        if not task:
            continue

        # simple scheduling
        run_at = task.get("run_at")
        if run_at and run_at > time.time():
            # not yet time -> put back (same attempt) and sleep a bit
            requeue_with_backoff({**task, "attempt": task.get("attempt", 0)})  # gentle delay
            time.sleep(0.25)
            continue

        attempt = int(task.get("attempt", 0))

        try:
            process_task(task)
            log.info("Processed task type=%s attempt=%s", task.get("type"), attempt)

        except Exception as e:
            msg = str(e)
            log.exception("Task failed type=%s attempt=%s err=%s", task.get("type"), attempt, msg)

            if attempt + 1 >= settings.WORKER_MAX_RETRIES:
                send_to_dlq(task, error=msg)
                log.error("Sent to DLQ type=%s after_attempts=%s", task.get("type"), attempt + 1)
            else:
                requeue_with_backoff(task)
