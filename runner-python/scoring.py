import json
from typing import Tuple

def _normalize_lines(s: str) -> str:
    return "\n".join([line.rstrip() for line in s.strip().splitlines()])

def compare_output(actual: str, expected: str) -> Tuple[bool, str]:
    a = _normalize_lines(actual)
    e = _normalize_lines(expected)

    if a == e:
        return True, "exact"

    # numeric tolerance
    try:
        an = float(a)
        en = float(e)
        if abs(an - en) <= 1e-6 * max(1.0, abs(en)):
            return True, "float≈"
    except Exception:
        pass

    # JSON equality (object/array)
    try:
        aj = json.loads(a)
        ej = json.loads(e)
        if aj == ej:
            return True, "json-eq"
    except Exception:
        pass

    return False, "mismatch"
