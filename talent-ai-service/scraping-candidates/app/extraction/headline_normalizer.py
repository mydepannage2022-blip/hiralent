def normalize_headline(headline: str | None) -> str | None:
    if not headline:
        return None
    h = headline.strip()
    # very light normalization
    replacements = {
        "ml engineer": "Machine Learning Engineer",
        "ai engineer": "AI Engineer",
        "backend developer": "Backend Developer",
        "full stack": "Full Stack Developer",
    }
    low = h.lower()
    return replacements.get(low, h)
