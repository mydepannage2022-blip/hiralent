from qdrant_client import QdrantClient
from app.core.settings import settings

def get_qdrant():
    return QdrantClient(url=settings.QDRANT_URL)
