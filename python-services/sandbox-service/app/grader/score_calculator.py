"""Score calculation utilities."""


def calculate_score(results):
    total = results.get("total", 0)
    passed = results.get("passed", 0)
    if total == 0:
        return 0
    return int((passed / total) * 100)
