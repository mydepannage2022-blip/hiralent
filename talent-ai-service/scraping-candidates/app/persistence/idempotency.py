def make_idempotency_key(fingerprint: str) -> str:
    return f"sourced_candidate:{fingerprint}"
