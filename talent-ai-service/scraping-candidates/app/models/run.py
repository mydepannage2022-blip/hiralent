from pydantic import BaseModel
from typing import Any, Dict, List, Optional


class RunRecord(BaseModel):
    run_id: str
    status: str
    sources: List[str]
    query: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None
    limit_per_source: int = 50

    started_at: Optional[str] = None
    ended_at: Optional[str] = None

    total_found: int = 0
    total_saved: int = 0
    total_skipped: int = 0
    error: Optional[str] = None
