import os
import json
import logging
import random
from typing import Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GeminiAIService:
    def __init__(self):
        # Essayer d'importer Google AI
        try:
            import google.generativeai as genai
            api_key = os.getenv("GEMINI_API_KEY", "AIzaSyB6EuKO764m3RDWu7SG7ZrZYpZlbI6vN1k")
            
            if api_key:
                genai.configure(api_key=api_key)
                self.model = genai.GenerativeModel('gemini-2.5-flash')
                self.is_available = True
                logger.info("✅ Gemini AI Service initialized with REAL AI")
            else:
                self.is_available = False
                logger.warning("⚠️  No API key - using demo mode")
                
        except ImportError as e:
            self.is_available = False
            logger.warning(f"⚠️  Google AI import failed: {e} - using demo mode")
        except Exception as e:
            self.is_available = False
            logger.error(f"❌ AI initialization failed: {e} - using demo mode")
    
    def generate_question(self, topic: str, difficulty: str) -> Dict[str, Any]:
        """
        Generate question using AI or fallback to demo
        """
        if self.is_available:
            try:
                return self._generate_with_ai(topic, difficulty)
            except Exception as e:
                logger.error(f"❌ AI generation failed: {e} - falling back to demo")
                return self._generate_demo_question(topic, difficulty)
        else:
            return self._generate_demo_question(topic, difficulty)
    
    def _generate_with_ai(self, topic: str, difficulty: str) -> Dict[str, Any]:
        """Generate using real Gemini AI"""
        import google.generativeai as genai
        
        prompt = f"""
        Create a {difficulty} level programming question about {topic}.
        
        Return ONLY valid JSON with this structure:
        {{
            "title": "Question title",
            "problemStatement": "Problem description",
            "difficulty": "{difficulty}",
            "skillTags": ["{topic}", "programming"],
            "testCases": [
                {{"input": "input1", "output": "output1"}},
                {{"input": "input2", "output": "output2"}}
            ],
            "canonicalSolution": "Solution code",
            "explanation": "Solution explanation"
        }}
        """
        
        logger.info(f"🤖 Generating REAL AI question: {topic} ({difficulty})")
        response = self.model.generate_content(prompt)
        content = response.text.strip()
        
        # Clean response
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        
        question_data = json.loads(content.strip())
        logger.info(f"✅ REAL AI question: {question_data['title']}")
        
        return {
            "success": True,
            "data": question_data
        }
    
    def _generate_demo_question(self, topic: str, difficulty: str) -> Dict[str, Any]:
        """Generate demo question"""
        logger.info(f"🎭 Generating DEMO question: {topic} ({difficulty})")
        
        demo_questions = {
            "python": [
                {
                    "title": "Count Vowels in String",
                    "problemStatement": "Write a Python function that counts vowels in a string.",
                    "difficulty": difficulty,
                    "skillTags": [topic, "python", "strings"],
                    "testCases": [
                        {"input": "\"hello\"", "output": "2"},
                        {"input": "\"python\"", "output": "1"}
                    ],
                    "canonicalSolution": "def count_vowels(s):\n    return sum(1 for c in s if c in 'aeiouAEIOU')",
                    "explanation": "Count characters that are vowels."
                }
            ],
            "c#": [
                {
                    "title": "Sum Positive Numbers", 
                    "problemStatement": "Write a C# method to sum positive numbers in an array.",
                    "difficulty": difficulty,
                    "skillTags": [topic, "csharp", "arrays"],
                    "testCases": [
                        {"input": "[1, -2, 3, -4, 5]", "output": "9"}
                    ],
                    "canonicalSolution": "public static int SumPositives(int[] nums) {\n    return nums.Where(n => n > 0).Sum();\n}",
                    "explanation": "Use LINQ to filter and sum."
                }
            ]
        }
        
        questions = demo_questions.get(topic.lower(), demo_questions["python"])
        question = random.choice(questions)
        
        return {
            "success": True,
            "data": question
        }

# Singleton instance
gemini_ai_service = GeminiAIService()