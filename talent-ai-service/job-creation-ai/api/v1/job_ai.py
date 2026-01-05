from fastapi import APIRouter
from schemas.step1_schema import Step1Request, Step1Response
from schemas.step2_schema import Step2Request, Step2Response, ImproveRequest
from service.job_ai_service import JobAIService

router = APIRouter(prefix="/v1/job-ai", tags=["Job AI"])
service = JobAIService()

@router.post("/step1/suggest", response_model=Step1Response)
def suggest_basics(payload: Step1Request):
    return service.suggest_basics(payload)

@router.post("/step2/generate", response_model=Step2Response)
def generate_description(payload: Step2Request):
    return service.generate_description(payload)

@router.post("/description/improve", response_model=Step2Response)
def improve_description(payload: ImproveRequest):
    return service.improve_description(payload)
