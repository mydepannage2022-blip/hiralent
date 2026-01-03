from pydantic import BaseModel
from typing import Dict, List, Optional


class CandidatePreview(BaseModel):
    full_name: Optional[str] = None
    headline: Optional[str] = None
    location: Optional[str] = None
    city: Optional[str] = None
    skills: List[str] = []
    links: Dict[str, str] = {}

    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None

    source: str
    source_uid: Optional[str] = None
    source_profile_url: Optional[str] = None
