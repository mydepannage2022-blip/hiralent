from typing import Any, Dict
from app.models.candidate import CandidateNormalized


def map_to_backend_payload(c: CandidateNormalized, fingerprint: str, quality_score: int | None = None, summary: str | None = None) -> Dict[str, Any]:
    return {
        "fingerprint": fingerprint,
        "source": c.source,
        "source_uid": c.source_uid,
        "source_profile_url": c.source_profile_url,

        "full_name": c.full_name,
        "headline": c.headline,
        "about_me": c.about_me,
        "location": c.location,
        "city": c.city,
        "skills": c.skills,
        "links": c.links,

        "email": c.email,
        "phone": c.phone,
        "linkedin_url": c.linkedin_url,

        "quality_score": quality_score,
        "summary": summary,
    }
