from pydantic import BaseModel
from typing import List, Optional


class SourceConfig(BaseModel):
    name: str
    enabled: bool
    requires: List[str]
    notes: Optional[str] = None
