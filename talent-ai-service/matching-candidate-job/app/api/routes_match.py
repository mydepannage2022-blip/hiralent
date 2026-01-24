from fastapi import APIRouter, Depends
from app.core.security import require_internal_key
from app.matching.service import match_jobs, match_candidates
from app.jobs.schemas import *

router = APIRouter(prefix="/v1/match", dependencies=[Depends(require_internal_key)])

@router.post("/jobs")
def jobs_for_candidate(req: JobsForCandidateRequest):
    return match_jobs(req)

@router.post("/candidates")
def candidates_for_job(req: CandidatesForJobRequest):
    return match_candidates(req)
