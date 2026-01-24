from qdrant_client.http import models as qm
from .qdrant_client import get_qdrant

def upsert(collection: str, point_id: str, vector: list[float], payload: dict):
    client = get_qdrant()
    client.upsert(
        collection_name=collection,
        points=[
            qm.PointStruct(
                id=point_id,
                vector=vector,
                payload=payload
            )
        ]
    )

def search(collection: str, vector: list[float], limit: int):
    client = get_qdrant()

    # new API
    res = client.query_points(
        collection_name=collection,
        query=vector,
        limit=limit,
        with_payload=True
    )

    # query_points returns an object with .points
    return res.points
