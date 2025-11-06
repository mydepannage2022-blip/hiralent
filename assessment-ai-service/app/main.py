from fastapi import FastAPI
from app.core.logging import setup_logging
from app.api import health, skills, chatbot

setup_logging()
app = FastAPI(title="AI Assessment Orchestration Service", version="0.1.0")

app.include_router(health.router)
app.include_router(skills.router)
app.include_router(chatbot.router)
