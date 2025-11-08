from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime

class SkillObservation(BaseModel):
    skill: str
    question_weight: float = Field(ge=0.0, le=1.0, default=1.0)
    correctness: float = Field(ge=0.0, le=1.0)
    time_penalty: float = Field(ge=0.0, le=1.0, default=0.0)
    timestamp: float

class TestCaseBreakdown(BaseModel):
    total: int
    passed: int
    avg_time_ms: Optional[float] = None

class SubmissionSignal(BaseModel):
    candidate_id: str
    submission_id: str
    skills: List[SkillObservation]
    testcases: Optional[TestCaseBreakdown] = None

class RadarVector(BaseModel):
    candidate_id: str
    scores: Dict[str, float] = Field(default_factory=dict)
    updated_at: float
    version: str = "1.0"