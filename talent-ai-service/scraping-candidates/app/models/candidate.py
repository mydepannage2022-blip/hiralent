from pydantic import BaseModel, Field
from typing import Dict, List, Optional


class CandidateNormalized(BaseModel):
    full_name: Optional[str] = None
    headline: Optional[str] = None
    about_me: Optional[str] = None
    location: Optional[str] = None
    city: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    links: Dict[str, str] = Field(default_factory=dict)

    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None

    source: str
    source_uid: Optional[str] = None
    source_profile_url: Optional[str] = None
