from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import random
import json
from typing import List, Dict, Any

# ⭐⭐⭐ IMPORTS GEMINI AVEC GESTION D'ERREURS ⭐⭐⭐
try:
    from app.gemini_service import gemini_ai_service
    GEMINI_AVAILABLE = True
    print("✅ Gemini AI service loaded successfully")
except ImportError as e:
    print(f"⚠️ Gemini AI service not available: {e}")
    GEMINI_AVAILABLE = False
    # Créer un service mock pour les tests
    class MockGeminiService:
        def generate_question(self, topic, difficulty):
            return {
                "success": False, 
                "error": "Gemini service not available",
                "data": None
            }
    gemini_ai_service = MockGeminiService()

# ⭐⭐⭐ IMPORTS WEB SCRAPING AVEC GESTION D'ERREURS ⭐⭐⭐
import sys
import os

# Ajouter le chemin courant pour les imports
sys.path.append(os.path.dirname(__file__))

try:
    from crawler.web_scraping_service import web_scraping_service
    from crawler.corpus_manager import CorpusManager
    SCRAPING_AVAILABLE = True
    print("✅ Web scraping module loaded successfully")
except ImportError as e:
    print(f"⚠️ Web scraping module not available: {e}")
    SCRAPING_AVAILABLE = False
    # Créer des mocks pour éviter les erreurs
    class MockWebScrapingService:
        def get_scraping_status(self):
            return {"error": "Web scraping not available", "available": False}
        def get_scraped_problems(self, **kwargs):
            return {"problems": [], "pagination": {"total": 0, "limit": 50, "offset": 0, "has_more": False}}
        def get_detailed_stats(self):
            return {"error": "Web scraping not available"}
        async def run_scraping_job(self, **kwargs):
            return {"success": False, "error": "Web scraping not available"}
        def mark_problems_processed(self, hashes):
            pass
        def search_scraped_problems(self, *args):
            return []
        def update_problem_status(self, *args):
            pass
    web_scraping_service = MockWebScrapingService()
    CorpusManager = None

app = FastAPI(
    title="Hiralent AI Engine", 
    version="1.0.0",
    description="AI-powered question generation service for Hiralent platform"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enhanced mock data with multiple languages
MOCK_QUESTIONS = {
    "python": [
        {
            "title": "Reverse a String",
            "problemStatement": "Write a function that takes a string as input and returns the reversed version of that string.",
            "difficulty": "easy",
            "skillTags": ["python", "strings", "algorithms"],
            "testCases": [
                {"input": "hello", "output": "olleh"},
                {"input": "world", "output": "dlrow"},
                {"input": "python", "output": "nohtyp"}
            ],
            "canonicalSolution": "def reverse_string(s):\n    return s[::-1]",
            "explanation": "Use Python slicing to reverse the string efficiently."
        },
        {
            "title": "Find Maximum Number in List",
            "problemStatement": "Write a function that finds the maximum number in a list of numbers.",
            "difficulty": "easy", 
            "skillTags": ["python", "lists", "algorithms"],
            "testCases": [
                {"input": "[1, 5, 3, 9, 2]", "output": "9"},
                {"input": "[-1, -5, -3]", "output": "-1"},
                {"input": "[42]", "output": "42"}
            ],
            "canonicalSolution": "def find_max(numbers):\n    return max(numbers)",
            "explanation": "Use the built-in max function to find the maximum value."
        }
    ],
    "javascript": [
        {
            "title": "Array Sum Calculation",
            "problemStatement": "Write a function that calculates the sum of all numbers in an array.",
            "difficulty": "easy",
            "skillTags": ["javascript", "arrays", "functions"],
            "testCases": [
                {"input": "[1, 2, 3, 4, 5]", "output": "15"},
                {"input": "[-1, 0, 1]", "output": "0"},
                {"input": "[10]", "output": "10"}
            ],
            "canonicalSolution": "function sumArray(arr) {\n    return arr.reduce((a, b) => a + b, 0);\n}",
            "explanation": "Use the reduce method to accumulate the sum of array elements."
        }
    ],
    "c#": [
        {
            "title": "Reverse a String in C#",
            "problemStatement": "Write a method that takes a string as input and returns the reversed version of that string.",
            "difficulty": "easy",
            "skillTags": ["c#", "strings", "algorithms"],
            "testCases": [
                {"input": "hello", "output": "olleh"},
                {"input": "world", "output": "dlrow"},
                {"input": "csharp", "output": "prahsc"}
            ],
            "canonicalSolution": "public static string ReverseString(string input)\n{\n    char[] charArray = input.ToCharArray();\n    Array.Reverse(charArray);\n    return new string(charArray);\n}",
            "explanation": "Convert string to char array, reverse it, and convert back to string."
        },
        {
            "title": "Find Maximum Number in Array",
            "problemStatement": "Write a method that finds the maximum number in an array of integers.",
            "difficulty": "easy",
            "skillTags": ["c#", "arrays", "algorithms"],
            "testCases": [
                {"input": "[1, 5, 3, 9, 2]", "output": "9"},
                {"input": "[-1, -5, -3]", "output": "-1"},
                {"input": "[42]", "output": "42"}
            ],
            "canonicalSolution": "public static int FindMax(int[] numbers)\n{\n    return numbers.Max();\n}",
            "explanation": "Use LINQ's Max() method to find the maximum value."
        }
    ],
    "java": [
        {
            "title": "Reverse a String in Java",
            "problemStatement": "Write a method that takes a String as input and returns the reversed version of that string.",
            "difficulty": "easy",
            "skillTags": ["java", "strings", "algorithms"],
            "testCases": [
                {"input": "hello", "output": "olleh"},
                {"input": "world", "output": "dlrow"},
                {"input": "java", "output": "avaj"}
            ],
            "canonicalSolution": "public static String reverseString(String input) {\n    return new StringBuilder(input).reverse().toString();\n}",
            "explanation": "Use StringBuilder's reverse() method to reverse the string."
        }
    ],
    "sql": [
        {
            "title": "Count Users in Database",
            "problemStatement": "Write a SQL query to count all users in the database.",
            "difficulty": "easy",
            "skillTags": ["sql", "aggregation", "queries"],
            "testCases": [
                {"input": "Users table with 100 rows", "output": "100"}
            ],
            "canonicalSolution": "SELECT COUNT(*) FROM users;",
            "explanation": "Use COUNT(*) to count all rows in the users table."
        }
    ]
}

# Language mapping for fallback
LANGUAGE_MAPPING = {
    "c#": "csharp",
    "csharp": "c#", 
    "js": "javascript",
    "py": "python",
    "java": "java",
    "sql": "sql"
}

def get_topic_questions(topic: str):
    """Get questions for a topic with intelligent fallback"""
    topic_lower = topic.lower()
    
    # Direct match
    if topic_lower in MOCK_QUESTIONS:
        return MOCK_QUESTIONS[topic_lower]
    
    # Mapped match
    if topic_lower in LANGUAGE_MAPPING:
        mapped_topic = LANGUAGE_MAPPING[topic_lower]
        return MOCK_QUESTIONS.get(mapped_topic, MOCK_QUESTIONS["python"])
    
    # Partial match
    for available_topic in MOCK_QUESTIONS.keys():
        if available_topic in topic_lower or topic_lower in available_topic:
            return MOCK_QUESTIONS[available_topic]
    
    # Default fallback
    return MOCK_QUESTIONS["python"]

@app.get("/")
async def root():
    base_info = {
        "message": "Hiralent AI Question Generator", 
        "status": "running",
        "version": "1.0.0",
        "supported_topics": list(MOCK_QUESTIONS.keys()),
        "services": {
            "gemini_ai": GEMINI_AVAILABLE,
            "web_scraping": SCRAPING_AVAILABLE
        }
    }
    
    return base_info

@app.get("/health")
async def health():
    return {
        "status": "healthy", 
        "service": "AI Question Generator",
        "version": "1.0.0",
        "supported_languages": list(MOCK_QUESTIONS.keys()),
        "services_available": {
            "gemini_ai": GEMINI_AVAILABLE,
            "web_scraping": SCRAPING_AVAILABLE
        }
    }

@app.post("/generate")
async def generate_question(request: Dict[str, Any]):
    """Generate a programming question using AI with fallback"""
    try:
        topic = request.get("topic", "python")
        difficulty = request.get("difficulty", "medium")
        
        print(f"🎯 Generating question for topic: {topic}, difficulty: {difficulty}")
        
        # Essayer AI generation si disponible
        if GEMINI_AVAILABLE:
            ai_result = gemini_ai_service.generate_question(topic, difficulty)
            
            if ai_result["success"]:
                print(f"✅ AI question generated successfully: {ai_result['data']['title']}")
                return {
                    "success": True,
                    "question": ai_result["data"],
                    "metadata": {
                        "topic": topic,
                        "difficulty": difficulty,
                        "source": "gemini_ai",
                        "ai_enabled": True,
                        "generation_type": "ai_generated"
                    }
                }
            else:
                print(f"⚠️ AI generation failed: {ai_result.get('error', 'Unknown error')}")
        
        # Fallback to mock data
        print("🔄 Using mock data as fallback")
        questions = get_topic_questions(topic)
        question = random.choice(questions)
        
        return {
            "success": True,
            "question": question,
            "metadata": {
                "topic": topic,
                "difficulty": difficulty,
                "source": "mock_data",
                "ai_enabled": GEMINI_AVAILABLE,
                "ai_error": "Gemini not available or failed" if not GEMINI_AVAILABLE else ai_result.get("error", "Unknown error")
            }
        }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating question: {str(e)}")
    
@app.post("/generate-batch")
async def generate_batch(request: Dict[str, Any]):
    """Generate multiple questions using AI with fallback"""
    try:
        topics = request.get("topics", ["python", "javascript"])
        difficulty = request.get("difficulty", "medium")
        count_per_topic = request.get("countPerTopic", 2)
        
        print(f"🎯 Generating batch: topics={topics}, difficulty={difficulty}, count={count_per_topic}")
        
        questions = []
        
        for topic in topics:
            for i in range(count_per_topic):
                print(f"🤖 Generating question {i+1}/{count_per_topic} for {topic}")
                
                # Essayer AI si disponible
                if GEMINI_AVAILABLE:
                    ai_result = gemini_ai_service.generate_question(topic, difficulty)
                    
                    if ai_result["success"]:
                        questions.append({
                            **ai_result["data"],
                            "topic": topic
                        })
                        print(f"✅ AI question generated: {ai_result['data']['title']}")
                        continue
                    else:
                        print(f"⚠️ AI failed for {topic}: {ai_result.get('error', 'Unknown error')}")
                
                # Fallback to mock
                print(f"🔄 Using mock fallback for {topic}")
                topic_questions = get_topic_questions(topic)
                fallback = random.choice(topic_questions)
                questions.append({
                    **fallback,
                    "topic": topic
                })
        
        return {
            "success": True,
            "generated_count": len(questions),
            "questions": questions,
            "metadata": {
                "topics": topics,
                "difficulty": difficulty,
                "count_per_topic": count_per_topic,
                "source": "gemini_ai" if GEMINI_AVAILABLE else "mock_data"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating batch: {str(e)}")

@app.get("/topics")
async def get_supported_topics():
    """Get list of all supported topics/languages"""
    return {
        "success": True,
        "topics": list(MOCK_QUESTIONS.keys()),
        "count": len(MOCK_QUESTIONS)
    }

# ⭐⭐⭐ ROUTES WEB SCRAPING ⭐⭐⭐

@app.get("/scraping/status")
async def get_scraping_status():
    """Retourne le statut du service de scraping"""
    if not SCRAPING_AVAILABLE:
        return {"error": "Web scraping module not available", "available": False}
    
    return web_scraping_service.get_scraping_status()

@app.post("/scraping/start")
async def start_scraping_job(request: dict = None):
    """
    Démarre un job de scraping
    Body: {"sources": ["stackoverflow"], "max_pages": 3}
    """
    if not SCRAPING_AVAILABLE:
        raise HTTPException(status_code=503, detail="Web scraping module not available")
    
    sources = request.get("sources", ["stackoverflow"]) if request else ["stackoverflow"]
    max_pages = request.get("max_pages", 3) if request else 3
    
    # Lancer le job de façon asynchrone
    result = await web_scraping_service.run_scraping_job(sources=sources, max_pages=max_pages)
    return result

@app.get("/scraping/problems")
async def get_scraped_problems(
    limit: int = 50,
    offset: int = 0,
    language: str = None,
    source: str = None,
    status: str = None
):
    """Récupère les problèmes scrapés avec filtres"""
    if not SCRAPING_AVAILABLE:
        return {"problems": [], "pagination": {"total": 0, "limit": limit, "offset": offset, "has_more": False}}
    
    return web_scraping_service.get_scraped_problems(
        limit=limit,
        offset=offset,
        language=language,
        source=source,
        status=status
    )

@app.get("/scraping/stats/detailed")
async def get_detailed_scraping_stats():
    """Retourne des statistiques détaillées sur le scraping"""
    if not SCRAPING_AVAILABLE:
        return {"error": "Web scraping module not available"}
    
    return web_scraping_service.get_detailed_stats()

@app.post("/scraping/problems/mark-processed")
async def mark_problems_processed(request: dict):
    """Marque des problèmes comme traités"""
    if not SCRAPING_AVAILABLE:
        raise HTTPException(status_code=503, detail="Web scraping module not available")
    
    content_hashes = request.get("content_hashes", [])
    web_scraping_service.mark_problems_processed(content_hashes)
    return {"success": True, "marked_count": len(content_hashes)}

@app.get("/scraping/search")
async def search_scraped_problems(q: str, language: str = None, source: str = None):
    """Recherche dans les problèmes scrapés"""
    if not SCRAPING_AVAILABLE:
        return {"query": q, "results": [], "count": 0}
    
    results = web_scraping_service.search_scraped_problems(q, language, source)
    return {"query": q, "results": results, "count": len(results)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)