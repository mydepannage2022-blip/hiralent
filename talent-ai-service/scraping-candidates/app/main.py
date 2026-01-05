from fastapi import FastAPI
from app.logging_config import configure_logging
from app.api.router import router


def create_app() -> FastAPI:
    configure_logging()
    app = FastAPI(title="Scraping Candidates Service")
    app.include_router(router)
    return app


app = create_app()
