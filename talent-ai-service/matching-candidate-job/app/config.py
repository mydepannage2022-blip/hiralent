from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ENV: str = "dev"
    SERVICE_NAME: str = "matching-candidate-job"
    PORT: int = 8010

    DATABASE_URL: str

    SERVICE_API_KEY: str

    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4o-mini"

    class Config:
        env_file = ".env"

settings = Settings()
