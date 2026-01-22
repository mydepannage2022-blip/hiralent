from fastapi import APIRouter, HTTPException, BackgroundTasks
from datetime import datetime
import uuid
import logging

from app.models.schemas import (
    QuickValidationRequest,
    QuickValidationResponse,
    DeepValidationRequest,
    DeepValidationQueueResponse,
    DeepValidationResult,
    ValidationSignal,
    ApiResponse
)
from app.models.enums import ValidationStatus, ValidationResult
from app.services.validation_service import ValidationService
from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory job storage (replace with Redis in production)
validation_jobs: dict = {}

validation_service = ValidationService()


@router.post("/validate/quick", response_model=ApiResponse)
async def validate_quick(request: QuickValidationRequest):
    """
    Perform quick synchronous validation (format checks only).
    Returns immediately with basic validation results.
    """
    try:
        start_time = datetime.now()

        result = await validation_service.validate_quick(request)

        return ApiResponse(
            ok=True,
            data=result.model_dump()
        )

    except FileNotFoundError as e:
        logger.error(f"File not found: {e}")
        raise HTTPException(status_code=404, detail=f"Document not found: {str(e)}")
    except Exception as e:
        logger.error(f"Quick validation error: {e}")
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")


@router.post("/validate/deep", response_model=ApiResponse)
async def validate_deep(
    request: DeepValidationRequest,
    background_tasks: BackgroundTasks
):
    """
    Queue deep asynchronous validation with OCR + NLP + ML.
    Returns job ID immediately, results sent via webhook.
    """
    try:
        job_id = str(uuid.uuid4())

        # Store job info
        validation_jobs[job_id] = {
            "job_id": job_id,
            "document_id": request.document_id,
            "case_id": request.case_id,
            "status": ValidationStatus.PENDING,
            "created_at": datetime.now().isoformat()
        }

        # Add to background tasks
        background_tasks.add_task(
            run_deep_validation,
            job_id,
            request
        )

        return ApiResponse(
            ok=True,
            data=DeepValidationQueueResponse(
                validation_job_id=job_id,
                status="queued",
                estimated_completion_seconds=60
            ).model_dump()
        )

    except Exception as e:
        logger.error(f"Failed to queue deep validation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to queue validation: {str(e)}")


async def run_deep_validation(job_id: str, request: DeepValidationRequest):
    """Background task to run deep validation."""
    import httpx

    try:
        # Update status
        validation_jobs[job_id]["status"] = ValidationStatus.PROCESSING
        validation_jobs[job_id]["started_at"] = datetime.now().isoformat()

        # Run validation
        result = await validation_service.validate_deep(job_id, request)

        # Update job with results
        validation_jobs[job_id].update({
            "status": ValidationStatus.COMPLETED,
            "completed_at": datetime.now().isoformat(),
            "result": result.model_dump()
        })

        # Send webhook callback
        callback_url = request.callback_url or settings.BACKEND_WEBHOOK_URL
        if callback_url:
            try:
                async with httpx.AsyncClient() as client:
                    await client.post(
                        callback_url,
                        json=result.model_dump(),
                        timeout=30
                    )
                logger.info(f"Webhook sent for job {job_id}")
            except Exception as webhook_error:
                logger.error(f"Webhook failed for job {job_id}: {webhook_error}")

    except Exception as e:
        logger.error(f"Deep validation failed for job {job_id}: {e}")
        validation_jobs[job_id].update({
            "status": ValidationStatus.FAILED,
            "error_message": str(e),
            "completed_at": datetime.now().isoformat()
        })


@router.get("/validate/{job_id}/result", response_model=ApiResponse)
async def get_validation_result(job_id: str):
    """Get the result of a validation job."""
    if job_id not in validation_jobs:
        raise HTTPException(status_code=404, detail="Validation job not found")

    job = validation_jobs[job_id]

    if job["status"] == ValidationStatus.COMPLETED:
        return ApiResponse(ok=True, data=job.get("result"))
    elif job["status"] == ValidationStatus.FAILED:
        return ApiResponse(
            ok=False,
            error=job.get("error_message", "Validation failed")
        )
    else:
        return ApiResponse(
            ok=True,
            data={
                "validation_job_id": job_id,
                "status": job["status"],
                "message": "Validation in progress"
            }
        )


@router.get("/validate/{job_id}/status")
async def get_validation_status(job_id: str):
    """Get the status of a validation job."""
    if job_id not in validation_jobs:
        raise HTTPException(status_code=404, detail="Validation job not found")

    job = validation_jobs[job_id]
    return {
        "ok": True,
        "data": {
            "job_id": job_id,
            "status": job["status"],
            "created_at": job.get("created_at"),
            "started_at": job.get("started_at"),
            "completed_at": job.get("completed_at")
        }
    }
