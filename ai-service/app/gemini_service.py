import os
import json
import logging
import random
from typing import Dict, Any, List

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GeminiAIService:
    def __init__(self):
        # Try to import Google AI
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
    
    def generate_question(self, topic: str, difficulty: str, question_type: str = "coding") -> Dict[str, Any]:
        """
        Generate question using AI or fallback to demo
        
        Args:
            topic: The subject (e.g., "python", "nursing", "marketing", "sales")
            difficulty: "easy", "medium", "hard"
            question_type: "coding" or "mcq"
        """
        if self.is_available:
            try:
                if question_type == "mcq":
                    return self._generate_mcq_with_ai(topic, difficulty)
                else:
                    return self._generate_coding_with_ai(topic, difficulty)
            except Exception as e:
                logger.error(f"❌ AI generation failed: {e} - falling back to demo")
                if question_type == "mcq":
                    return self._generate_demo_mcq(topic, difficulty)
                else:
                    return self._generate_demo_coding(topic, difficulty)
        else:
            if question_type == "mcq":
                return self._generate_demo_mcq(topic, difficulty)
            else:
                return self._generate_demo_coding(topic, difficulty)
    
    def _generate_mcq_with_ai(self, topic: str, difficulty: str) -> Dict[str, Any]:
        """Generate MCQ using REAL Gemini AI - Works for ANY topic"""
        import google.generativeai as genai
        
        prompt = f"""
        Create a {difficulty} level multiple-choice question about {topic} for professional assessment.
        This question will be used to assess candidates applying for jobs.
        
        Return ONLY valid JSON with this EXACT structure (no extra text, no markdown):
        {{
            "title": "Concise question title (max 10 words)",
            "description": "Clear, detailed question that tests real-world knowledge or skills in {topic}",
            "difficulty": "{difficulty}",
            "skillTags": ["{topic}", "professional-knowledge"],
            "type": "mcq",
            "options": {{
                "A": "First option - make it realistic and plausible",
                "B": "Second option - make it realistic and plausible",
                "C": "Third option - make it realistic and plausible",
                "D": "Fourth option - make it realistic and plausible"
            }},
            "correctAnswer": "A",
            "explanation": "Detailed explanation of why the correct answer is right and why other options are incorrect. Make this educational and helpful."
        }}
        
        IMPORTANT RULES:
        - Question must be relevant to real job scenarios in {topic}
        - All 4 options MUST be plausible (no obviously wrong answers)
        - Only ONE correct answer (A, B, C, or D)
        - Test practical knowledge, not just memorization
        - Explanation should be professional and educational
        - Use proper grammar and professional language
        """
        
        logger.info(f"🤖 Generating REAL AI MCQ: {topic} ({difficulty})")
        response = self.model.generate_content(prompt)
        content = response.text.strip()
        
        # Clean response (remove markdown if present)
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        
        question_data = json.loads(content.strip())
        
        # Ensure type is mcq
        question_data["type"] = "mcq"
        
        logger.info(f"✅ REAL AI MCQ generated: {question_data['title']}")
        
        return {
            "success": True,
            "data": question_data,
            "source": "ai"
        }
    
    def _generate_coding_with_ai(self, topic: str, difficulty: str) -> Dict[str, Any]:
        """Generate coding question using REAL Gemini AI"""
        import google.generativeai as genai
        
        prompt = f"""
        Create a {difficulty} level programming question about {topic}.
        
        Return ONLY valid JSON with this structure:
        {{
            "title": "Question title",
            "problemStatement": "Problem description",
            "difficulty": "{difficulty}",
            "skillTags": ["{topic}", "programming"],
            "type": "coding",
            "testCases": [
                {{"input": "input1", "output": "output1"}},
                {{"input": "input2", "output": "output2"}}
            ],
            "canonicalSolution": "Solution code",
            "explanation": "Solution explanation"
        }}
        """
        
        logger.info(f"🤖 Generating REAL AI coding question: {topic} ({difficulty})")
        response = self.model.generate_content(prompt)
        content = response.text.strip()
        
        # Clean response
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        
        question_data = json.loads(content.strip())
        question_data["type"] = "coding"
        logger.info(f"✅ REAL AI coding question: {question_data['title']}")
        
        return {
            "success": True,
            "data": question_data,
            "source": "ai"
        }
    
    def _generate_demo_mcq(self, topic: str, difficulty: str) -> Dict[str, Any]:
        """Generate DEMO MCQ - Fallback with diverse topics"""
        logger.info(f"🎭 Generating DEMO MCQ: {topic} ({difficulty})")
        
        demo_mcqs = {
            # IT & PROGRAMMING
            "python": [
                {
                    "title": "Python List Comprehension",
                    "description": "What is the output of: [x**2 for x in range(5) if x % 2 == 0]",
                    "difficulty": difficulty,
                    "skillTags": [topic, "python", "programming"],
                    "type": "mcq",
                    "options": {
                        "A": "[0, 4, 16]",
                        "B": "[0, 1, 4, 9, 16]",
                        "C": "[4, 16]",
                        "D": "[0, 2, 4]"
                    },
                    "correctAnswer": "A",
                    "explanation": "The list comprehension filters even numbers (0, 2, 4) and squares them, resulting in [0, 4, 16]."
                }
            ],
            "javascript": [
                {
                    "title": "JavaScript Async/Await",
                    "description": "What does async/await primarily help with in JavaScript?",
                    "difficulty": difficulty,
                    "skillTags": [topic, "javascript", "programming"],
                    "type": "mcq",
                    "options": {
                        "A": "Handling asynchronous operations in a synchronous-looking manner",
                        "B": "Making code run faster",
                        "C": "Creating multiple threads",
                        "D": "Compiling JavaScript to machine code"
                    },
                    "correctAnswer": "A",
                    "explanation": "Async/await is syntactic sugar over Promises, making asynchronous code look and behave more like synchronous code."
                }
            ],
            
            # HEALTHCARE
            "nursing": [
                {
                    "title": "Vital Signs Assessment",
                    "description": "What is the normal resting heart rate range for adults?",
                    "difficulty": difficulty,
                    "skillTags": [topic, "healthcare", "vital-signs"],
                    "type": "mcq",
                    "options": {
                        "A": "60-100 beats per minute",
                        "B": "40-60 beats per minute",
                        "C": "100-120 beats per minute",
                        "D": "80-140 beats per minute"
                    },
                    "correctAnswer": "A",
                    "explanation": "The normal resting heart rate for adults ranges from 60 to 100 beats per minute. Athletes may have lower rates."
                }
            ],
            "medicine": [
                {
                    "title": "Medication Administration",
                    "description": "Which route provides the fastest drug absorption?",
                    "difficulty": difficulty,
                    "skillTags": [topic, "healthcare", "pharmacology"],
                    "type": "mcq",
                    "options": {
                        "A": "Intravenous (IV)",
                        "B": "Oral",
                        "C": "Intramuscular (IM)",
                        "D": "Subcutaneous"
                    },
                    "correctAnswer": "A",
                    "explanation": "Intravenous administration delivers medication directly into the bloodstream, providing immediate effect."
                }
            ],
            
            # BUSINESS & MARKETING
            "marketing": [
                {
                    "title": "Digital Marketing Metrics",
                    "description": "What does CTR stand for in digital marketing?",
                    "difficulty": difficulty,
                    "skillTags": [topic, "business", "digital-marketing"],
                    "type": "mcq",
                    "options": {
                        "A": "Click-Through Rate",
                        "B": "Customer Transaction Rate",
                        "C": "Content Transfer Rate",
                        "D": "Conversion Tracking Ratio"
                    },
                    "correctAnswer": "A",
                    "explanation": "CTR (Click-Through Rate) measures the percentage of people who click on a link compared to total viewers."
                }
            ],
            "sales": [
                {
                    "title": "Sales Funnel Stages",
                    "description": "Which stage comes first in a typical sales funnel?",
                    "difficulty": difficulty,
                    "skillTags": [topic, "business", "sales-process"],
                    "type": "mcq",
                    "options": {
                        "A": "Awareness",
                        "B": "Decision",
                        "C": "Purchase",
                        "D": "Loyalty"
                    },
                    "correctAnswer": "A",
                    "explanation": "Awareness is the first stage where potential customers become aware of your product or service."
                }
            ],
            
            # FINANCE & ACCOUNTING
            "accounting": [
                {
                    "title": "Financial Statement Analysis",
                    "description": "Which financial statement shows a company's profitability over a period?",
                    "difficulty": difficulty,
                    "skillTags": [topic, "finance", "accounting"],
                    "type": "mcq",
                    "options": {
                        "A": "Income Statement",
                        "B": "Balance Sheet",
                        "C": "Cash Flow Statement",
                        "D": "Statement of Retained Earnings"
                    },
                    "correctAnswer": "A",
                    "explanation": "The Income Statement (Profit & Loss) shows revenues, expenses, and net profit/loss over a specific period."
                }
            ],
            
            # CUSTOMER SERVICE
            "customer-service": [
                {
                    "title": "Conflict Resolution",
                    "description": "What is the first step in handling an angry customer?",
                    "difficulty": difficulty,
                    "skillTags": [topic, "soft-skills", "communication"],
                    "type": "mcq",
                    "options": {
                        "A": "Listen actively and acknowledge their concerns",
                        "B": "Immediately offer a refund",
                        "C": "Defend company policy",
                        "D": "Transfer to a manager"
                    },
                    "correctAnswer": "A",
                    "explanation": "Active listening and acknowledging concerns helps de-escalate the situation and shows empathy."
                }
            ],
            
            # HR & MANAGEMENT
            "human-resources": [
                {
                    "title": "Recruitment Best Practices",
                    "description": "What is the primary purpose of a structured interview?",
                    "difficulty": difficulty,
                    "skillTags": [topic, "hr", "recruitment"],
                    "type": "mcq",
                    "options": {
                        "A": "Ensure fair and consistent candidate evaluation",
                        "B": "Make interviews shorter",
                        "C": "Reduce hiring costs",
                        "D": "Eliminate the need for reference checks"
                    },
                    "correctAnswer": "A",
                    "explanation": "Structured interviews use standardized questions to ensure all candidates are evaluated fairly and consistently."
                }
            ],
            
            # EDUCATION
            "teaching": [
                {
                    "title": "Classroom Management",
                    "description": "Which teaching strategy promotes student engagement most effectively?",
                    "difficulty": difficulty,
                    "skillTags": [topic, "education", "pedagogy"],
                    "type": "mcq",
                    "options": {
                        "A": "Active learning with hands-on activities",
                        "B": "Lecture-only format",
                        "C": "Silent reading time",
                        "D": "Standardized testing"
                    },
                    "correctAnswer": "A",
                    "explanation": "Active learning engages students directly in the learning process, improving retention and understanding."
                }
            ],
            
            # GENERAL/DEFAULT
            "general": [
                {
                    "title": "Professional Communication",
                    "description": "What is the most important aspect of professional email communication?",
                    "difficulty": difficulty,
                    "skillTags": ["communication", "professional-skills"],
                    "type": "mcq",
                    "options": {
                        "A": "Clear and concise messaging",
                        "B": "Using complex vocabulary",
                        "C": "Long detailed paragraphs",
                        "D": "Casual informal tone"
                    },
                    "correctAnswer": "A",
                    "explanation": "Clear and concise communication ensures your message is understood quickly and professionally."
                }
            ]
        }
        
        # Get questions for the topic, or use general questions as fallback
        questions = demo_mcqs.get(topic.lower(), demo_mcqs.get("general", demo_mcqs["general"]))
        question = random.choice(questions)
        
        return {
            "success": True,
            "data": question,
            "source": "demo"
        }
    
    def _generate_demo_coding(self, topic: str, difficulty: str) -> Dict[str, Any]:
        """Generate DEMO coding question"""
        logger.info(f"🎭 Generating DEMO coding question: {topic} ({difficulty})")
        
        demo_questions = {
            "python": [
                {
                    "title": "Count Vowels in String",
                    "problemStatement": "Write a Python function that counts vowels in a string.",
                    "difficulty": difficulty,
                    "skillTags": [topic, "python", "strings"],
                    "type": "coding",
                    "testCases": [
                        {"input": "\"hello\"", "output": "2"},
                        {"input": "\"python\"", "output": "1"}
                    ],
                    "canonicalSolution": "def count_vowels(s):\n    return sum(1 for c in s if c in 'aeiouAEIOU')",
                    "explanation": "Count characters that are vowels."
                }
            ],
            "javascript": [
                {
                    "title": "Reverse String",
                    "problemStatement": "Write a function to reverse a string.",
                    "difficulty": difficulty,
                    "skillTags": [topic, "javascript", "strings"],
                    "type": "coding",
                    "testCases": [
                        {"input": "\"hello\"", "output": "\"olleh\""},
                        {"input": "\"world\"", "output": "\"dlrow\""}
                    ],
                    "canonicalSolution": "function reverseString(str) {\n    return str.split('').reverse().join('');\n}",
                    "explanation": "Split string into array, reverse it, and join back."
                }
            ]
        }
        
        questions = demo_questions.get(topic.lower(), demo_questions["python"])
        question = random.choice(questions)
        
        return {
            "success": True,
            "data": question,
            "source": "demo"
        }
    
    def generate_batch(self, topics: List[str], difficulty: str = "medium", 
                      question_type: str = "mcq", count_per_topic: int = 5) -> Dict[str, Any]:
        """
        Generate multiple questions in batch
        
        Args:
            topics: List of topics ["python", "nursing", "marketing", etc.]
            difficulty: "easy", "medium", "hard"
            question_type: "coding" or "mcq"
            count_per_topic: Number of questions per topic
        """
        questions = []
        failed = 0
        
        for topic in topics:
            logger.info(f"📦 Batch generating {count_per_topic} {question_type} questions for: {topic}")
            for i in range(count_per_topic):
                try:
                    result = self.generate_question(topic, difficulty, question_type)
                    if result["success"]:
                        questions.append(result["data"])
                    else:
                        failed += 1
                except Exception as e:
                    logger.error(f"Failed to generate question {i+1} for {topic}: {e}")
                    failed += 1
        
        return {
            "success": True,
            "generated_count": len(questions),
            "failed_count": failed,
            "questions": questions,
            "type": question_type
        }

# Singleton instance
gemini_ai_service = GeminiAIService()