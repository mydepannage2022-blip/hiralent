# app/clients/backend_client.py
from __future__ import annotations

import requests
from typing import Any, Dict
from fastapi import HTTPException

from app.core.settings import settings


def _headers() -> Dict[str, str]:
    token = getattr(settings, "BACKEND_INTERNAL_TOKEN", None)
    if not token:
        raise HTTPException(status_code=500, detail="Missing BACKEND_INTERNAL_TOKEN")
    return {"Authorization": f"Bearer {token}"}


def _base_url() -> str:
    base = getattr(settings, "BACKEND_BASE_URL", None)
    if not base:
        raise HTTPException(status_code=500, detail="Missing BACKEND_BASE_URL")
    return str(base).rstrip("/")


def get_job_snapshot(job_id: str) -> Dict[str, Any]:
    url = f"{_base_url()}/internal/matching/company/jobs/{job_id}/snapshot"
    r = requests.get(url, headers=_headers(), timeout=10)
    if r.status_code == 404:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    r.raise_for_status()
    data = r.json()
    return data.get("snapshot") or data


def get_candidate_snapshot(candidate_id: str) -> Dict[str, Any]:
    url = f"{_base_url()}/internal/matching/candidate/candidates/{candidate_id}/snapshot"
    r = requests.get(url, headers=_headers(), timeout=10)
    if r.status_code == 404:
        raise HTTPException(status_code=404, detail=f"Candidate {candidate_id} not found")
    r.raise_for_status()
    data = r.json()
    return data.get("snapshot") or data
