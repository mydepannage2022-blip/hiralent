"""Embedding model wrapper (text-to-vector)."""


class EmbeddingModel:
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model_name = model_name

    def encode(self, text: str):
        # placeholder: return vector
        return [0.0] * 384
