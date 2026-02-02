from fastapi import FastAPI

from app.core.logging_config import setup_logging
from app.api.routes_health import router as health_router
from app.api.routes_index import router as index_router
from app.api.routes_match import router as match_router
from app.api.routes_events import router as events_router
from app.vector_store.collections import ensure_collections


def create_app() -> FastAPI:
    setup_logging()
    app = FastAPI(title="matching-candidate-job")

    @app.on_event("startup")
    def _startup():
        ensure_collections()

    app.include_router(health_router)
    app.include_router(index_router)
    app.include_router(match_router)
    app.include_router(events_router)  # ✅ IMPORTANT
    return app


app = create_app()
