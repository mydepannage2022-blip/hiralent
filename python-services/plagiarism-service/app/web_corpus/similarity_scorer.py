"""Compute similarity scores combining web corpus results and structural scores."""


def score_combination(struct_score, web_scores):
    # simple weighted combination placeholder
    return struct_score * 0.7 + (sum(web_scores) / max(1, len(web_scores))) * 0.3
