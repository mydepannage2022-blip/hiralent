from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import v1_router

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.SERVICE_NAME,
        description="AI-powered assessment creation service - JD parsing, chatbot, and skill radar",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc"
    )
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ALLOW_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    # (later): add request logging middleware
    # (later): add custom exception handlers
    # (later): add metrics middleware (Prometheus etc.)

    
    # Health check endpoint
    @app.get("/health")
    async def health_check():
        return {
            "status": "healthy",
            "service": settings.SERVICE_NAME,
            "version": "1.0.0",
            "environment": settings.SERVICE_ENV
        }
    
    # Include API routers
    app.include_router(v1_router, prefix="/api/v1")
    
    return app

app = create_app()