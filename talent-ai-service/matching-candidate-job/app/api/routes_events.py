# app/api/routes_events.py
from __future__ import annotations

import logging
from fastapi import APIRouter, Depends

from app.core.security import require_internal_key
from app.workers.queue import enqueue
from app.events.schemas import MatchingEventIn

log = logging.getLogger("api.routes_events")

# ✅ Matches Node client: POST /internal/matching/events
router = APIRouter(prefix="/internal/matching", dependencies=[Depends(require_internal_key)])


@router.post("/events")
def consume_event(evt: MatchingEventIn):
    """
    Called by backend worker reading MatchingOutboxEvent (PENDING)

    Receives:
      { event_id, event_type, entity_type, entity_id, payload?, dedupe_key? }

    This endpoint:
      - does NOT fetch snapshots
      - enqueues PROCESS_EVENT so the API responds fast
      - worker will do: fetch snapshot -> embed -> upsert -> update DB -> recos
    """
    log.info(
        "consume_event event_id=%s event_type=%s entity=%s:%s",
        evt.event_id,
        evt.event_type,
        evt.entity_type,
        evt.entity_id,
    )

    enqueue("PROCESS_EVENT", evt.model_dump())

    return {
        "queued": True,
        "type": "PROCESS_EVENT",
        "event_id": evt.event_id,
        "entity_type": evt.entity_type,
        "entity_id": evt.entity_id,
    }
