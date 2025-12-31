from service.json_utils import parse_json_from_text
from service.gemini_client import GeminiClient
from service.policies import apply_policies
from prompts.step1_basics_prompt import build_step1_prompt
from prompts.step2_generate_prompt import build_step2_prompt
from prompts.improve_prompt import build_improve_prompt

class JobAIService:
    def __init__(self):
        self.client = GeminiClient()

    def suggest_basics(self, payload):
        prompt = build_step1_prompt(payload)
        raw = self.client.generate(prompt)
        return parse_json_from_text(raw)

    def generate_description(self, payload):
        prompt = build_step2_prompt(payload)
        raw = self.client.generate(prompt)
        data = parse_json_from_text(raw)

        # --- normalize variants to List[str] (robust against LLM drift) ---
        variants = data.get("variants", [])
        normalized = []
        for v in variants:
            if isinstance(v, str):
                normalized.append(v)
            elif isinstance(v, dict):
                # try common keys if model returns objects by mistake
                normalized.append(v.get("text") or v.get("description") or v.get("title") or "")
            else:
                normalized.append(str(v))

        # ensure exactly 3 strings
        normalized = [x for x in normalized if isinstance(x, str) and x.strip()]
        data["variants"] = normalized[:3]

        data["fullDescription"] = apply_policies(data.get("fullDescription", ""))
        return data


    def improve_description(self, payload):
        prompt = build_improve_prompt(payload)
        raw = self.client.generate(prompt)
        data = parse_json_from_text(raw)

        # --- normalize variants to List[str] ---
        variants = data.get("variants", [])
        normalized = []
        for v in variants:
            if isinstance(v, str):
                normalized.append(v)
            elif isinstance(v, dict):
                normalized.append(v.get("text") or v.get("description") or v.get("fullDescription") or "")
            else:
                normalized.append(str(v))

        normalized = [x for x in normalized if isinstance(x, str) and x.strip()]
        # fallback if model didn't return 3 variants
        full = data.get("fullDescription", "")
        if full and len(normalized) < 3:
            while len(normalized) < 3:
                normalized.append(full)

        data["variants"] = normalized[:3]

        # --- normalize sections to expected object ---
        sections = data.get("sections")
        if not isinstance(sections, dict):
            # fallback minimal sections if model returned weird format
            data["sections"] = {
                "summary": "",
                "responsibilities": [],
                "requirements": [],
                "niceToHave": [],
                "benefits": []
            }

        data["fullDescription"] = apply_policies(data.get("fullDescription", ""))
        return data

