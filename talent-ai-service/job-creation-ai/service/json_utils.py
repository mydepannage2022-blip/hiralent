import json

def parse_json_from_text(raw: str) -> dict:
    if not raw or not raw.strip():
        raise ValueError("LLM returned empty response")

    text = raw.strip()

    # Remove markdown fences if present
    if text.startswith("```"):
        # remove first fence line and last fence
        lines = text.splitlines()
        # drop first line like ```json
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        # drop last line ```
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()

    # Find JSON object boundaries
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError(f"LLM did not return JSON. Raw output starts with: {raw[:200]}")

    json_str = text[start:end+1]
    return json.loads(json_str)
