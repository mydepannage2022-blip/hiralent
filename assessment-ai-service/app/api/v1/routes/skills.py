from fastapi import APIRouter, HTTPException
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_500_INTERNAL_SERVER_ERROR

from app.domain.schemas import SkillExtractionRequest, SkillExtractionResponse
from app.api.v1.routes.jd import parse_job_description  # reuse your JD logic

router = APIRouter()

@router.post(
    "/extract",
    response_model=SkillExtractionResponse,
    summary="Extract only skills from a job description",
)
async def extract_skills(request: SkillExtractionRequest) -> SkillExtractionResponse:
    """
    Thin wrapper around JD parsing — returns only the skills list.
    """
    if not request.job_description or not request.job_description.strip():
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail="job_description is required and cannot be empty.",
        )

    try:
        jd_response = await parse_job_description(request)
        skills = jd_response.analysis.get("skills_detected", []) if hasattr(jd_response, "analysis") else []
        return SkillExtractionResponse(skills=skills)

    except Exception as e:
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error extracting skills: {str(e)}",
        )
