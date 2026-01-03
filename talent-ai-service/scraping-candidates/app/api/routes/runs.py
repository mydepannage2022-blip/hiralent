from fastapi import APIRouter, Depends, HTTPException
from uuid import uuid4
from redis import Redis

from app.deps import get_redis
from app.pipeline.job_store import JobStore
from app.workers.queue import enqueue_run
from app.sources.registry import list_sources
from app.api.schemas.run_schemas import RunCreateRequest, RunCreateResponse, RunStatusResponse

router = APIRouter()


@router.post("", response_model=RunCreateResponse)
def create_run(body: RunCreateRequest, redis: Redis = Depends(get_redis)):
    available = set(list_sources())
    requested = body.sources or list(available)

    unknown = [s for s in requested if s not in available]
    if unknown:
        raise HTTPException(status_code=400, detail=f"Unknown sources: {unknown}")

    run_id = str(uuid4())
    store = JobStore(redis)
    store.create_run(run_id=run_id, sources=requested, query=body.query, filters=body.filters, limit_per_source=body.limit_per_source)
    enqueue_run(redis, run_id)
    return RunCreateResponse(run_id=run_id, status="QUEUED")


@router.get("/{run_id}", response_model=RunStatusResponse)
def get_run(run_id: str, redis: Redis = Depends(get_redis)):
    store = JobStore(redis)
    run = store.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return RunStatusResponse(**run.model_dump())
