from app.models.candidate import CandidateNormalized
from app.extraction.text_cleaner import clean_text


def summarize_candidate(c: CandidateNormalized) -> str | None:
    """
    No LLM here (safe + deterministic).
    Creates a short summary for UI search snippet.
    """
    parts = []
    if c.headline:
        parts.append(c.headline)
    if c.location:
        parts.append(f"Location: {c.location}")
    if c.skills:
        parts.append("Skills: " + ", ".join(c.skills[:10]))
    if c.about_me:
        parts.append(clean_text(c.about_me)[:240])
    if not parts:
        return None
    return " • ".join(parts)
