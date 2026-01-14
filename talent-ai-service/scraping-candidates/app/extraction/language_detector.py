def detect_language(text: str | None) -> str:
    """
    Very basic heuristic to help indexing/routing.
    Replace later with a real library if you want.
    """
    t = (text or "").lower()
    if any(w in t for w in ["je ", "tu ", "vous ", "bonjour", "merci"]):
        return "fr"
    if any(w in t for w in ["hola", "gracias", "buenos"]):
        return "es"
    if any(w in t for w in ["مرحبا", "شكرا"]):
        return "ar"
    return "en"
