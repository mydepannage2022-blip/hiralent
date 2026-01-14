from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    service_name: str = "scraping-candidates"
    env: str = "local"

    api_host: str = "0.0.0.0"
    api_port: int = 8010

    redis_url: str = "redis://localhost:6379/0"

    backend_base_url: str = "http://localhost:5000"
    backend_internal_token: str = "changeme"

    enable_github: bool = True
    enable_greenhouse: bool = False
    enable_lever: bool = False

    github_token: str = ""
    greenhouse_api_key: str = ""
    lever_api_key: str = ""

    http_timeout_sec: int = 30
    http_max_retries: int = 3
    http_backoff_min_sec: float = 0.5
    http_backoff_max_sec: float = 4.0

    class Config:
        env_file = ".env"


settings = Settings()
