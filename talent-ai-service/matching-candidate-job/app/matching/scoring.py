def normalize(s: str) -> str:
    return (s or "").strip().lower()

def skill_overlap(required: list[str], candidate: list[str]):
    req = {normalize(x) for x in required}
    cand = {normalize(x) for x in candidate}

    matched = sorted(req & cand)
    missing = sorted(req - cand)
    coverage = len(matched) / max(1, len(req))
    return matched, missing, coverage

def final_score(skill_cov: float, vec_score: float | None):
    vec = vec_score or 0.0
    return round(100 * (0.65 * skill_cov + 0.35 * vec), 2)

def trigger(score: float) -> str:
    if score >= 80:
        return "INTERVIEW_REQUIRED"
    if score >= 55:
        return "ASSESSMENT_REQUIRED"
    return "NO_TRIGGER"
