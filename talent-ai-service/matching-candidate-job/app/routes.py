from fastapi import APIRouter, Depends
from .security import require_internal_key
from .schemas import (
    JobsForCandidateRequest, JobsForCandidateResponse,
    CandidatesForJobRequest, CandidatesForJobResponse,
    RankedJobItem, RankedCandidateItem, MatchBreakdown
)
from .embedding import (
    make_text_for_candidate, make_text_for_job, embed_text
)
from .scoring import (
    skill_overlap, cosine_sim, default_weights,
    deterministic_score, final_score, human_reasoning
)

router = APIRouter()

@router.get("/health")
def health():
    return {"ok": True}

@router.post("/v1/match/jobs-for-candidate", response_model=JobsForCandidateResponse, dependencies=[Depends(require_internal_key)])
def jobs_for_candidate(payload: JobsForCandidateRequest):
    opt = payload.options
    w = default_weights()
    if opt.weights:
        w.update(opt.weights)

    cand = payload.candidate
    cand_text = make_text_for_candidate(cand.skills, cand.headline, cand.about_me, cand.experience, cand.education)
    cand_vec = embed_text(cand_text) if opt.use_embeddings else None

    items: list[RankedJobItem] = []
    for job in payload.jobs:
        matched, missing, cov = skill_overlap(job.required_skills, cand.skills)

        det, profile_ok, gap = deterministic_score(cov, cand.profile_score, job.min_profile_score)

        sim = None
        if opt.use_embeddings:
            job_text = make_text_for_job(job.title, job.description, job.required_skills)
            job_vec = embed_text(job_text)
            sim = cosine_sim(cand_vec, job_vec)

        score = final_score(cov, det, sim, w)

        reasons, reasoning_text = ([], None)
        if opt.generate_reasoning:
            reasons, reasoning_text = human_reasoning(matched, missing, cov, sim, profile_ok, gap)

        items.append(RankedJobItem(
            job_id=job.job_id,
            score=score,
            breakdown=MatchBreakdown(
                matched_skills=matched,
                missing_skills=missing,
                skill_coverage=cov,
                profile_score_ok=profile_ok,
                profile_score_gap=gap,
                similarity=sim,
                deterministic_score=det,
                final_score=score,
                reasons=reasons,
                reasoning_text=reasoning_text
            )
        ))

    items.sort(key=lambda x: x.score, reverse=True)
    return JobsForCandidateResponse(items=items[:opt.top_k])

@router.post("/v1/match/candidates-for-job", response_model=CandidatesForJobResponse, dependencies=[Depends(require_internal_key)])
def candidates_for_job(payload: CandidatesForJobRequest):
    opt = payload.options
    w = default_weights()
    if opt.weights:
        w.update(opt.weights)

    job = payload.job
    job_text = make_text_for_job(job.title, job.description, job.required_skills)
    job_vec = embed_text(job_text) if opt.use_embeddings else None

    items: list[RankedCandidateItem] = []
    for cand in payload.candidates:
        matched, missing, cov = skill_overlap(job.required_skills, cand.skills)
        det, profile_ok, gap = deterministic_score(cov, cand.profile_score, job.min_profile_score)

        sim = None
        if opt.use_embeddings:
            cand_text = make_text_for_candidate(cand.skills, cand.headline, cand.about_me, cand.experience, cand.education)
            cand_vec = embed_text(cand_text)
            sim = cosine_sim(cand_vec, job_vec)

        score = final_score(cov, det, sim, w)

        reasons, reasoning_text = ([], None)
        if opt.generate_reasoning:
            reasons, reasoning_text = human_reasoning(matched, missing, cov, sim, profile_ok, gap)

        items.append(RankedCandidateItem(
            candidate_id=cand.candidate_id,
            score=score,
            breakdown=MatchBreakdown(
                matched_skills=matched,
                missing_skills=missing,
                skill_coverage=cov,
                profile_score_ok=profile_ok,
                profile_score_gap=gap,
                similarity=sim,
                deterministic_score=det,
                final_score=score,
                reasons=reasons,
                reasoning_text=reasoning_text
            )
        ))

    items.sort(key=lambda x: x.score, reverse=True)
    return CandidatesForJobResponse(items=items[:opt.top_k])
