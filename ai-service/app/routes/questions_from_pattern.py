from fastapi import APIRouter
from app.schemas.pattern_to_question import PatternToQuestionRequest, PatternToQuestionResponse
from app.ai.gemini_pattern_generator import GeminiPatternQuestionGenerator

router = APIRouter()
gen = GeminiPatternQuestionGenerator()

@router.post("/questions/from-pattern", response_model=PatternToQuestionResponse)
def generate_question_from_pattern(req: PatternToQuestionRequest):
    result = gen.generate_from_pattern(req.model_dump())

    if not result["success"]:
        return PatternToQuestionResponse(success=False, error=result.get("error", "generation failed"))

    return PatternToQuestionResponse(success=True, question=result["question"])
