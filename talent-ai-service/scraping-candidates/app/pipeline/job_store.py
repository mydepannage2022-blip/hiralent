from typing import Any, Dict, List, Optional
from redis import Redis

from app.models.run import RunRecord
from app.utils.time import now_iso
from app.utils.json import dumps, loads
from pydantic import BaseModel


class RunItemRecord(BaseModel):
    action: str  # created | updated | skipped | failed
    reason: Optional[str] = None
    source: str
    source_uid: Optional[str] = None
    sourced_candidate_id: Optional[str] = None
    fingerprint: Optional[str] = None
    created_at: str
    raw: Optional[Dict[str, Any]] = None


class JobStore:
    def __init__(self, redis: Redis):
        self.redis = redis

    def create_run(self, run_id: str, sources: List[str], query: Optional[str], filters: Optional[Dict[str, Any]], limit_per_source: int) -> RunRecord:
        rec = RunRecord(
            run_id=run_id,
            status="QUEUED",
            sources=sources,
            query=query,
            filters=filters,
            limit_per_source=limit_per_source,
        )
        key = f"run:{run_id}"
        self.redis.hset(
            key,
            mapping={
                "run_id": run_id,
                "status": rec.status,
                "sources": dumps(sources),
                "query": query or "",
                "filters": dumps(filters) if filters is not None else "",
                "limit_per_source": str(limit_per_source),
                "started_at": "",
                "ended_at": "",
                "total_found": "0",
                "total_saved": "0",
                "total_skipped": "0",
                "error": "",
            },
        )
        return rec

    def set_status(self, run_id: str, status: str, error: Optional[str] = None) -> None:
        key = f"run:{run_id}"
        mapping: Dict[str, str] = {"status": status}
        if status == "RUNNING":
            mapping["started_at"] = now_iso()
        if status in ("COMPLETED", "FAILED"):
            mapping["ended_at"] = now_iso()
        if error:
            mapping["error"] = error
        self.redis.hset(key, mapping=mapping)

    def incr_metric(self, run_id: str, field: str, amount: int = 1) -> None:
        key = f"run:{run_id}"
        self.redis.hincrby(key, field, amount)

    def append_item(self, run_id: str, item: RunItemRecord) -> None:
        key = f"run:{run_id}:items"
        self.redis.rpush(key, item.model_dump_json())

    def get_run(self, run_id: str) -> Optional[RunRecord]:
        key = f"run:{run_id}"
        data = self.redis.hgetall(key)
        if not data:
            return None

        sources = loads(data.get("sources", "[]"))
        filters_raw = data.get("filters", "")
        filters = loads(filters_raw) if filters_raw else None

        def _s(v: str) -> Optional[str]:
            return v if v else None

        return RunRecord(
            run_id=data.get("run_id", run_id),
            status=data.get("status", "UNKNOWN"),
            sources=sources,
            query=_s(data.get("query", "")),
            filters=filters,
            limit_per_source=int(data.get("limit_per_source", "50")),
            started_at=_s(data.get("started_at", "")),
            ended_at=_s(data.get("ended_at", "")),
            total_found=int(data.get("total_found", "0")),
            total_saved=int(data.get("total_saved", "0")),
            total_skipped=int(data.get("total_skipped", "0")),
            error=_s(data.get("error", "")),
        )

    def list_items(self, run_id: str, limit: int = 200) -> List[RunItemRecord]:
        key = f"run:{run_id}:items"
        raw_items = self.redis.lrange(key, max(0, -limit), -1)
        items: List[RunItemRecord] = []
        for r in raw_items:
            try:
                items.append(RunItemRecord.model_validate_json(r))
            except Exception:
                continue
        return items

    def seen_in_run(self, run_id: str, fingerprint: str) -> bool:
        key = f"run:{run_id}:seen"
        return bool(self.redis.sismember(key, fingerprint))

    def mark_seen(self, run_id: str, fingerprint: str) -> None:
        key = f"run:{run_id}:seen"
        self.redis.sadd(key, fingerprint)
