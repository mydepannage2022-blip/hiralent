from fastapi import APIRouter, HTTPException
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_404_NOT_FOUND, HTTP_500_INTERNAL_SERVER_ERROR

from app.domain.schemas import (
    SkillRadarUpdateRequest,
    SkillRadarUpdateResponse,
    RadarVector,
)
from app.services.skill_radar.service import skill_radar_service

router = APIRouter()


@router.post(
    "/update",
    response_model=SkillRadarUpdateResponse,
    summary="Update candidate skill radar from assessment signal",
)
async def update_skill_radar(request: SkillRadarUpdateRequest) -> SkillRadarUpdateResponse:
    if request.signal is None:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail="signal is required.",
        )

    try:
        updated_vector = skill_radar_service.update_radar_vector(request.signal)
        if updated_vector is None:
            raise HTTPException(
                status_code=HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update radar vector.",
            )

        return SkillRadarUpdateResponse(
            candidate_id=updated_vector.candidate_id,
            radar_vector=updated_vector,
            updated_skills=list(updated_vector.scores.keys()),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating skill radar: {str(e)}",
        ) from e


@router.get(
    "/{candidate_id}",
    response_model=RadarVector,
    summary="Get current skill radar for a candidate",
)
async def get_skill_radar(candidate_id: str) -> RadarVector:
    try:
        vector = skill_radar_service.get_radar_vector(candidate_id)
        if not vector:
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND,
                detail="Candidate not found",
            )

        return vector

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving skill radar: {str(e)}",
        ) from e
