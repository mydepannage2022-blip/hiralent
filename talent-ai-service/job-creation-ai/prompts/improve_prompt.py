def build_improve_prompt(payload):
    return f"""
You are an expert HR assistant like LinkedIn.

Task: Improve/Rewrite the given job description.

Instruction: {payload.instruction}
Tone: "{payload.tone}"
Language: "{payload.language}"

Input text:
{payload.text}

Return ONLY valid JSON with EXACTLY this structure and types:
{{
  "variants": ["string", "string", "string"],
  "sections": {{
    "summary": "string",
    "responsibilities": ["string"],
    "requirements": ["string"],
    "niceToHave": ["string"],
    "benefits": ["string"]
  }},
  "fullDescription": "string"
}}

Rules:
- "variants" MUST be an array of exactly 3 STRINGS (each a full improved job description).
- Do NOT return objects inside "variants".
- "sections" MUST be an object with keys: summary, responsibilities, requirements, niceToHave, benefits.
- Do NOT return headings/content arrays or any other schema.
- No markdown, no backticks, no explanation. JSON only.
- Output must start with {{ and end with }} with no extra characters.
"""
