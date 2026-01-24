from app.models.candidate import CandidateNormalized


def parse_lever_candidate(c: dict) -> CandidateNormalized:
    name = c.get("name")
    emails = c.get("emails") or []
    email = emails[0] if emails else None

    phones = c.get("phones") or []
    phone = phones[0] if phones else None

    links = {}
    linkedin_url = None
    urls = c.get("urls") or []
    for u in urls:
        if "linkedin.com" in (u or ""):
            linkedin_url = u
        if u:
            links.setdefault("url", u)

    if linkedin_url:
        links["linkedin"] = linkedin_url

    return CandidateNormalized(
        full_name=name,
        headline=c.get("headline"),
        about_me=c.get("summary"),
        location=c.get("location"),
        city=None,
        skills=c.get("skills") or [],
        links=links,
        email=email,
        phone=phone,
        linkedin_url=linkedin_url,
        source="lever",
        source_uid=c.get("id"),
        source_profile_url=None,
    )
