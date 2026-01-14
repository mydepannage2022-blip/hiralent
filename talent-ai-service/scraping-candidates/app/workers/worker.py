import structlog

from app.deps import get_redis, get_http_client
from app.pipeline.job_store import JobStore
from app.pipeline.orchestrator import Orchestrator
from app.workers.queue import dequeue_run_blocking

log = structlog.get_logger()


def main():
    redis = get_redis()
    http = get_http_client()
    store = JobStore(redis)
    orch = Orchestrator(store=store, redis=redis, http=http)

    log.info("worker_started")

    while True:
        run_id = dequeue_run_blocking(redis, timeout_sec=5)
        if not run_id:
            continue
        log.info("run_received", run_id=run_id)
        orch.process_run(run_id)


if __name__ == "__main__":
    main()
