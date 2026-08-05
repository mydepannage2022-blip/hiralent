from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ENV: str = "dev"
    SERVICE_NAME: str = "matching-candidate-job"
    PORT: int = 8011

    # auth interne — accept EITHER env name for the same shared secret. The Node backend
    # reads its `INTERNAL_SERVICE_KEY` and sends that value as the `X-Service-Key` header;
    # this service historically read `SERVICE_API_KEY`. Supporting both removes the deploy
    # footgun where the same secret had to be set under two different names. Prefer
    # SERVICE_API_KEY when both are set. Use `effective_service_key` everywhere.
    SERVICE_API_KEY: str = ""
    INTERNAL_SERVICE_KEY: str = ""

    @property
    def effective_service_key(self) -> str:
        return self.SERVICE_API_KEY or self.INTERNAL_SERVICE_KEY

    # redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_QUEUE_NAME: str = "matching:index:queue"
    REDIS_DLQ_NAME: str = "matching:index:dlq"
    WORKER_MAX_RETRIES: int = 5
    WORKER_RETRY_BASE_SECONDS: int = 2

    # qdrant
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_COLLECTION_JOBS: str = "jobs"
    QDRANT_COLLECTION_CANDIDATES: str = "candidates"

    # embeddings
    VECTOR_SIZE: int = 384
    EMBEDDING_PROVIDER: str = "sentence-transformers"  # or "gemini"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # gemini (optional)
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # backend (node internal)
    BACKEND_BASE_URL: str | None = None
    BACKEND_INTERNAL_TOKEN: str | None = None

    class Config:
        env_file = ".env"

settings = Settings()
