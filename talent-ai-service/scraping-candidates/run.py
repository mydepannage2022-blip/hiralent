import uvicorn
from app.settings import settings


def main():
    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.env == "local",
        log_level="info",
    )

if __name__ == "__main__":
    main()
