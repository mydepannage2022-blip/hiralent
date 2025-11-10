import os
import json
import google.generativeai as genai
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

class GeminiCorpusGenerator:
    def __init__(self):
        # Configuration Gemini
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        self.model = genai.GenerativeModel(os.getenv("AI_MODEL", "gemini-pro"))
    
    def generate_from_topic(self, topic: str, difficulty: str = "medium") -> Dict[str, Any]:
        prompt = self._build_coding_prompt(topic, difficulty)
        
        try:
            response = self.model.generate_content(prompt)
            content = response.text.strip()
            
            # Nettoyer la réponse (Gemini peut ajouter des ```json)
            if content.startswith("```json"):
                content = content[7:]  # Enlever ```json
            if content.endswith("```"):
                content = content[:-3]  # Enlever ```
                
            question_data = json.loads(content)
            logger.info(f"✅ Generated question: {question_data['title']}")
            
            return {"success": True, "data": question_data}
            
        except Exception as e:
            logger.error(f"❌ Gemini generation failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "data": self._get_fallback_question(topic, difficulty)
            }
    
    def _build_coding_prompt(self, topic: str, difficulty: str) -> str:
        return f"""
        Create a {difficulty} level programming question about: {topic}
        
        Return ONLY valid JSON with this exact structure, no other text:
        {{
            "title": "Question title",
            "problemStatement": "Clear problem description",
            "difficulty": "{difficulty}",
            "skillTags": ["{topic}", "programming"],
            "testCases": [
                {{"input": "input1", "output": "output1"}},
                {{"input": "input2", "output": "output2"}}
            ],
            "canonicalSolution": "Solution code here",
            "explanation": "Detailed solution explanation"
        }}
        """
    
    def _get_fallback_question(self, topic: str, difficulty: str) -> Dict[str, Any]:
        return {
            "title": f"Basic {topic.title()} Problem",
            "problemStatement": f"Implement a function for {topic}.",
            "difficulty": difficulty,
            "skillTags": [topic, "programming"],
            "testCases": [
                {"input": "test1", "output": "result1"},
                {"input": "test2", "output": "result2"}
            ],
            "canonicalSolution": f"def solution():\n    # Implement solution\n    pass",
            "explanation": "This is a fallback question."
        }
    
    def generate_batch(self, topics: List[str], difficulties: List[str] = None, count_per: int = 2) -> Dict[str, Any]:
        if difficulties is None:
            difficulties = ["easy", "medium", "hard"]
        
        questions = []
        for topic in topics:
            for difficulty in difficulties:
                for i in range(count_per):
                    result = self.generate_from_topic(topic, difficulty)
                    if result["success"]:
                        questions.append(result["data"])
        
        return {
            "success": True,
            "generated_count": len(questions),
            "questions": questions
        }