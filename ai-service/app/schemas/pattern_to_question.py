from pydantic import BaseModel
from typing import Any, List, Optional, Dict

class PatternToQuestionRequest(BaseModel):
    source: str
    sourceId: str
    difficulty: str
    pattern: str
    domain: str
    tags: List[str] = []
    constraints: Any = None
    inputStructure: Any = None

    # speed knob
    fast: bool = True

class GeneratedQuestion(BaseModel):
    title: str
    description: str = ""
    problemStatement: str
    difficulty: str
    skillTags: List[str]
    type: str = "coding"
    canonicalSolution: str
    testCases: Any
    explanation: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    # optional MCQ fields
    options: Optional[Any] = None
    correctAnswer: Optional[str] = None

class PatternToQuestionResponse(BaseModel):
    success: bool
    question: Optional[GeneratedQuestion] = None
    error: Optional[str] = None
