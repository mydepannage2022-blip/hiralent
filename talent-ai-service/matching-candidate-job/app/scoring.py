import numpy as np

def _norm(s: str) -> str:
    return (s or "").strip().lower()

def skill_overlap(required: list[str], candidate: list[str]) -> tuple[list[str], list[str], float]:
    req = {_norm(x) for x in (required or []) if _norm(x)}
    cand = {_norm(x) for x in (candidate or []) if _norm(x)}
    if not req:
        return [], [], 1.0
    matched = sorted([x for x in req if x in cand])
    missing = sorted([x for x in req if x not in cand])
    coverage = len(matched) / max(1, len(req))
    return matched, missing, coverage

def cosine_sim(a: np.ndarray | None, b: np.ndarray | None) -> float | None:
    if a is None or b is None:
        return None
    # embeddings are normalized already, dot = cosine
    return float(np.dot(a, b))

def default_weights():
    return {
        "skills": 0.55,
        "profile_score": 0.20,
        "embedding": 0.25,
    }

def deterministic_score(skill_coverage: float, profile_score: float | None, min_score: float | None) -> tuple[float, bool, float | None]:
    # Skill part
    s = 0.0
    s += 100.0 * skill_coverage

    # Profile score gate
    if min_score is None:
        return s, True, None
    if profile_score is None:
        return s, False, None

    gap = profile_score - min_score
    ok = profile_score >= min_score
    # small bonus/malus
    s += max(-20.0, min(20.0, gap))
    return s, ok, gap

def final_score(skill_cov: float, det_score: float, sim: float | None, w: dict[str, float]) -> float:
    # Normalize deterministic to [0..1] roughly
    det_norm = max(0.0, min(1.0, det_score / 120.0))
    emb_norm = 0.0 if sim is None else max(0.0, min(1.0, (sim + 1.0) / 2.0))  # [-1,1] -> [0,1]
    return 100.0 * (
        w["skills"] * skill_cov +
        w["profile_score"] * det_norm +
        w["embedding"] * emb_norm
    )

def human_reasoning(matched: list[str], missing: list[str], skill_cov: float, sim: float | None, profile_ok: bool, profile_gap: float | None) -> tuple[list[str], str]:
    reasons = []
    if not profile_ok:
        reasons.append("PROFILE_SCORE_TOO_LOW_OR_MISSING")

    if missing:
        reasons.append("MISSING_SKILLS")

    if sim is not None:
        if sim >= 0.55:
            reasons.append("SEMANTIC_STRONG_MATCH")
        elif sim >= 0.40:
            reasons.append("SEMANTIC_MEDIUM_MATCH")
        else:
            reasons.append("SEMANTIC_WEAK_MATCH")

    txt = []
    txt.append(f"Skill coverage: {round(skill_cov*100)}% ({len(matched)} matched, {len(missing)} missing).")
    if matched:
        txt.append(f"Matched skills: {', '.join(matched[:12])}{'...' if len(matched)>12 else ''}.")
    if missing:
        txt.append(f"Missing skills: {', '.join(missing[:12])}{'...' if len(missing)>12 else ''}.")
    if profile_gap is not None:
        txt.append(f"Profile score gap vs minimum: {profile_gap:+.1f}.")
    if sim is not None:
        txt.append(f"Semantic similarity: {sim:.2f}.")
    return reasons, " ".join(txt)
