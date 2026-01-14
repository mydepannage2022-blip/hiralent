from fastapi import FastAPI
from api.v1.job_ai import router as job_ai_router
from api.health import router as health_router

app = FastAPI(
    title="Talent AI Service - Job Creation",
    version="1.0.0"
)

app.include_router(health_router)
app.include_router(job_ai_router, prefix="/api")
