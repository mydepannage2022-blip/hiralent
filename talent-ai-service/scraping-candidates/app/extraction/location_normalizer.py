def normalize_location(location: str | None) -> tuple[str | None, str | None]:
    """
    Returns (location, city)
    Basic heuristic: if "City, Country" then city=City.
    """
    if not location:
        return None, None
    loc = location.strip()
    city = None
    if "," in loc:
        city = loc.split(",")[0].strip() or None
    return loc, city
