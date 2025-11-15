import pytest
from fastapi.testclient import TestClient
from app.api.main import app

client = TestClient(app)


@pytest.mark.integration
def test_chatbot_guided_flow_real_gemini():
    # 1) Start session
    start_payload = {
        "company_id": "comp_123",
        "job_id": None
    }
    start_resp = client.post("/api/v1/chatbot/start", json=start_payload)
    assert start_resp.status_code == 200

    start_data = start_resp.json()
    session = start_data["session"]
    session_id = session["session_id"]
    assert session["current_step"] == "welcome"

    # Helper to send message
    def send(msg: str):
        r = client.post(
            "/api/v1/chatbot/message",
            json={"session_id": session_id, "message": msg},
        )
        assert r.status_code == 200
        return r.json()

    # 2) Role context
    r = send("I need a Python backend developer working with FastAPI and PostgreSQL.")
    assert r["session"]["current_step"] == "job_details"

    # 3) Role details
    r = send("They will build REST APIs and work with data pipelines.")
    assert r["session"]["current_step"] == "skills_identification"

    # 4) Skills & focus
    r = send("Focus on Python (functions, data structures), FastAPI, and SQL. 80% Python, 20% SQL.")
    assert r["session"]["current_step"] == "assessment_type"

    # 5) Assessment type
    r = send("Comprehensive")
    assert r["session"]["current_step"] == "difficulty_level"

    # 6) Difficulty
    r = send("Advanced")
    assert r["session"]["current_step"] == "question_types"

    # 7) Question types
    r = send("70% coding, 30% MCQ with a bit of debugging.")
    assert r["session"]["current_step"] == "time_settings"

    # 8) Time + questions
    r = send("Let's do 60 minutes and 20 questions.")
    assert r["session"]["current_step"] == "review"

    # 9) Confirm
    r = send("confirm")
    assert r["is_completed"] is True
    assert r["session"]["current_step"] == "completed"

    # Assessment data sanity
    ad = r["session"]["assessment_data"]
    assert ad["assessment_type"] == "COMPREHENSIVE"
    assert ad["difficulty"] in ["ADVANCED", "EXPERT", "INTERMEDIATE"]  # depending on mapping
    assert ad["time_limit"] == 60
    assert ad["total_questions"] == 20
    assert ad["status"] == "ready_for_generation"
