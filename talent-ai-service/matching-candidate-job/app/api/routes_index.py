# app/api/routes_index.py
from __future__ import annotations

import logging
from typing import Any, Dict

import requests
from fastapi import APIRouter, Depends, HTTPException

from app.core.security import require_internal_key
from app.core.settings import settings
from app.workers.queue import enqueue
from app.jobs.schemas import IndexJobIn, IndexCandidateIn

log = logging.getLogger("api.routes_index")

router = APIRouter(prefix="/v1/index", dependencies=[Depends(require_internal_key)])


def _backend_headers() -> dict:
    token = getattr(settings, "BACKEND_INTERNAL_TOKEN", None)
    if not token:
        raise HTTPException(status_code=500, detail="Missing BACKEND_INTERNAL_TOKEN in matching service settings")
    return {"Authorization": f"Bearer {token}"}


def _backend_base_url() -> str:
    base = getattr(settings, "BACKEND_BASE_URL", None)
    if not base:
        raise HTTPException(status_code=500, detail="Missing BACKEND_BASE_URL in matching service settings")
    return str(base).rstrip("/")


def _fetch_snapshot(url: str) -> Dict[str, Any]:
    try:
        r = requests.get(url, headers=_backend_headers(), timeout=10)
        if r.status_code == 404:
            raise HTTPException(status_code=404, detail="Snapshot not found on backend")
        r.raise_for_status()
        data = r.json()
        return data.get("snapshot") if isinstance(data, dict) and "snapshot" in data else data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch snapshot: {e}")


def _fetch_job_snapshot(job_id: str) -> Dict[str, Any]:
    return _fetch_snapshot(f"{_backend_base_url()}/internal/matching/company/jobs/{job_id}/snapshot")


def _fetch_candidate_snapshot(candidate_id: str) -> Dict[str, Any]:
    return _fetch_snapshot(f"{_backend_base_url()}/internal/matching/candidate/candidates/{candidate_id}/snapshot")


@router.post("/job")
def index_job(body: IndexJobIn):
    """
    Accept:
      - { "snapshot": { ...JobSnapshot... } }
      - { "job_id": "..." }
    """
    if body.snapshot is not None:
        enqueue("INDEX_JOB", body.snapshot.model_dump())
        return {"queued": True, "type": "INDEX_JOB", "mode": "snapshot"}

    if body.job_id:
        snap = _fetch_job_snapshot(body.job_id)
        enqueue("INDEX_JOB", snap)
        return {"queued": True, "type": "INDEX_JOB", "mode": "fetch", "job_id": body.job_id}

    raise HTTPException(status_code=400, detail="Provide either snapshot or job_id")


@router.post("/candidate")
def index_candidate(body: IndexCandidateIn):
    """
    Accept:
      - { "snapshot": { ...CandidateSnapshot... } }
      - { "candidate_id": "..." }
    """
    if body.snapshot is not None:
        enqueue("INDEX_CANDIDATE", body.snapshot.model_dump())
        return {"queued": True, "type": "INDEX_CANDIDATE", "mode": "snapshot"}

    if body.candidate_id:
        snap = _fetch_candidate_snapshot(body.candidate_id)
        enqueue("INDEX_CANDIDATE", snap)
        return {"queued": True, "type": "INDEX_CANDIDATE", "mode": "fetch", "candidate_id": body.candidate_id}

    raise HTTPException(status_code=400, detail="Provide either snapshot or candidate_id")
