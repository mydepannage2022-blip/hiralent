from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import random
import json
from typing import List, Dict, Any
from gemini_service import gemini_ai_service

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
    return {
        "message": "Hiralent AI Question Generator", 
        "status": "running",
        "version": "1.0.0",
        "supported_topics": list(MOCK_QUESTIONS.keys())
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy", 
        "service": "AI Question Generator",
        "version": "1.0.0",
        "supported_languages": list(MOCK_QUESTIONS.keys())
    }

@app.post("/generate")
async def generate_question(request: Dict[str, Any]):
    """Generate a programming question using AI with fallback"""
    try:
        topic = request.get("topic", "python")
        difficulty = request.get("difficulty", "medium")
        
        print(f"🎯 Generating AI question for topic: {topic}, difficulty: {difficulty}")
        
        # Try AI generation first
        ai_result = gemini_ai_service.generate_question(topic, difficulty)
        
        if ai_result["success"]:
            print(f"✅ AI question generated successfully: {ai_result['data']['title']}")
            return {
                "success": True,
                "question": ai_result["data"],
                "metadata": {
                    "topic": topic,
                    "difficulty": difficulty,
                    "source": "gemini_ai",  # ← VRAIE AI !
                    "ai_enabled": True,
                    "generation_type": "ai_generated"
                }
            }
        else:
            print(f"⚠️ AI generation failed, using mock data: {ai_result['error']}")
            # Fallback to mock data
            questions = get_topic_questions(topic)
            question = random.choice(questions)
            
            return {
                "success": True,
                "question": question,
                "metadata": {
                    "topic": topic,
                    "difficulty": difficulty,
                    "source": "mock_fallback",
                    "ai_enabled": False,
                    "ai_error": ai_result.get("error", "Unknown AI error")
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
        
        print(f"🎯 Generating AI batch: topics={topics}, difficulty={difficulty}, count={count_per_topic}")
        
        questions = []
        
        for topic in topics:
            for i in range(count_per_topic):
                print(f"🤖 Generating question {i+1}/{count_per_topic} for {topic}")
                
                # ✅ UTILISER L'AI pour chaque question
                ai_result = gemini_ai_service.generate_question(topic, difficulty)
                
                if ai_result["success"]:
                    questions.append({
                        **ai_result["data"],
                        "topic": topic
                    })
                    print(f"✅ AI question generated: {ai_result['data']['title']}")
                else:
                    # Fallback to mock only if AI fails
                    print(f"⚠️ AI failed for {topic}, using fallback")
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
                "source": "gemini_ai"  # ← Changé de "mock" à "gemini_ai"
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)