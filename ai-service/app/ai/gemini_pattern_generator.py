import os, json, logging
import google.generativeai as genai
from typing import Dict, Any

logger = logging.getLogger(__name__)

class GeminiPatternQuestionGenerator:
    def __init__(self):
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        self.model = genai.GenerativeModel(os.getenv("AI_MODEL", "gemini-2.5-flash"))

    def generate_from_pattern(self, pattern_obj: Dict[str, Any]) -> Dict[str, Any]:
        prompt = self._build_prompt(pattern_obj)

        try:
            res = self.model.generate_content(prompt)
            content = (res.text or "").strip()

            # cleanup ```json fences
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

            data = json.loads(content)

            # enforce required fields
            data.setdefault("type", "coding")
            data.setdefault("description", "")
            data.setdefault("metadata", {})
            data.setdefault("skillTags", pattern_obj.get("tags", []) or [])
            data.setdefault("difficulty", pattern_obj.get("difficulty", "medium"))

            return {"success": True, "question": data}

        except Exception as e:
            logger.exception("Pattern question generation failed")
            return {"success": False, "error": str(e)}

    def _build_prompt(self, p: Dict[str, Any]) -> str:
        fast = bool(p.get("fast", True))

        # FAST mode: fewer testcases + shorter explanation
        testcase_rule = "Provide 3 test cases max." if fast else "Provide 6 test cases."
        expl_rule = "Explanation must be <= 5 lines." if fast else "Explanation can be detailed."

        return f"""
You generate a coding interview question from an extracted algorithm pattern.
Return ONLY valid JSON (no markdown, no extra text).

Pattern context:
- source: {p.get("source")}
- sourceId: {p.get("sourceId")}
- target difficulty: {p.get("difficulty")}
- domain: {p.get("domain")}
- tags: {p.get("tags")}
- pattern summary: {p.get("pattern")}
- constraints: {json.dumps(p.get("constraints", None))}
- input structure: {json.dumps(p.get("inputStructure", None))}

Output JSON with EXACT keys:
{{
  "title": "...",
  "description": "...",
  "problemStatement": "...",
  "difficulty": "{p.get("difficulty","medium")}",
  "skillTags": [...],
  "type": "coding",
  "canonicalSolution": "... (Python, function-based preferred)",
  "testCases": {{
    "inputs": [...],
    "outputs": [...]
  }},
  "explanation": "...",
  "metadata": {{
    "patternSource": "{p.get("source")}",
    "patternSourceId": "{p.get("sourceId")}",
    "patternDomain": "{p.get("domain")}",
    "patternTags": {json.dumps(p.get("tags", []))},
    "patternDifficultyVariant": "{p.get("difficulty","medium")}"
  }}
}}

Rules:
- Must follow the pattern (not random).
- testCases.inputs and testCases.outputs must align (same length).
- difficulty must be exactly one of: easy | medium | hard.
- {testcase_rule}
- {expl_rule}
"""
