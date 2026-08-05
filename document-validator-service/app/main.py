from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import structlog

from app.config import settings
from app.api.routes import health, validation
from app.core.security import internal_auth

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(message)s"
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info(
        "starting_service",
        service=settings.SERVICE_NAME,
        version=settings.SERVICE_VERSION,
        port=settings.PORT
    )

    # Pre-load SpaCy model (optional, will load on first use if not)
    try:
        import spacy
        spacy.load("en_core_web_md")
        logger.info("spacy_model_loaded", model="en_core_web_md")
    except Exception as e:
        logger.warning("spacy_model_not_preloaded", error=str(e))

    yield

    # Shutdown
    logger.info("shutting_down_service")


app = FastAPI(
    title="Document Validator Service",
    description="AI-powered document validation for visa/relocation documents",
    version=settings.SERVICE_VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers — the document endpoints require the internal service token
# (X-API-Token); health stays open for probes.
app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(
    validation.router,
    prefix="/api/v1/documents",
    tags=["validation"],
    dependencies=[internal_auth],
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": settings.SERVICE_NAME,
        "version": settings.SERVICE_VERSION,
        "docs": "/docs" if settings.DEBUG else "disabled"
    }
