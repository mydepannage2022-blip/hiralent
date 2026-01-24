from fastapi import APIRouter

from app.api.routes.health import router as health_router
from app.api.routes.sources import router as sources_router
from app.api.routes.runs import router as runs_router
from app.api.routes.preview import router as preview_router

router = APIRouter()
router.include_router(health_router)
router.include_router(sources_router, prefix="/sources", tags=["sources"])
router.include_router(runs_router, prefix="/runs", tags=["runs"])
router.include_router(preview_router, prefix="/runs", tags=["runs"])
