from app.models.candidate import CandidateNormalized


def parse_template_profile(p: dict) -> CandidateNormalized:
    return CandidateNormalized(
        full_name=p.get("full_name"),
        headline=p.get("headline"),
        about_me=p.get("about"),
        location=p.get("location"),
        city=p.get("city"),
        skills=p.get("skills") or [],
        links=p.get("links") or {},
        email=p.get("email"),
        phone=p.get("phone"),
        linkedin_url=p.get("linkedin_url"),
        source="template_source",
        source_uid=p.get("id"),
        source_profile_url=p.get("profile_url"),
    )
