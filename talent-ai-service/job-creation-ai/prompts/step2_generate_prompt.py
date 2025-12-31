def build_step2_prompt(payload):
    return f"""
You are a professional job description generator like LinkedIn.

Generate a job description in {payload.language} with tone "{payload.tone}".

Job:
Title: {payload.jobTitle}
Location: {payload.location}
Department: {payload.department}
Type: {payload.jobType}
Salary: {payload.salaryRange}

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
- "variants" MUST be an array of exactly 3 STRINGS.
- Each variant is a FULL job description text (not a title, not an object).
- Do NOT return objects inside "variants".
- Do NOT include job title suggestions anywhere.
- No markdown, no backticks, no explanation. JSON only.

Output must start with {{ and end with }} with no extra characters.
"""
