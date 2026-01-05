from app.models.candidate import CandidateNormalized


def compute_quality_score(c: CandidateNormalized) -> int:
    """
    0..100 score.
    Simple production heuristic: more fields filled => higher score.
    """
    score = 0
    if c.full_name:
        score += 20
    if c.headline:
        score += 15
    if c.about_me:
        score += 15
    if c.location:
        score += 10
    if c.linkedin_url or ("linkedin" in c.links):
        score += 10
    if c.email:
        score += 15
    if c.skills:
        score += min(15, 3 * len(c.skills))
    return min(100, score)
