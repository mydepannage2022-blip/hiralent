FORBIDDEN_TERMS = [
    "only men", "only women", "age limit",
    "guaranteed salary", "no foreigners"
]

def apply_policies(text: str) -> str:
    for term in FORBIDDEN_TERMS:
        text = text.replace(term, "")
    return text.strip()
