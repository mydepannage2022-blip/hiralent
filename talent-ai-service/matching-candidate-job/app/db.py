from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from .config import settings

engine: Engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

def ping_db():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
