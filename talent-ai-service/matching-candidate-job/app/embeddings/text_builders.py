def candidate_text(c) -> str:
    return "\n".join([
        f"Skills: {', '.join(c.skills or [])}",
        f"Headline: {c.headline or ''}",
        f"About: {c.about_me or ''}",
        f"Experience: {c.experience or ''}",
        f"Education: {c.education or ''}",
    ]).strip()

def job_text(j) -> str:
    return "\n".join([
        f"Title: {j.title}",
        f"Required skills: {', '.join(j.required_skills or [])}",
        f"Description: {j.description or ''}",
    ]).strip()
