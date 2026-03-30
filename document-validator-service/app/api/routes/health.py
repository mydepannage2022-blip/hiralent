from fastapi import APIRouter
import pytesseract
import logging

from app.config import settings
from app.models.schemas import HealthCheckResponse, HealthCheckComponent, ApiResponse

router = APIRouter()
logger = logging.getLogger(__name__)


def check_tesseract() -> HealthCheckComponent:
    """Check if Tesseract OCR is available."""
    try:
        version = pytesseract.get_tesseract_version()
        return HealthCheckComponent(
            status="healthy",
            message=f"Tesseract v{version}"
        )
    except Exception as e:
        logger.error(f"Tesseract check failed: {e}")
        return HealthCheckComponent(
            status="unhealthy",
            message=str(e)
        )


def check_spacy() -> HealthCheckComponent:
    """Check if SpaCy model is loaded."""
    try:
        import spacy
        nlp = spacy.load("en_core_web_sm")
        return HealthCheckComponent(
            status="healthy",
            message="SpaCy model loaded"
        )
    except Exception as e:
        logger.warning(f"SpaCy check: {e}")
        return HealthCheckComponent(
            status="degraded",
            message="SpaCy model not loaded (will load on first use)"
        )


def check_minio() -> HealthCheckComponent:
    """Check MinIO/S3 connectivity."""
    try:
        from minio import Minio
        client = Minio(
            settings.S3_ENDPOINT.replace("http://", "").replace("https://", ""),
            access_key=settings.S3_ACCESS_KEY,
            secret_key=settings.S3_SECRET_KEY,
            secure=settings.S3_SECURE
        )
        # Check if bucket exists
        if client.bucket_exists(settings.S3_BUCKET):
            return HealthCheckComponent(
                status="healthy",
                message=f"Connected to bucket: {settings.S3_BUCKET}"
            )
        else:
            return HealthCheckComponent(
                status="degraded",
                message=f"Bucket {settings.S3_BUCKET} not found"
            )
    except Exception as e:
        logger.error(f"MinIO check failed: {e}")
        return HealthCheckComponent(
            status="unhealthy",
            message=str(e)
        )


def check_redis() -> HealthCheckComponent:
    """Check Redis connectivity."""
    try:
        import redis
        r = redis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        r.ping()
        return HealthCheckComponent(
            status="healthy",
            message="Redis connected"
        )
    except Exception as e:
        logger.warning(f"Redis check: {e}")
        return HealthCheckComponent(
            status="degraded",
            message="Redis not available (async validation disabled)"
        )


@router.get("/health", response_model=ApiResponse)
async def health_check():
    """Health check endpoint for the document validator service."""
    components = {
        "tesseract": check_tesseract(),
        "spacy": check_spacy(),
        "minio": check_minio(),
        "redis": check_redis()
    }

    # Determine overall status
    statuses = [c.status for c in components.values()]
    if all(s == "healthy" for s in statuses):
        overall_status = "healthy"
    elif any(s == "unhealthy" for s in statuses):
        overall_status = "unhealthy"
    else:
        overall_status = "degraded"

    health_response = HealthCheckResponse(
        service=settings.SERVICE_NAME,
        version=settings.SERVICE_VERSION,
        status=overall_status,
        components={k: v.model_dump() for k, v in components.items()}
    )

    return ApiResponse(
        ok=overall_status != "unhealthy",
        data=health_response.model_dump()
    )


@router.get("/health/live")
async def liveness():
    """Simple liveness probe."""
    return {"status": "alive"}


@router.get("/health/ready")
async def readiness():
    """Readiness probe - checks critical dependencies."""
    tesseract = check_tesseract()
    if tesseract.status == "unhealthy":
        return {"status": "not_ready", "reason": "Tesseract OCR not available"}
    return {"status": "ready"}
