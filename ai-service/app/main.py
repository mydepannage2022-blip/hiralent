from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import random
import json
from typing import List, Dict, Any, Optional
import sys
import os
import asyncio
import time
import logging
from datetime import datetime
import requests
from bs4 import BeautifulSoup
import abc
from urllib.robotparser import RobotFileParser

print("🚀 Starting Hiralent AI Service...")

# =============================================================================
# GEMINI AI SERVICE IMPORT
# =============================================================================
GEMINI_AVAILABLE = False
gemini_ai_service = None

try:
    # Essayer l'import direct
    sys.path.append(os.path.dirname(__file__))
    from gemini_service import gemini_ai_service
    GEMINI_AVAILABLE = True
    print("✅ Gemini AI Service initialized with REAL AI")
    print("✅ Gemini AI service loaded successfully")
except ImportError as e:
    print(f"⚠️ Gemini AI service not available: {e}")
    # Mock service
    class MockGeminiService:
        def generate_question(self, topic, difficulty):
            return {"success": False, "error": "Gemini not available", "data": None}
    gemini_ai_service = MockGeminiService()

# =============================================================================
# BASE SPIDER (Integrated to avoid import issues)
# =============================================================================
class BaseSpider(abc.ABC):
    """
    Classe de base pour tous les spiders de web scraping.
    Gère le respect de robots.txt, rate limiting, et structure commune.
    """
    
    def __init__(self, name: str, base_url: str):
        self.name = name
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        self.robots_parser = RobotFileParser()
        self.robots_parser.set_url(f"{base_url}/robots.txt")
        try:
            self.robots_parser.read()
            print(f"✅ Robots.txt loaded for {base_url}")
        except Exception as e:
            print(f"⚠️ Could not read robots.txt for {base_url}: {e}")
    
    def can_fetch(self, url: str) -> bool:
        """Vérifie si le scraping est autorisé par robots.txt"""
        try:
            return self.robots_parser.can_fetch('*', url)
        except Exception as e:
            print(f"⚠️ Robots check failed for {url}: {e}")
            return True  # Continue si robots.txt inaccessible
    
    @abc.abstractmethod
    def extract_problems(self, html: str) -> List[Dict]:
        """
        Extrait les problèmes du HTML - À IMPLÉMENTER par chaque spider
        Retourne: Liste de dictionnaires avec les problèmes
        """
        pass
    
    @abc.abstractmethod
    def get_next_page(self, soup: BeautifulSoup) -> Optional[str]:
        """
        Trouve la page suivante - À IMPLÉMENTER par chaque spider
        Retourne: URL de la page suivante ou None
        """
        pass
    
    def crawl(self, max_pages: int = 3) -> List[Dict]:
        """
        Exécute le crawling avec pagination et respect des limites
        """
        problems = []
        
        # Vérifier si start_urls existe
        if not hasattr(self, 'start_urls') or not self.start_urls:
            print(f"❌ No start_urls defined for {self.name}")
            return problems
            
        current_url = self.start_urls[0]
        pages_crawled = 0
        
        print(f"🚀 Starting {self.name} spider with max {max_pages} pages")
        
        while current_url and pages_crawled < max_pages:
            if not self.can_fetch(current_url):
                print(f"⛔ Skipping {current_url} - disallowed by robots.txt")
                break
            
            try:
                print(f"📥 Crawling page {pages_crawled + 1}: {current_url}")
                response = self.session.get(current_url, timeout=15)
                response.raise_for_status()
                
                # Extraire les problèmes de cette page
                soup = BeautifulSoup(response.text, 'html.parser')
                page_problems = self.extract_problems(response.text)
                problems.extend(page_problems)
                
                print(f"✅ Extracted {len(page_problems)} problems from {current_url}")
                
                # Passer à la page suivante
                current_url = self.get_next_page(soup)
                pages_crawled += 1
                
                # Respecter le rate limiting
                time.sleep(2)  # 2 secondes entre les requêtes
                
            except requests.RequestException as e:
                print(f"❌ Network error crawling {current_url}: {e}")
                break
            except Exception as e:
                print(f"❌ Error processing {current_url}: {e}")
                break
        
        print(f"🎉 {self.name} spider finished: {len(problems)} problems collected")
        return problems
    
    def health_check(self) -> Dict[str, any]:
        """Vérifie que le spider peut accéder à sa source"""
        try:
            if not hasattr(self, 'start_urls') or not self.start_urls:
                return {"status": "error", "error": "No start_urls defined"}
                
            test_url = self.start_urls[0]
            response = self.session.get(test_url, timeout=10)
            return {
                "status": "healthy" if response.status_code == 200 else "unhealthy",
                "status_code": response.status_code,
                "base_url": self.base_url
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "base_url": self.base_url
            }

# =============================================================================
# STACKOVERFLOW SPIDER (Integrated to avoid import issues)
# =============================================================================
class StackOverflowSpider(BaseSpider):
    """
    Spider pour extraire des problèmes de programmation de Stack Overflow.
    Version simplifiée pour éviter les problèmes de parsing HTML complexe.
    """
    
    def __init__(self):
        super().__init__("stackoverflow", "https://stackoverflow.com")
        self.start_urls = [
            "https://stackoverflow.com/questions/tagged/python?sort=votes&pagesize=15",
            "https://stackoverflow.com/questions/tagged/javascript?sort=votes&pagesize=15", 
        ]
    
    def extract_problems(self, html: str) -> List[Dict]:
        """
        Extrait les problèmes de programmation de la page HTML de Stack Overflow
        Version simplifiée qui retourne des données de test
        """
        print("🔍 Extracting problems from StackOverflow (simplified mode)")
        
        # Pour l'instant, retourner des données de test
        # Dans une vraie implémentation, on parserait le HTML ici
        test_problems = [
            {
                'source': 'stackoverflow',
                'title': 'How to debug Python code effectively?',
                'content': 'Learn best practices for debugging Python applications with pdb and other tools.',
                'full_question_url': 'https://stackoverflow.com/questions/4929251/how-to-debug-python-code-effectively',
                'tags': ['python', 'debugging', 'pdb'],
                'votes': 150,
                'answers': 12,
                'language': 'python',
                'difficulty': 'medium',
                'problem_type': 'debugging'
            },
            {
                'source': 'stackoverflow', 
                'title': 'JavaScript array methods explained',
                'content': 'Comprehensive guide to JavaScript array methods like map, filter, and reduce.',
                'full_question_url': 'https://stackoverflow.com/questions/1234567/javascript-array-methods-explained',
                'tags': ['javascript', 'arrays', 'methods'],
                'votes': 89,
                'answers': 8,
                'language': 'javascript',
                'difficulty': 'easy',
                'problem_type': 'tutorial'
            },
            {
                'source': 'stackoverflow',
                'title': 'Understanding Python list comprehensions',
                'content': 'Detailed explanation of Python list comprehensions with examples.',
                'full_question_url': 'https://stackoverflow.com/questions/2349991/understanding-python-list-comprehensions',
                'tags': ['python', 'list-comprehension', 'syntax'],
                'votes': 234,
                'answers': 15,
                'language': 'python',
                'difficulty': 'easy',
                'problem_type': 'syntax'
            }
        ]
        
        print(f"✅ Generated {len(test_problems)} test problems from StackOverflow")
        return test_problems
    
    def get_next_page(self, soup: BeautifulSoup) -> Optional[str]:
        """Trouve le lien vers la page suivante - désactivé pour le test"""
        return None

# =============================================================================
# CONTENT PROCESSOR AND CORPUS MANAGER
# =============================================================================
class ContentProcessor:
    """Process and enrich scraped content"""
    def process_content(self, data):
        import hashlib
        data['content_hash'] = hashlib.md5(data['title'].encode()).hexdigest()
        data['technical_features'] = {
            'has_code_snippet': True,
            'has_error_message': 'error' in data['title'].lower(),
            'problem_type': 'debugging' if 'debug' in data['title'].lower() else 'implementation',
            'estimated_complexity': 'medium'
        }
        data['processed_at'] = datetime.now().isoformat()
        return data

class CorpusManager:
    """Manage the corpus of scraped problems"""
    def __init__(self):
        self.problems = []
        
    def save_scraped_problems(self, problems):
        self.problems.extend(problems)
        print(f"📦 Saved {len(problems)} problems to corpus")
        return len(problems)
        
    def get_unprocessed_problems(self, **kwargs):
        limit = kwargs.get('limit', 50)
        return self.problems[:limit]
        
    def get_corpus_stats(self):
        languages = {}
        sources = {}
        
        for problem in self.problems:
            lang = problem.get('language', 'unknown')
            source = problem.get('source', 'unknown')
            languages[lang] = languages.get(lang, 0) + 1
            sources[source] = sources.get(source, 0) + 1
            
        return {
            "total_problems": len(self.problems),
            "unprocessed": len(self.problems),
            "by_source": sources,
            "by_language": languages,
            "mode": "real"
        }
        
    def mark_as_processed(self, content_hash):
        # In a real implementation, we would mark problems as processed
        # For now, we'll just log it
        print(f"✅ Marked problem {content_hash} as processed")
        
    def search_problems(self, query, language=None, source=None):
        results = [p for p in self.problems if query.lower() in p['title'].lower()]
        if language:
            results = [p for p in results if p.get('language') == language]
        if source:
            results = [p for p in results if p.get('source') == source]
        return results

# =============================================================================
# WEB SCRAPING SERVICE  
# =============================================================================
SCRAPING_AVAILABLE = False
web_scraping_service = None

class WebScrapingService:
    """
    Main service that orchestrates the entire web scraping process
    """
    
    def __init__(self):
        self.spiders = []
        self.processor = None
        self.corpus_manager = None
        self.is_running = False
        
        # Initialize components
        self._initialize_components()
        
    def _initialize_components(self):
        """Initialize web scraping components"""
        try:
            # Initialize real components - now they're in the same file
            self.spiders = [StackOverflowSpider()]
            self.processor = ContentProcessor()
            self.corpus_manager = CorpusManager()
            
            print("✅ All web scraping components initialized successfully")
            
        except Exception as e:
            print(f"❌ Failed to initialize web scraping components: {e}")
            print("🔄 Using test data mode for web scraping")
            self._create_test_components()
    
    def _create_test_components(self):
        """Create test components when real ones are unavailable"""
        class TestSpider:
            def __init__(self): 
                self.name = "stackoverflow"
            def crawl(self, **kwargs): 
                # Return test data
                return [
                    {
                        'source': 'stackoverflow',
                        'title': 'Test: Python Debugging Issue',
                        'content': 'Test content for web scraping pipeline validation',
                        'full_question_url': 'https://stackoverflow.com/questions/test1',
                        'tags': ['python', 'debugging', 'test'],
                        'votes': 100,
                        'answers': 10,
                        'language': 'python',
                        'difficulty': 'medium'
                    },
                    {
                        'source': 'stackoverflow',
                        'title': 'Test: JavaScript Array Methods',
                        'content': 'Testing JavaScript array manipulation techniques',
                        'full_question_url': 'https://stackoverflow.com/questions/test2', 
                        'tags': ['javascript', 'arrays', 'methods'],
                        'votes': 75,
                        'answers': 8,
                        'language': 'javascript',
                        'difficulty': 'easy'
                    }
                ]
            def health_check(self): 
                return {"status": "healthy", "mode": "test"}
        
        class TestProcessor:
            def process_content(self, data): 
                # Add processing metadata
                import hashlib
                data['content_hash'] = hashlib.md5(data['title'].encode()).hexdigest()
                data['technical_features'] = {
                    'has_code_snippet': True,
                    'has_error_message': 'error' in data['title'].lower(),
                    'problem_type': 'debugging' if 'debug' in data['title'].lower() else 'implementation',
                    'estimated_complexity': 'medium'
                }
                return data
                
        class TestCorpusManager:
            def __init__(self):
                self.test_problems = []
                
            def save_scraped_problems(self, problems): 
                self.test_problems.extend(problems)
                print(f"📦 Saved {len(problems)} test problems to corpus")
                return len(problems)
                
            def get_unprocessed_problems(self, **kwargs): 
                limit = kwargs.get('limit', 50)
                return self.test_problems[:limit]
                
            def get_corpus_stats(self): 
                return {
                    "total_problems": len(self.test_problems),
                    "unprocessed": len(self.test_problems),
                    "by_source": {"stackoverflow": len(self.test_problems)},
                    "by_language": {"python": 1, "javascript": 1},
                    "mode": "test"
                }
                
            def mark_as_processed(self, content_hash): 
                print(f"✅ Marked problem {content_hash} as processed")
                
            def search_problems(self, query, language=None, source=None): 
                results = [p for p in self.test_problems if query.lower() in p['title'].lower()]
                if language:
                    results = [p for p in results if p.get('language') == language]
                return results
    
        self.spiders = [TestSpider()]
        self.processor = TestProcessor()
        self.corpus_manager = TestCorpusManager()
    
    async def run_scraping_job(self, sources: List[str] = None, max_pages: int = 3) -> Dict[str, any]:
        """
        Execute a complete scraping job
        """
        if self.is_running:
            return {"success": False, "error": "Scraping job already running"}
        
        self.is_running = True
        start_time = time.time()
        
        try:
            print(f"🚀 Starting scraping job for sources: {sources}")
            
            all_problems = []
            spider_results = {}
            
            # Execute spiders
            for spider in self.spiders:
                if sources and spider.name not in sources:
                    print(f"⏭️ Skipping {spider.name} - not in requested sources")
                    continue
                    
                try:
                    print(f"🕷️ Running {spider.name} spider...")
                    problems = spider.crawl(max_pages=max_pages)
                    processed_problems = []
                    
                    # Process content
                    for problem in problems:
                        processed = self.processor.process_content(problem)
                        processed_problems.append(processed)
                    
                    # Save to corpus
                    saved_count = self.corpus_manager.save_scraped_problems(processed_problems)
                    
                    spider_results[spider.name] = {
                        "collected": len(problems),
                        "saved": saved_count,
                        "status": "success"
                    }
                    
                    all_problems.extend(processed_problems)
                    print(f"✅ {spider.name}: {saved_count} problems saved")
                    
                except Exception as e:
                    print(f"❌ Error in {spider.name}: {e}")
                    spider_results[spider.name] = {
                        "collected": 0,
                        "saved": 0,
                        "status": "error",
                        "error": str(e)
                    }
            
            # Final statistics
            execution_time = round(time.time() - start_time, 2)
            corpus_stats = self.corpus_manager.get_corpus_stats()
            
            result = {
                "success": True,
                "execution_time_seconds": execution_time,
                "total_collected": len(all_problems),
                "spider_results": spider_results,
                "corpus_stats": corpus_stats,
                "timestamp": datetime.now().isoformat(),
                "mode": "real"
            }
            
            print(f"🎉 Scraping job completed in {execution_time}s")
            return result
            
        except Exception as e:
            print(f"❌ Scraping job failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "execution_time_seconds": round(time.time() - start_time, 2)
            }
        finally:
            self.is_running = False
    
    def get_scraping_status(self) -> Dict[str, any]:
        """Get current service status"""
        try:
            corpus_stats = self.corpus_manager.get_corpus_stats()
        except:
            corpus_stats = {"error": "Corpus manager not available"}
        
        return {
            "is_running": self.is_running,
            "corpus_stats": corpus_stats,
            "available_sources": [spider.name for spider in self.spiders],
            "components_loaded": bool(self.processor and self.corpus_manager),
            "mode": "real",
            "last_updated": datetime.now().isoformat()
        }
    
    def get_scraped_problems(self, 
                           limit: int = 50, 
                           offset: int = 0,
                           language: str = None,
                           source: str = None,
                           status: str = None) -> Dict[str, any]:
        """Get scraped problems with filters"""
        try:
            problems = self.corpus_manager.get_unprocessed_problems(limit=1000)
            
            # Apply filters
            if language and language != 'all':
                problems = [p for p in problems if p.get('language') == language]
                
            if source and source != 'all':
                problems = [p for p in problems if p.get('source') == source]
            
            # Pagination
            total = len(problems)
            paginated_problems = problems[offset:offset + limit]
            
            return {
                "problems": paginated_problems,
                "pagination": {
                    "total": total,
                    "limit": limit,
                    "offset": offset,
                    "has_more": (offset + limit) < total
                },
                "mode": "real"
            }
        except Exception as e:
            print(f"❌ Error getting scraped problems: {e}")
            return {
                "problems": [],
                "pagination": {"total": 0, "limit": limit, "offset": offset, "has_more": False},
                "error": str(e)
            }
    
    def get_detailed_stats(self) -> Dict[str, any]:
        """Get detailed statistics"""
        try:
            corpus_stats = self.corpus_manager.get_corpus_stats()
            return {
                **corpus_stats,
                "service_status": "operational",
                "components_loaded": True,
                "mode": "real"
            }
        except Exception as e:
            return {
                "error": f"Web scraping components not available: {str(e)}",
                "service_status": "degraded", 
                "components_loaded": False
            }
    
    def mark_problems_processed(self, content_hashes: List[str]):
        """Mark problems as processed"""
        try:
            for content_hash in content_hashes:
                self.corpus_manager.mark_as_processed(content_hash)
            print(f"✅ Marked {len(content_hashes)} problems as processed")
        except Exception as e:
            print(f"❌ Error marking problems as processed: {e}")
    
    def search_scraped_problems(self, query: str, language: str = None, source: str = None) -> List[Dict]:
        """Search in scraped problems"""
        try:
            return self.corpus_manager.search_problems(query, language, source)
        except Exception as e:
            print(f"❌ Error searching problems: {e}")
            return []

# Initialize web scraping service
try:
    web_scraping_service = WebScrapingService()
    SCRAPING_AVAILABLE = True
    print("✅ Web scraping service initialized successfully")
except Exception as e:
    print(f"⚠️ Web scraping service not available: {e}")
    # Create mock service
    class MockWebScrapingService:
        def get_scraping_status(self):
            return {"available": False, "error": "Web scraping not loaded", "mode": "mock"}
        def get_scraped_problems(self, **kwargs):
            return {"problems": [], "pagination": {"total": 0, "limit": 50, "offset": 0, "has_more": False}, "mode": "mock"}
        def get_detailed_stats(self):
            return {"error": "Web scraping not available", "mode": "mock"}
        async def run_scraping_job(self, **kwargs):
            return {"success": False, "error": "Web scraping not available", "mode": "mock"}
        def mark_problems_processed(self, hashes):
            return {"success": True, "marked_count": 0, "mode": "mock"}
        def search_scraped_problems(self, *args):
            return []
    
    web_scraping_service = MockWebScrapingService()

# =============================================================================
# FASTAPI APP
# =============================================================================
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

# =============================================================================
# MOCK QUESTIONS DATA
# =============================================================================
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
            "title": "Fibonacci Sequence",
            "problemStatement": "Write a function that returns the nth number in the Fibonacci sequence.",
            "difficulty": "medium",
            "skillTags": ["python", "algorithms", "recursion"],
            "testCases": [
                {"input": "5", "output": "5"},
                {"input": "7", "output": "13"},
                {"input": "10", "output": "55"}
            ],
            "canonicalSolution": "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)",
            "explanation": "Use recursion to calculate Fibonacci numbers."
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
        },
        {
            "title": "Find Maximum Number",
            "problemStatement": "Write a function that finds the maximum number in an array.",
            "difficulty": "easy",
            "skillTags": ["javascript", "arrays", "algorithms"],
            "testCases": [
                {"input": "[1, 5, 2, 9, 3]", "output": "9"},
                {"input": "[-1, -5, -2]", "output": "-1"},
                {"input": "[42]", "output": "42"}
            ],
            "canonicalSolution": "function findMax(arr) {\n    return Math.max(...arr);\n}",
            "explanation": "Use Math.max with spread operator to find the maximum value."
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
        },
        {
            "title": "Factorial Calculation",
            "problemStatement": "Write a method that calculates the factorial of a given number.",
            "difficulty": "medium",
            "skillTags": ["java", "recursion", "mathematics"],
            "testCases": [
                {"input": "5", "output": "120"},
                {"input": "0", "output": "1"},
                {"input": "7", "output": "5040"}
            ],
            "canonicalSolution": "public static int factorial(int n) {\n    if (n == 0) return 1;\n    return n * factorial(n - 1);\n}",
            "explanation": "Use recursion to calculate factorial."
        }
    ],
    "sql": [
        {
            "title": "Find Highest Salary",
            "problemStatement": "Write a SQL query to find the highest salary from the Employees table.",
            "difficulty": "easy",
            "skillTags": ["sql", "aggregation", "queries"],
            "testCases": [
                {"input": "Employees table with salaries: [50000, 60000, 75000]", "output": "75000"},
                {"input": "Employees table with salaries: [30000, 45000]", "output": "45000"}
            ],
            "canonicalSolution": "SELECT MAX(salary) FROM Employees;",
            "explanation": "Use MAX aggregate function to find the highest salary."
        }
    ]
}

LANGUAGE_MAPPING = {
    "c#": "csharp", "csharp": "c#", 
    "js": "javascript", "py": "python",
    "java": "java", "sql": "sql"
}

def get_topic_questions(topic: str):
    """Get questions for a topic with intelligent fallback"""
    topic_lower = topic.lower()
    if topic_lower in MOCK_QUESTIONS:
        return MOCK_QUESTIONS[topic_lower]
    if topic_lower in LANGUAGE_MAPPING:
        mapped_topic = LANGUAGE_MAPPING[topic_lower]
        return MOCK_QUESTIONS.get(mapped_topic, MOCK_QUESTIONS["python"])
    for available_topic in MOCK_QUESTIONS.keys():
        if available_topic in topic_lower or topic_lower in available_topic:
            return MOCK_QUESTIONS[available_topic]
    return MOCK_QUESTIONS["python"]

# =============================================================================
# API ROUTES
# =============================================================================

@app.get("/")
async def root():
    return {
        "message": "Hiralent AI Question Generator", 
        "status": "running",
        "version": "1.0.0",
        "services": {
            "gemini_ai": GEMINI_AVAILABLE,
            "web_scraping": SCRAPING_AVAILABLE
        }
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy", 
        "service": "AI Question Generator",
        "version": "1.0.0",
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
        
        print(f"🎯 Generating question for: {topic}, difficulty: {difficulty}")
        
        # Try AI generation
        if GEMINI_AVAILABLE:
            ai_result = gemini_ai_service.generate_question(topic, difficulty)
            if ai_result["success"]:
                print(f"✅ AI question generated: {ai_result['data']['title']}")
                return {
                    "success": True,
                    "question": ai_result["data"],
                    "metadata": {
                        "topic": topic,
                        "difficulty": difficulty,
                        "source": "gemini_ai",
                        "ai_enabled": True
                    }
                }
            print(f"⚠️ AI generation failed: {ai_result.get('error')}")
        
        # Fallback to mock data
        questions = get_topic_questions(topic)
        question = random.choice(questions)
        
        return {
            "success": True,
            "question": question,
            "metadata": {
                "topic": topic,
                "difficulty": difficulty,
                "source": "mock_data",
                "ai_enabled": GEMINI_AVAILABLE
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
        
        print(f"🎯 Generating batch: {topics}, count: {count_per_topic}")
        
        questions = []
        for topic in topics:
            for i in range(count_per_topic):
                # Try AI first
                if GEMINI_AVAILABLE:
                    ai_result = gemini_ai_service.generate_question(topic, difficulty)
                    if ai_result["success"]:
                        questions.append({**ai_result["data"], "topic": topic})
                        continue
                
                # Fallback to mock
                topic_questions = get_topic_questions(topic)
                fallback = random.choice(topic_questions)
                questions.append({**fallback, "topic": topic})
        
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
    return {
        "success": True,
        "topics": list(MOCK_QUESTIONS.keys()),
        "count": len(MOCK_QUESTIONS)
    }

# =============================================================================
# WEB SCRAPING ROUTES
# =============================================================================

@app.get("/scraping/status")
async def get_scraping_status():
    if not SCRAPING_AVAILABLE:
        return {"error": "Web scraping module not available", "available": False, "mode": "mock"}
    return web_scraping_service.get_scraping_status()

@app.post("/scraping/start")
async def start_scraping_job(request: dict = None):
    if not SCRAPING_AVAILABLE:
        raise HTTPException(status_code=503, detail="Web scraping module not available")
    
    sources = request.get("sources", ["stackoverflow"]) if request else ["stackoverflow"]
    max_pages = request.get("max_pages", 3) if request else 3
    
    result = await web_scraping_service.run_scraping_job(sources=sources, max_pages=max_pages)
    return result

@app.get("/scraping/problems")
async def get_scraped_problems(limit: int = 50, offset: int = 0, language: str = None, source: str = None):
    if not SCRAPING_AVAILABLE:
        return {"problems": [], "pagination": {"total": 0, "limit": limit, "offset": offset, "has_more": False}, "mode": "mock"}
    
    return web_scraping_service.get_scraped_problems(
        limit=limit, offset=offset, language=language, source=source
    )

@app.get("/scraping/stats/detailed")
async def get_detailed_scraping_stats():
    if not SCRAPING_AVAILABLE:
        return {"error": "Web scraping module not available", "mode": "mock"}
    return web_scraping_service.get_detailed_stats()

@app.post("/scraping/problems/mark-processed")
async def mark_problems_processed(request: dict):
    if not SCRAPING_AVAILABLE:
        raise HTTPException(status_code=503, detail="Web scraping module not available")
    
    content_hashes = request.get("content_hashes", [])
    web_scraping_service.mark_problems_processed(content_hashes)
    return {"success": True, "marked_count": len(content_hashes)}

@app.get("/scraping/search")
async def search_scraped_problems(q: str, language: str = None, source: str = None):
    if not SCRAPING_AVAILABLE:
        return {"query": q, "results": [], "count": 0, "mode": "mock"}
    
    results = web_scraping_service.search_scraped_problems(q, language, source)
    return {"query": q, "results": results, "count": len(results)}

# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    print("🌐 Starting FastAPI server on http://0.0.0.0:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)