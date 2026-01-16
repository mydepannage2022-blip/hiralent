from pydantic import BaseModel, Field
from typing import Optional, List

class CandidateSnapshot(BaseModel):
    candidate_id: str
    skills: List[str] = Field(default_factory=list)
    headline: Optional[str] = None
    about_me: Optional[str] = None
    experience: Optional[str] = None
    education: Optional[str] = None
    profile_score: Optional[float] = None

class JobSnapshot(BaseModel):
    job_id: str
    title: str
    description: str
    required_skills: List[str] = Field(default_factory=list)
    min_profile_score: Optional[float] = None

class MatchOptions(BaseModel):
    top_k: int = 20
    generate_reasoning: bool = True
    use_llm_reasoning: bool = False

class JobsForCandidateRequest(BaseModel):
    candidate: CandidateSnapshot
    options: MatchOptions = MatchOptions()

class CandidatesForJobRequest(BaseModel):
    job: JobSnapshot
    options: MatchOptions = MatchOptions()
