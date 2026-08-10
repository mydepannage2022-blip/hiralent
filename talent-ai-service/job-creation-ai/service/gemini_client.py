import google.generativeai as genai
from config.settings import settings
from service.prompt_guard import build_safety_settings, ISOLATION_PREAMBLE

genai.configure(api_key=settings.GEMINI_API_KEY)

class GeminiClient:
    def __init__(self):
        # R-34: enforce safe (non-BLOCK_NONE) thresholds and a system-side isolation
        # instruction on every generation — employer form text is untrusted input.
        self.model = genai.GenerativeModel(
            settings.GEMINI_MODEL,
            safety_settings=build_safety_settings(),
            system_instruction=ISOLATION_PREAMBLE,
        )

    def generate(self, prompt: str) -> str:
        response = self.model.generate_content(prompt)
        return response.text
