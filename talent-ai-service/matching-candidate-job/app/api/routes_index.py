from fastapi import APIRouter, Depends
from app.core.security import require_internal_key
from app.workers.queue import enqueue
from app.jobs.schemas import JobSnapshot, CandidateSnapshot

router = APIRouter(prefix="/v1/index", dependencies=[Depends(require_internal_key)])

@router.post("/job")
def index_job(job: JobSnapshot):
    enqueue("INDEX_JOB", job.model_dump())
    return {"queued": True, "type": "INDEX_JOB"}

@router.post("/candidate")
def index_candidate(cand: CandidateSnapshot):
    enqueue("INDEX_CANDIDATE", cand.model_dump())
    return {"queued": True}
