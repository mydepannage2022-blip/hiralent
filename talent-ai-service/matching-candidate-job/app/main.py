from fastapi import FastAPI
from .routes import router
from .config import settings
from .db import ping_db

app = FastAPI(title=settings.SERVICE_NAME)

@app.on_event("startup")
def startup():
    ping_db()

app.include_router(router)
