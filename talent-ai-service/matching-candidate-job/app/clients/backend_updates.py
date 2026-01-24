# app/clients/backend_updates.py
from __future__ import annotations

import requests
from typing import Any, Dict, List
from fastapi import HTTPException

from app.core.settings import settings


def _headers() -> Dict[str, str]:
    token = getattr(settings, "BACKEND_INTERNAL_TOKEN", None)
    if not token:
        raise HTTPException(status_code=500, detail="Missing BACKEND_INTERNAL_TOKEN")
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _base_url() -> str:
    base = getattr(settings, "BACKEND_BASE_URL", None)
    if not base:
        raise HTTPException(status_code=500, detail="Missing BACKEND_BASE_URL")
    return str(base).rstrip("/")


def upsert_job_vector(*, job_id: str, status: str, qdrant_point_id: str, embedding_hash: str) -> None:
    url = f"{_base_url()}/internal/matching/vectors/job"
    payload = {
        "job_id": job_id,
        "status": status,
        "qdrant_point_id": qdrant_point_id,
        "embedding_hash": embedding_hash,
    }
    r = requests.post(url, headers=_headers(), json=payload, timeout=10)
    r.raise_for_status()


def upsert_candidate_vector(*, candidate_id: str, status: str, qdrant_point_id: str, embedding_hash: str) -> None:
    url = f"{_base_url()}/internal/matching/vectors/candidate"
    payload = {
        "candidate_id": candidate_id,
        "status": status,
        "qdrant_point_id": qdrant_point_id,
        "embedding_hash": embedding_hash,
    }
    r = requests.post(url, headers=_headers(), json=payload, timeout=10)
    r.raise_for_status()


def upsert_job_recommendations(*, candidate_id: str, items: List[Dict[str, Any]]) -> None:
    url = f"{_base_url()}/internal/matching/recommendations/upsert"
    r = requests.post(
        url,
        headers=_headers(),
        json={"candidate_id": candidate_id, "items": items},
        timeout=15,
    )
    r.raise_for_status()

