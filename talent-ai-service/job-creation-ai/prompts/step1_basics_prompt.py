def build_step1_prompt(payload):
    return f"""
You are an expert HR assistant like LinkedIn.

Based on:
Job title: {payload.jobTitle}
Location: {payload.location}
Department: {payload.department}

Return ONLY valid JSON with:
- titleSuggestions (5)
- departmentSuggestions (3)
- senioritySuggestions (Junior/Mid/Senior)
- workplaceTypeSuggestions (Onsite/Hybrid/Remote)
- miniSummary (1 sentence)

JSON ONLY.
Output must start with {{ and end with }} with no extra characters.
"""
