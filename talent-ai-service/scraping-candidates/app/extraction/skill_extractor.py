from typing import List

KNOWN_SKILLS = {
    "python", "fastapi", "django",
    "node", "node.js", "express",
    "java", "spring",
    "kubernetes", "docker",
    "tensorflow", "keras", "pytorch",
    "llm", "rag",
    "postgres", "mongodb", "redis",
    "grpc", "microservices", "graphql",
}


def extract_skills(text: str) -> List[str]:
    t = (text or "").lower()
    found = []
    for s in KNOWN_SKILLS:
        if s in t:
            if s in ("node", "node.js"):
                found.append("Node.js")
            elif s == "llm":
                found.append("LLM")
            else:
                found.append(s.title())
    return sorted(list(set(found)))
