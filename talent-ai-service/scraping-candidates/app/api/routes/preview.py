from fastapi import APIRouter, Depends, HTTPException
from redis import Redis
from typing import List

from app.deps import get_redis
from app.pipeline.job_store import JobStore
from app.pipeline.job_store import RunItemRecord

router = APIRouter()


@router.get("/{run_id}/items")
def get_run_items(run_id: str, redis: Redis = Depends(get_redis)) -> List[dict]:
    store = JobStore(redis)
    run = store.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    items = store.list_items(run_id, limit=200)
    return [i.model_dump() for i in items]
