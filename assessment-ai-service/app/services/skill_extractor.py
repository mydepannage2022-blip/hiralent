import re
from typing import List
from app.models.schemas import ExtractedSkill

# Minimal rule-based baseline; replace with spaCy/LLM later
TECH_SKILLS = [
    "python","typescript","javascript","node.js","react","fastapi","django",
    "postgres","mysql","redis","docker","kubernetes","aws","gcp","azure",
    "rest","grpc","microservices","CI/CD","prisma","express","langchain"
]

def extract_skills_from_text(text: str) -> List[ExtractedSkill]:
    lower = text.lower()
    found = []
    for s in TECH_SKILLS:
        # simple token presence
        if re.search(rf"\b{re.escape(s)}\b", lower):
            cat = "backend" if s in ["python","fastapi","django","node.js","express","prisma"] else \
                  "frontend" if s in ["react","typescript","javascript"] else \
                  "devops" if s in ["docker","kubernetes","aws","gcp","azure","CI/CD".lower()] else \
                  "data" if s in ["postgres","mysql","redis"] else "general"
            level = "intermediate"
            found.append(ExtractedSkill(name=s, category=cat, level=level, weight=1.0))
    # Deduplicate by name
    unique = {}
    for f in found:
        unique[f.name] = f
    return list(unique.values())
