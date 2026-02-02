# app/embeddings/provider.py
from __future__ import annotations

from app.core.settings import settings

_model = None


def _load_sentence_transformer():
    from sentence_transformers import SentenceTransformer
    return SentenceTransformer(settings.EMBEDDING_MODEL)


def embed(text: str) -> list[float]:
    """
    ✅ Prod-safe rule:
    - Matching embeddings must stay stable and match Qdrant VECTOR_SIZE.
    - Gemini is used for reasoning only (NOT embeddings) in this service.
    """
    global _model

    if not text:
        # empty input -> return a zero vector (or raise). Zero vector is safer for APIs.
        return [0.0] * settings.VECTOR_SIZE

    if _model is None:
        _model = _load_sentence_transformer()

    vec = _model.encode([text], normalize_embeddings=True)[0]
    out = vec.tolist()

    # Hard safety check: Qdrant collection vector size MUST match
    if len(out) != settings.VECTOR_SIZE:
        raise RuntimeError(
            f"Embedding dim mismatch: got={len(out)} expected={settings.VECTOR_SIZE}. "
            f"Check EMBEDDING_MODEL/VECTOR_SIZE."
        )

    return out
