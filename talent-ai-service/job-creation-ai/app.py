from fastapi import FastAPI
from api.v1.job_ai import router as job_ai_router
from api.health import router as health_router
from core.security import internal_auth

app = FastAPI(
    title="Talent AI Service - Job Creation",
    version="1.0.0"
)

app.include_router(health_router)
# Job-AI endpoints require the internal service token (X-API-Token); health stays open.
app.include_router(job_ai_router, prefix="/api", dependencies=[internal_auth])
