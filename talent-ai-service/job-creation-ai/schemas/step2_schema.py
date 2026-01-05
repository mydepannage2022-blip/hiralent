from pydantic import BaseModel
from typing import List
from schemas.common_schema import Tone, Language

class Step2Request(BaseModel):
    jobTitle: str
    location: str
    department: str
    jobType: str
    salaryRange: str
    tone: Tone
    language: Language

class ImproveRequest(BaseModel):
    text: str
    instruction: str
    tone: Tone
    language: Language

class JobSections(BaseModel):
    summary: str
    responsibilities: List[str]
    requirements: List[str]
    niceToHave: List[str]
    benefits: List[str]

class Step2Response(BaseModel):
    variants: List[str]
    sections: JobSections
    fullDescription: str
