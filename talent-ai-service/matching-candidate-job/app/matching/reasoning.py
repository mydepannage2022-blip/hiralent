# app/matching/reasoning.py
from __future__ import annotations

from typing import List, Optional, Literal

from app.core.settings import settings

Audience = Literal["candidate", "employer"]


def build_reasoning_prompt(
    *,
    matched: List[str],
    missing: List[str],
    score: float,
    trigger: str,
    job_title: Optional[str] = None,
    audience: Audience = "candidate",
) -> str:
    """
    Create a very constrained prompt so Gemini returns a short recruitment-style explanation.

    audience="candidate" -> candidate-facing message (next step is personal)
    audience="employer"  -> recruiter-facing message (no "you should", no telling candidate to do things)
    """
    title_line = f"- job_title: {job_title}\n" if job_title else ""

    # Different "action" rules depending on audience
    if audience == "employer":
        action_rules = """
- This message is for an EMPLOYER/RECRUITER (NOT the candidate).
- Do NOT say "you should" to the candidate or "complete the assessment to proceed".
- Keep it recruiter-oriented: fit summary + gaps + suggested stage (screening / assessment / interview).
- Use "Suggested stage: ..." if needed.
""".strip()
    else:
        action_rules = """
- This message is for a CANDIDATE.
- Keep it actionable for the candidate (what is good + what is missing + what to do next).
""".strip()

    return f"""
You are an assistant for a serious recruitment platform.

TASK:
Write a SHORT recruitment-style explanation.

STRICT RULES:
- Output in English.
- Max 2 sentences.
- No bullet points.
- No "this output suggests", no analysis, no examples, no scenarios.
- Do NOT explain what matching is.
- Do NOT add any new skills or assumptions.
- Only use the facts below.
{action_rules}

FACTS:
{title_line}- matched_skills: {matched}
- missing_skills: {missing}
- score: {score}
- trigger: {trigger}

Return ONLY the final message text (no quotes, no extra text).
""".strip()


def llm_reasoning(prompt: str) -> Optional[str]:
    """
    Uses Gemini ONLY to rewrite reasoning text (not for scoring).
    Returns None if disabled or if any error happens.
    """
    if not settings.GEMINI_API_KEY:
        return None

    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)

        model = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL or "gemini-2.0-flash",
            generation_config={
                "temperature": 0.2,
                "max_output_tokens": 120,
            },
        )

        res = model.generate_content(prompt)
        text = (res.text or "").strip()

        # Safety: avoid huge essays if the model ignores instructions
        if not text:
            return None
        if len(text) > 400:
            return None

        return text

    except Exception:
        # Never crash matching because of LLM
        return None
