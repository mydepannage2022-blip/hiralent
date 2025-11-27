import pytest
from fastapi.testclient import TestClient
from app.api.main import app

client = TestClient(app)


@pytest.mark.integration
def test_jd_parse_with_real_gemini():
    payload = {
        "job_title": "Senior Python Backend Engineer",
        "job_description": """
We are looking for a Senior Python Backend Engineer.
Stack: Python, FastAPI, PostgreSQL, Docker, AWS.
Responsibilities: build APIs, optimize queries, collaborate with product.
Requirements: 5+ years experience, strong backend architecture.
        """
    }

    resp = client.post("/api/v1/jd/parse", json=payload)
    assert resp.status_code == 200

    data = resp.json()
    # Top-level keys
    assert "analysis" in data
    assert "requirements" in data

    analysis = data["analysis"]
    reqs = data["requirements"]

    # Basic structural checks (we don't assert exact model text)
    assert isinstance(analysis["technical_skills"], list)
    assert "experience_level" in analysis
    assert "job_complexity" in analysis
    assert "confidence_score" in analysis

    # Sanity: some expected skills should be present
    skills_lower = [s.lower() for s in analysis["technical_skills"]]
    assert "python" in skills_lower
    assert "fastapi" in skills_lower

    # Requirements buckets exist
    assert "must_have" in reqs
    assert "nice_to_have" in reqs
