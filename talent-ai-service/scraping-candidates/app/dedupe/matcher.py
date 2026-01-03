from dataclasses import dataclass


@dataclass
class MatchDecision:
    action: str  # "skip" | "upsert"
    reason: str | None = None


def decide_in_run_dedupe(already_seen: bool) -> MatchDecision:
    if already_seen:
        return MatchDecision(action="skip", reason="duplicate_in_run")
    return MatchDecision(action="upsert")
