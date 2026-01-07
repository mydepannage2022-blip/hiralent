from pydantic import BaseModel, Field
from typing import Any

class CandidateSnapshot(BaseModel):
    candidate_id: str
    skills: list[str] = Field(default_factory=list)
    headline: str | None = None
    about_me: str | None = None
    experience: str | None = None
    education: str | None = None
    location: str | None = None
    profile_score: float | None = None

class JobSnapshot(BaseModel):
    job_id: str
    title: str
    description: str
    required_skills: list[str] = Field(default_factory=list)
    experience_level: str | None = None
    location: str | None = None
    min_profile_score: float | None = None
    required_fields: list[str] = Field(default_factory=list)

class MatchOptions(BaseModel):
    top_k: int = 20
    use_embeddings: bool = True
    use_deterministic: bool = True
    weights: dict[str, float] | None = None
    generate_reasoning: bool = True
    use_llm_reasoning: bool = False

class MatchBreakdown(BaseModel):
    matched_skills: list[str]
    missing_skills: list[str]
    skill_coverage: float
    profile_score_ok: bool
    profile_score_gap: float | None
    similarity: float | None
    deterministic_score: float | None
    final_score: float
    reasons: list[str]
    reasoning_text: str | None = None

class RankedJobItem(BaseModel):
    job_id: str
    score: float
    breakdown: MatchBreakdown

class RankedCandidateItem(BaseModel):
    candidate_id: str
    score: float
    breakdown: MatchBreakdown

class JobsForCandidateRequest(BaseModel):
    candidate: CandidateSnapshot
    jobs: list[JobSnapshot]
    options: MatchOptions = MatchOptions()

class CandidatesForJobRequest(BaseModel):
    job: JobSnapshot
    candidates: list[CandidateSnapshot]
    options: MatchOptions = MatchOptions()

class JobsForCandidateResponse(BaseModel):
    items: list[RankedJobItem]

class CandidatesForJobResponse(BaseModel):
    items: list[RankedCandidateItem]
