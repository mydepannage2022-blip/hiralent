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

    # ✅ add (used by eligibility required_fields sometimes)
    resume_url: Optional[str] = None


class JobSnapshot(BaseModel):
    job_id: str
    title: str
    description: str
    required_skills: List[str] = Field(default_factory=list)
    min_profile_score: Optional[float] = None

    # ✅ add (used by eligibility)
    status: Optional[str] = "ACTIVE"
    required_fields: List[str] = Field(default_factory=list)


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

class IndexJobIn(BaseModel):
    job_id: Optional[str] = None
    snapshot: Optional[JobSnapshot] = None

class IndexCandidateIn(BaseModel):
    candidate_id: Optional[str] = None
    snapshot: Optional[CandidateSnapshot] = None