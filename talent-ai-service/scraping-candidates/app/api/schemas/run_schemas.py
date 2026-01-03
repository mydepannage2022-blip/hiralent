from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional


class RunCreateRequest(BaseModel):
    sources: List[str] = Field(default_factory=list)
    query: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None
    limit_per_source: int = Field(default=50, ge=1, le=500)


class RunCreateResponse(BaseModel):
    run_id: str
    status: str


class RunStatusResponse(BaseModel):
    run_id: str
    status: str
    sources: List[str]
    query: Optional[str]
    filters: Optional[Dict[str, Any]]
    started_at: Optional[str]
    ended_at: Optional[str]
    total_found: int
    total_saved: int
    total_skipped: int
    error: Optional[str]
