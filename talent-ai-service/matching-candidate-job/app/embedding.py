import hashlib
from sentence_transformers import SentenceTransformer
import numpy as np
from .config import settings

_model = None

def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
    return _model

def make_text_for_candidate(skills: list[str], headline: str | None, about: str | None, exp: str | None, edu: str | None) -> str:
    parts = [
        f"Skills: {', '.join(skills or [])}",
        f"Headline: {headline or ''}",
        f"About: {about or ''}",
        f"Experience: {exp or ''}",
        f"Education: {edu or ''}",
    ]
    return "\n".join(parts).strip()

def make_text_for_job(title: str, desc: str, required_skills: list[str]) -> str:
    parts = [
        f"Title: {title}",
        f"Required skills: {', '.join(required_skills or [])}",
        f"Description: {desc or ''}",
    ]
    return "\n".join(parts).strip()

def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

def embed_text(text: str) -> np.ndarray:
    model = get_model()
    vec = model.encode([text], normalize_embeddings=True)[0]
    return np.asarray(vec, dtype=np.float32)
