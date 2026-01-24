from qdrant_client.http import models as qm
from .qdrant_client import get_qdrant
from app.core.settings import settings

def ensure_collections():
    c = get_qdrant()

    for name in [settings.QDRANT_COLLECTION_JOBS, settings.QDRANT_COLLECTION_CANDIDATES]:
        if not c.collection_exists(name):
            c.create_collection(
                collection_name=name,
                vectors_config=qm.VectorParams(
                    size=settings.VECTOR_SIZE,
                    distance=qm.Distance.COSINE
                )
            )
