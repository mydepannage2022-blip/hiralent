# app/matching/service.py
from __future__ import annotations

import logging
from typing import Any, Dict, List

from app.core.settings import settings
from app.vector_store.repo import search
from app.embeddings.provider import embed
from app.embeddings.text_builders import candidate_text, job_text
from app.matching.scoring import skill_overlap, final_score, trigger
from app.matching.reasoning import llm_reasoning, build_reasoning_prompt

log = logging.getLogger("matching.service")


def _safe_list(x) -> List[str]:
    return x if isinstance(x, list) else []


def match_jobs(req) -> Dict[str, Any]:
    """
    Candidate view:
      - embed(candidate_text)
      - qdrant search jobs
      - score with overlap + vector similarity
      - deterministic reasoning + optional Gemini rewrite (ONLY rewriting)
    """
    cand = req.candidate
    opts = req.options

    query_vec = embed(candidate_text(cand))

    results = search(
        collection=settings.QDRANT_COLLECTION_JOBS,
        vector=query_vec,
        limit=opts.top_k,
    )

    items: List[Dict[str, Any]] = []

    for r in results:
        payload = r.payload or {}
        job_id = payload.get("job_id")
        job_title = payload.get("title")
        required_skills = _safe_list(payload.get("required_skills"))

        matched, missing, cov = skill_overlap(required_skills, cand.skills)
        vec_score = getattr(r, "score", None)
        score = final_score(cov, vec_score)
        trig = trigger(score)

        reasoning = None
        if opts.generate_reasoning:
            reasoning = f"Matched: {matched}. Missing: {missing}. Score: {score}."

        # ✅ Gemini rewrite (candidate-facing)
        if opts.use_llm_reasoning and opts.generate_reasoning:
            prompt = build_reasoning_prompt(
                matched=matched,
                missing=missing,
                score=score,
                trigger=trig,
                job_title=job_title,
                audience="candidate",
            )
            llm_txt = llm_reasoning(prompt)
            if llm_txt:
                reasoning = llm_txt

        items.append(
            {
                "job_id": job_id,
                "score": score,
                "trigger": trig,
                "reasoning": reasoning,
                "missing_skills": missing,
                "matched_skills": matched,
                "vector_score": vec_score,
            }
        )

    items.sort(key=lambda x: x["score"], reverse=True)
    return {"items": items}


def match_candidates(req) -> Dict[str, Any]:
    """
    Employer view:
      - embed(job_text)
      - qdrant search candidates
      - score with overlap + vector similarity
      - optional deterministic reasoning + optional Gemini rewrite (employer-facing)
    """
    job = req.job
    opts = req.options

    query_vec = embed(job_text(job))

    results = search(
        collection=settings.QDRANT_COLLECTION_CANDIDATES,
        vector=query_vec,
        limit=opts.top_k,
    )

    items: List[Dict[str, Any]] = []
    required_skills = _safe_list(job.required_skills)

    for r in results:
        payload = r.payload or {}
        cand_id = payload.get("candidate_id")
        cand_skills = _safe_list(payload.get("skills"))

        matched, missing, cov = skill_overlap(required_skills, cand_skills)
        vec_score = getattr(r, "score", None)
        score = final_score(cov, vec_score)

        reasoning = None
        if opts.generate_reasoning:
            reasoning = f"Matched: {matched}. Missing: {missing}. Score: {score}."

        # ✅ Gemini rewrite (employer-facing) -> no "complete assessment to proceed"
        if opts.use_llm_reasoning and opts.generate_reasoning:
            prompt = build_reasoning_prompt(
                matched=matched,
                missing=missing,
                score=score,
                trigger=trigger(score),  # we keep it for context, but employer rules prevent bad phrasing
                job_title=getattr(job, "title", None),
                audience="employer",
            )
            llm_txt = llm_reasoning(prompt)
            if llm_txt:
                reasoning = llm_txt

        items.append(
            {
                "candidate_id": cand_id,
                "score": score,
                "missing_skills": missing,
                "matched_skills": matched,
                "vector_score": vec_score,
                "reasoning": reasoning,
            }
        )

    items.sort(key=lambda x: x["score"], reverse=True)
    return {"items": items}
