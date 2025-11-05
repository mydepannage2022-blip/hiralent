from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()

@router.get("/healthz")
def healthz():
    return {"status": "ok", "service": settings.service_name, "env": settings.service_env}
