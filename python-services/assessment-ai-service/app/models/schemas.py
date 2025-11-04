from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class SkillExtractionIn(BaseModel):
    job_description: str = Field(..., min_length=10)
    job_title: Optional[str] = None
    auto_generate: Optional[bool] = False

class ExtractedSkill(BaseModel):
    name: str
    category: str = "general"
    level: Optional[str] = None   # beginner/intermediate/advanced
    weight: float = 1.0

class SkillExtractionOut(BaseModel):
    title: Optional[str] = None
    skills: List[ExtractedSkill]
    meta: Dict[str, str] = {}

class ChatStartIn(BaseModel):
    session_id: Optional[str] = None
    initial_data: Optional[Dict[str, str]] = None

class ChatStartOut(BaseModel):
    session_id: str

class ChatMessageIn(BaseModel):
    session_id: str
    message: str

class ChatMessageOut(BaseModel):
    reply: str
    session_id: str
    context_preview: Dict[str, str] = {}
