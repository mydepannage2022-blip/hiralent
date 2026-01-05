from app.utils.hashing import sha256_hex


def normalize_email(email: str) -> str:
    return email.strip().lower()


def normalize_url(url: str) -> str:
    return url.strip()


def compute_fingerprint(
    *,
    email: str | None,
    linkedin_url: str | None,
    source: str,
    source_uid: str | None,
    full_name: str | None,
    city: str | None,
    headline: str | None,
) -> str:
    if email:
        return sha256_hex("email:" + normalize_email(email))

    if linkedin_url:
        return sha256_hex("linkedin:" + normalize_url(linkedin_url))

    if source_uid:
        return sha256_hex(f"source:{source}:{source_uid}")

    base = "|".join([
        (full_name or "").strip().lower(),
        (city or "").strip().lower(),
        (headline or "").strip().lower(),
    ])
    return sha256_hex("weak:" + base)
