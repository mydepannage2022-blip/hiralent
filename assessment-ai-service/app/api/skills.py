from fastapi import APIRouter, Depends
from app.api.deps import verify_internal_token
from app.models.schemas import SkillExtractionIn, SkillExtractionOut
from app.services.skill_extractor import extract_skills_from_text

router = APIRouter(prefix="/skills", tags=["skills"])

@router.post("/extract", response_model=SkillExtractionOut, dependencies=[Depends(verify_internal_token)])
def extract(inb: SkillExtractionIn):
    skills = extract_skills_from_text(inb.job_description)
    return SkillExtractionOut(title=inb.job_title, skills=skills, meta={"source":"rule-based-v1"})
