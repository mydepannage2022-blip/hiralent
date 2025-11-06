# Placeholder for gRPC client to Wafaa's QuestionService
# Later, generate stubs from shared protos and call:
#   GenerateQuestions(job_description, skills[], mode="context|corpus")
from typing import List, Dict

def generate_questions(job_description: str, skills: List[str], mode: str = "context") -> Dict:
    # TODO: implement real gRPC call
    return {
        "questions": [
            {"type": "mcq", "title": "What is FastAPI?", "difficulty": "intermediate"},
            {"type": "coding", "title": "Implement Fibonacci in Python", "difficulty": "intermediate"}
        ],
        "mode": mode
    }
