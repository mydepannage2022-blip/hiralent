from app.models.candidate import CandidateNormalized
from app.extraction.text_cleaner import clean_text
from app.extraction.skill_extractor import extract_skills
from app.extraction.headline_normalizer import normalize_headline
from app.extraction.location_normalizer import normalize_location


def normalize_and_enrich(candidate: CandidateNormalized) -> CandidateNormalized:
    candidate.headline = normalize_headline(candidate.headline)

    if candidate.about_me:
        candidate.about_me = clean_text(candidate.about_me)
        extracted = extract_skills(candidate.about_me)
        candidate.skills = sorted(list(set(candidate.skills + extracted)))

    loc, city = normalize_location(candidate.location)
    candidate.location = loc
    if not candidate.city:
        candidate.city = city

    # Ensure link keys are strings
    candidate.links = {str(k): str(v) for k, v in (candidate.links or {}).items() if v}

    return candidate
