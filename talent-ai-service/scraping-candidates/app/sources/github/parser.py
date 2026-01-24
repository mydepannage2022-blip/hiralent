from app.models.candidate import CandidateNormalized


def parse_github_user(user: dict) -> CandidateNormalized:
    # GitHub fields: name, bio, location, blog, html_url, email (often null)
    links = {}
    if user.get("html_url"):
        links["github"] = user["html_url"]
    if user.get("blog"):
        links["website"] = user["blog"]

    location = user.get("location")
    name = user.get("name") or user.get("login")

    return CandidateNormalized(
        full_name=name,
        headline="Software Developer",
        about_me=user.get("bio"),
        location=location,
        city=None,
        skills=[],
        links=links,
        email=user.get("email"),
        phone=None,
        linkedin_url=None,
        source="github",
        source_uid=str(user.get("id")) if user.get("id") is not None else user.get("login"),
        source_profile_url=user.get("html_url"),
    )
