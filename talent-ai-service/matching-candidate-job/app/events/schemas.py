# app/events/schemas.py
from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel

MatchingEventType = Literal["JOB_UPDATED", "CANDIDATE_UPDATED"]
MatchingEntityType = Literal["JOB", "CANDIDATE"]


class MatchingEventIn(BaseModel):
    event_id: str
    event_type: MatchingEventType
    entity_type: MatchingEntityType
    entity_id: str
    dedupe_key: Optional[str] = None
