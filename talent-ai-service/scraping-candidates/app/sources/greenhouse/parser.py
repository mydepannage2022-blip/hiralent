from app.models.candidate import CandidateNormalized


def parse_greenhouse_candidate(c: dict) -> CandidateNormalized:
    # Greenhouse candidate has: first_name, last_name, email_addresses, phone_numbers, social_media_addresses, applications, etc.
    first = c.get("first_name") or ""
    last = c.get("last_name") or ""
    name = (first + " " + last).strip() or c.get("name")

    email = None
    emails = c.get("email_addresses") or []
    if emails and isinstance(emails, list):
        email = emails[0].get("value")

    phone = None
    phones = c.get("phone_numbers") or []
    if phones and isinstance(phones, list):
        phone = phones[0].get("value")

    linkedin_url = None
    socials = c.get("social_media_addresses") or []
    for s in socials:
        if (s.get("type") or "").lower() == "linkedin":
            linkedin_url = s.get("value")
            break

    links = {}
    if linkedin_url:
        links["linkedin"] = linkedin_url

    return CandidateNormalized(
        full_name=name,
        headline=None,
        about_me=None,
        location=None,
        city=None,
        skills=[],
        links=links,
        email=email,
        phone=phone,
        linkedin_url=linkedin_url,
        source="greenhouse",
        source_uid=str(c.get("id")) if c.get("id") is not None else None,
        source_profile_url=None,
    )
