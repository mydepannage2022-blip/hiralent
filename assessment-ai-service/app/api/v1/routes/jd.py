from fastapi import APIRouter, HTTPException
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_500_INTERNAL_SERVER_ERROR

from app.domain.schemas import JDParseRequest, JDParseResponse
from app.services.jd.extractor import jd_extractor

router = APIRouter()


@router.post(
    "/parse",
    response_model=JDParseResponse,
    summary="Analyze a job description and extract requirements",
)
async def parse_job_description(request: JDParseRequest) -> JDParseResponse:
    # Basic validation (defensive even if Pydantic already enforces)
    if not request.job_description or not request.job_description.strip():
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail="job_description is required and cannot be empty.",
        )

    try:
        analysis, requirements = await jd_extractor.analyze_job_description(
            request.job_description,
            request.job_title,
        )

        return JDParseResponse(
            analysis=analysis,
            requirements=requirements,
        )

    except HTTPException:
        # Let explicit HTTP errors pass through
        raise

    except Exception as e:
        # Generic fallback for unexpected errors
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing job description: {str(e)}",
        )
