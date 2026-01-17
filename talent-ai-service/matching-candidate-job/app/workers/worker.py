# app/workers/worker.py
from __future__ import annotations

import time
import logging
import hashlib
from typing import Any, Dict, List, Tuple

from app.core.settings import settings
from app.workers.queue import dequeue, requeue_with_backoff, send_to_dlq, requeue_same
from app.vector_store.collections import ensure_collections
from app.vector_store.repo import upsert, search
from app.embeddings.provider import embed
from app.embeddings.text_builders import candidate_text, job_text

from app.clients.backend_client import get_job_snapshot, get_candidate_snapshot
from app.clients.backend_updates import (
    upsert_job_vector,
    upsert_candidate_vector,
    upsert_job_recommendations,
)

log = logging.getLogger("matching.worker")
print("BACKEND_INTERNAL_TOKEN=", repr(settings.BACKEND_INTERNAL_TOKEN))
print("BACKEND_BASE_URL=", settings.BACKEND_BASE_URL)


def _normalize_job_snapshot(snap: Dict[str, Any]) -> Dict[str, Any]:
    # Snapshot prisma job est déjà presque plat
    return {
        "job_id": snap.get("job_id") or snap.get("id"),
        "title": snap.get("title") or "",
        "description": snap.get("description") or "",
        "required_skills": snap.get("required_skills") or [],
        "status": (snap.get("status") or "ACTIVE"),
        "min_profile_score": snap.get("min_profile_score"),
        "required_fields": snap.get("required_fields") or [],
        # garde le reste si tu veux (payload qdrant)
        **snap,
    }


def _normalize_candidate_snapshot(snap: Dict[str, Any]) -> Dict[str, Any]:
    profile = snap.get("candidateProfile") or {}
    structured = snap.get("candidateSkills") or []
    pc = snap.get("profileCompleteness") or {}

    skills = set()

    # candidateProfile.skills
    for s in (profile.get("skills") or []):
        if isinstance(s, str) and s.strip():
            skills.add(s.strip())

    # candidateSkills.skill_name
    for row in structured:
        name = (row or {}).get("skill_name")
        if isinstance(name, str) and name.strip():
            skills.add(name.strip())

    return {
        "candidate_id": snap.get("user_id") or profile.get("candidate_id"),
        "skills": sorted(skills),
        "headline": profile.get("headline"),
        "about_me": profile.get("about_me"),
        "experience": profile.get("experience"),
        "education": profile.get("education"),
        "resume_url": profile.get("resume_url") or profile.get("resume_application_url"),
        "profile_score": pc.get("overall_score"),
        "city": profile.get("city"),
        "location": profile.get("location"),
        # garde tout aussi si tu veux pour payload qdrant
        **snap,
    }


def _hash_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _get(obj: Dict[str, Any], key: str, default=None):
    return obj.get(key, default)


def _is_present(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str) and value.strip() == "":
        return False
    if isinstance(value, list) and len(value) == 0:
        return False
    return True


def _eligibility(job: Dict[str, Any], cand: Dict[str, Any]) -> Tuple[bool, List[str], List[str]]:
    """
    returns: (is_eligible, reason_codes, missing_skills)
    """
    reason_codes: List[str] = []
    missing_skills: List[str] = []

    # job status (optional)
    status = (_get(job, "status") or "ACTIVE").upper()
    if status != "ACTIVE":
        reason_codes.append("JOB_NOT_ACTIVE")

    # min_profile_score (optional)
    min_score = _get(job, "min_profile_score")
    cand_score = _get(cand, "profile_score")
    if min_score is not None and cand_score is not None:
        if float(cand_score) < float(min_score):
            reason_codes.append(f"LOW_PROFILE_SCORE:min={min_score}")

    # required_fields (optional)
    required_fields = _get(job, "required_fields") or []
    for f in required_fields:
        if not _is_present(_get(cand, f)):
            reason_codes.append(f"MISSING_FIELD:{f}")

    # missing skills (optional)
    req_skills = set([s.lower() for s in (_get(job, "required_skills") or [])])
    cand_skills = set([s.lower() for s in (_get(cand, "skills") or [])])
    for s in req_skills:
        if s not in cand_skills:
            missing_skills.append(s)

    is_eligible = len(reason_codes) == 0
    return is_eligible, reason_codes, missing_skills


def _skill_match(job: Dict[str, Any], cand: Dict[str, Any]) -> float:
    req = set([s.lower() for s in (_get(job, "required_skills") or [])])
    have = set([s.lower() for s in (_get(cand, "skills") or [])])
    if not req:
        return 0.0
    inter = len(req.intersection(have))
    return inter / max(1, len(req))


def _rank_jobs(items: List[Dict[str, Any]], cand: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    combine vector_score + skill_match
    """
    for it in items:
        job = it["job"]
        vector_score = float(it.get("vector_score", 0.0))
        sm = _skill_match(job, cand)
        it["skill_match"] = sm
        it["final_score"] = (0.75 * vector_score) + (0.25 * sm)
    items.sort(key=lambda x: x["final_score"], reverse=True)
    return items

def _rank_candidates(items: List[Dict[str, Any]], job: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    combine vector_score + skill_match pour classer candidats pour un job
    """
    for it in items:
        cand = it["candidate"]
        vector_score = float(it.get("vector_score", 0.0))
        sm = _skill_match(job, cand)  # overlap(job.required_skills, cand.skills)
        it["skill_match"] = sm
        it["final_score"] = (0.75 * vector_score) + (0.25 * sm)

    items.sort(key=lambda x: x["final_score"], reverse=True)
    return items


def _extract_candidate_payload(hit) -> Dict[str, Any]:
    """
    Qdrant hit.payload contient déjà un snapshot 'candidate' (stocké lors INDEX_CANDIDATE / PROCESS_EVENT CANDIDATE)
    """
    payload = hit.payload or {}
    # on attend au minimum candidate_id + skills
    return payload


def process_task(task: dict) -> None:
    t = task["type"]
    p = task["payload"]

    # -----------------------
    # Existing manual tasks
    # -----------------------
    if t == "INDEX_JOB":
        text = job_text(type("Obj", (), p))
        vec = embed(text)
        upsert(settings.QDRANT_COLLECTION_JOBS, p["job_id"], vec, p)
        return

    if t == "INDEX_CANDIDATE":
        text = candidate_text(type("Obj", (), p))
        vec = embed(text)
        upsert(settings.QDRANT_COLLECTION_CANDIDATES, p["candidate_id"], vec, p)
        return

    # -----------------------
    # NEW: PROCESS_EVENT
    # -----------------------
    if t == "PROCESS_EVENT":
        event_id = p.get("event_id")
        event_type = p.get("event_type")
        entity_type = p.get("entity_type")
        entity_id = p.get("entity_id")

        if not entity_type or not entity_id:
            raise ValueError("PROCESS_EVENT missing entity_type/entity_id")

        log.info(
            "PROCESS_EVENT event_id=%s event_type=%s entity=%s:%s",
            event_id,
            event_type,
            entity_type,
            entity_id,
        )

        # ---- JOB ----
        if entity_type == "JOB":
            raw = get_job_snapshot(entity_id)
            snap = _normalize_job_snapshot(raw)

            text = job_text(type("Obj", (), snap))
            ehash = _hash_text(text)
            vec = embed(text)

            # 1) index job in Qdrant
            upsert(settings.QDRANT_COLLECTION_JOBS, str(snap["job_id"]), vec, snap)

            # 2) update backend vector metadata
            upsert_job_vector(
                job_id=str(snap["job_id"]),
                status="INDEXED",
                qdrant_point_id=str(snap["job_id"]),
                embedding_hash=ehash,
            )

            # 3) ✅ NEW: JOB_UPDATED -> compute top candidates for this job
            if event_type == "JOB_UPDATED":
                hits = search(settings.QDRANT_COLLECTION_CANDIDATES, vec, limit=200)

                top200: List[Dict[str, Any]] = []
                for h in hits:
                    cand_payload = _extract_candidate_payload(h)
                    cand_id = cand_payload.get("candidate_id") or cand_payload.get("user_id")
                    if not cand_id:
                        continue

                    top200.append(
                        {
                            "candidate_id": str(cand_id),
                            "vector_score": float(h.score or 0.0),
                            "candidate": cand_payload,
                        }
                    )

                # sort by vector score (optional)
                top200.sort(key=lambda x: float(x.get("vector_score", 0.0)), reverse=True)

                # eligibility + missing skills (job vs candidate)
                filtered: List[Dict[str, Any]] = []
                for it in top200:
                    cand = it["candidate"]
                    is_eligible, reason_codes, missing_skills = _eligibility(snap, cand)

                    it["is_eligible"] = is_eligible
                    it["reason_codes"] = reason_codes
                    it["missing_skills"] = missing_skills
                    filtered.append(it)

                top50 = filtered[:50]
                ranked = _rank_candidates(top50, snap)
                top10 = ranked[:10]

                # IMPORTANT:
                # backend endpoint upsertJobRecommendations attend { candidate_id, items: [...] }
                # donc on upsert "1 job rec" par candidat (grouping)
                by_candidate: Dict[str, List[Dict[str, Any]]] = {}

                for it in top10:
                    cand_id = it["candidate_id"]

                    rec_item = {
                        "job_id": str(snap["job_id"]),
                        "vector_score": float(it.get("vector_score", 0.0)),
                        "match_score": float(it.get("final_score", 0.0)),
                        "skill_match": float(it.get("skill_match", 0.0)),
                        "is_eligible": bool(it.get("is_eligible", False)),
                        "reason_codes": it.get("reason_codes", []),
                        "missing_skills": it.get("missing_skills", []),
                        # tu peux décider ici "trigger" = decision ou event source
                        "trigger": "JOB_UPDATED",
                        "job_embedding_hash": ehash,
                        "candidate_embedding_hash": (
                            it.get("candidate", {}).get("candidate_embedding_hash")
                            if isinstance(it.get("candidate"), dict)
                            else None
                        ),
                        "ai_reasoning": None,
                    }

                    by_candidate.setdefault(cand_id, []).append(rec_item)

                # push to backend (one call per candidate)
                for cand_id, items in by_candidate.items():
                    upsert_job_recommendations(
                        [
                            {
                                "candidate_id": cand_id,
                                "items": items,
                            }
                        ]
                    )

            return


        # ---- CANDIDATE ----
        if entity_type == "CANDIDATE":
            raw = get_candidate_snapshot(entity_id)
            cand = _normalize_candidate_snapshot(raw)

            if not cand.get("candidate_id"):
                raise ValueError("Candidate snapshot missing candidate_id after normalization")

            text = candidate_text(type("Obj", (), cand))
            ehash = _hash_text(text)
            vec = embed(text)

            upsert(
                settings.QDRANT_COLLECTION_CANDIDATES,
                str(cand["candidate_id"]),
                vec,
                cand,
            )

            upsert_candidate_vector(
                candidate_id=str(cand["candidate_id"]),
                status="INDEXED",
                qdrant_point_id=str(cand["candidate_id"]),
                embedding_hash=ehash,
            )

            # recos only for CANDIDATE_UPDATED
            if event_type == "CANDIDATE_UPDATED":
                hits = search(settings.QDRANT_COLLECTION_JOBS, vec, limit=200)

                top200: List[Dict[str, Any]] = []
                for h in hits:
                    job_payload = h.payload or {}
                    top200.append(
                        {
                            "job_id": str(job_payload.get("job_id") or h.id),
                            "vector_score": float(h.score or 0.0),
                            "job": job_payload,
                        }
                    )

                top200.sort(key=lambda x: float(x.get("vector_score", 0.0)), reverse=True)

                filtered: List[Dict[str, Any]] = []
                for it in top200:
                    job = it["job"]
                    is_eligible, reason_codes, missing_skills = _eligibility(job, cand)

                    it["is_eligible"] = is_eligible
                    it["reason_codes"] = reason_codes
                    it["missing_skills"] = missing_skills
                    filtered.append(it)

                top50 = filtered[:50]

                ranked = _rank_jobs(top50, cand)
                top10 = ranked[:10]

                recos: List[Dict[str, Any]] = []
                for it in top10:
                    job = it["job"]
                    job_id = job.get("job_id") or it.get("job_id")

                    recos.append(
                        {
                            "candidate_id": str(cand["candidate_id"]),
                            "job_id": str(job_id),
                            "vector_score": float(it.get("vector_score", 0.0)),
                            "match_score": float(it.get("final_score", 0.0)),
                            "skill_match": float(it.get("skill_match", 0.0)),
                            "is_eligible": bool(it.get("is_eligible", False)),
                            "reason_codes": it.get("reason_codes", []),
                            "missing_skills": it.get("missing_skills", []),
                            "trigger": "CANDIDATE_UPDATED",
                            "candidate_embedding_hash": ehash,
                            "job_embedding_hash": (
                                job.get("jobVector", {}).get("embedding_hash")
                                if isinstance(job.get("jobVector"), dict)
                                else None
                            ),
                            "ai_reasoning": None,
                        }
                    )

                upsert_job_recommendations(recos)

            return

        raise ValueError(f"PROCESS_EVENT unsupported entity_type={entity_type}")

    raise ValueError(f"Unknown task type: {t}")


def run() -> None:
    ensure_collections()
    log.info(
        "Worker started. queue=%s dlq=%s",
        settings.REDIS_QUEUE_NAME,
        settings.REDIS_DLQ_NAME,
    )

    while True:
        task = dequeue(block=True, timeout=5)
        if not task:
            continue

        run_at = task.get("run_at")
        if run_at and run_at > time.time():
            requeue_same(task)  # ✅ no attempt increment
            time.sleep(0.25)
            continue

        attempt = int(task.get("attempt", 0))

        try:
            process_task(task)
            log.info("Processed task type=%s attempt=%s", task.get("type"), attempt)

        except Exception as e:
            msg = str(e)
            log.exception(
                "Task failed type=%s attempt=%s err=%s",
                task.get("type"),
                attempt,
                msg,
            )

            if attempt + 1 >= settings.WORKER_MAX_RETRIES:
                send_to_dlq(task, error=msg)
                log.error(
                    "Sent to DLQ type=%s after_attempts=%s",
                    task.get("type"),
                    attempt + 1,
                )
            else:
                requeue_with_backoff(task)
