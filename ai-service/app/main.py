from asyncio.log import logger
import re
from urllib.parse import urljoin
from fastapi import FastAPI, HTTPException, Body, APIRouter, Request,Query
from typing import Optional, Dict, Any
from app.routes import variation_routes
from app.routes.vector_routes import router as vector_router

from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import random
import json
from typing import List, Dict, Any, Optional
import sys
import os
import asyncio
import time
from datetime import datetime
import requests
from bs4 import BeautifulSoup
import abc
from urllib.robotparser import RobotFileParser
# Add this import at the top with other imports
import logging
from typing import List, Dict, Optional, Any
import re
from datetime import datetime
from app.vetting_pipeline.service import VettingPipelineService
from app.crawler.github_spider import GitHubSpider
from app.crawler.hackerrank_spider import HackerRankSpider
from app.crawler.leetcode_pattern_spider import LeetCodePatternSpider
from app.crawler.stackoverflow_spider import StackOverflowAPISpider
#Scraping Orchestrator
from app.scraping.orchestrator import get_orchestrator
from app.pattern_extraction.extractor import UnifiedPatternExtractor
from app.routes.questions_from_pattern import router as questions_from_pattern_router

from dotenv import load_dotenv
load_dotenv() 

ALLOW_LEGACY = os.getenv("ALLOW_LEGACY_LEETCODE_FULL_SCRAPE") == "true"
print("ALLOW_LEGACY_LEETCODE_FULL_SCRAPE =", os.getenv("ALLOW_LEGACY_LEETCODE_FULL_SCRAPE"))

# Configure logging
logger = logging.getLogger(__name__)

print("🚀 Starting Hiralent AI Service...")

# =============================================================================
# GEMINI AI SERVICE IMPORT
# =============================================================================
GEMINI_AVAILABLE = False
gemini_ai_service = None
DIAGRAM_GENERATION_AVAILABLE = False  

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

class GitHubSpiderAdapter(BaseSpider):
    def __init__(self):
        super().__init__("github", "https://github.com")
        self._impl = GitHubSpider()
        self.session = self._impl.session  # ✅ overwrite the session created by BaseSpider

    def extract_problems(self, html: str) -> List[Dict]:
        return self._impl.extract_problems(html)

    def get_next_page(self, soup: BeautifulSoup) -> Optional[str]:
        return None

    def crawl(self, max_pages: int = 3) -> List[Dict]:
        return self._impl.crawl(max_pages=max_pages)

    def health_check(self) -> Dict[str, Any]:
        return self._impl.health_check()


class HackerRankSpiderAdapter(BaseSpider):
    def __init__(self):
        super().__init__("hackerrank", "https://www.hackerrank.com")
        self._impl = HackerRankSpider()
        self.session = self._impl.session  # ✅ overwrite

    def extract_problems(self, html: str) -> List[Dict]:
        return self._impl.extract_problems(html)

    def get_next_page(self, soup: BeautifulSoup) -> Optional[str]:
        return None

    def crawl(self, max_pages: int = 3) -> List[Dict]:
        return self._impl.crawl(max_pages=max_pages)

    def health_check(self) -> Dict[str, Any]:
        return self._impl.health_check()

# =============================================================================
# STACKOVERFLOW SPIDER (Integrated to avoid import issues)
# =============================================================================
class StackOverflowSpider(BaseSpider):
    """
    Spider pour extraire des problèmes de programmation de Stack Overflow.
    Version RÉELLE avec parsing HTML complet.
    """
    
    def __init__(self):
        super().__init__("stackoverflow", "https://stackoverflow.com")
        self.start_urls = [
            "https://stackoverflow.com/questions/tagged/python?sort=votes&pagesize=50",
            "https://stackoverflow.com/questions/tagged/javascript?sort=votes&pagesize=50",
            "https://stackoverflow.com/questions/tagged/java?sort=votes&pagesize=50",
            "https://stackoverflow.com/questions/tagged/c%23?sort=votes&pagesize=50",
            "https://stackoverflow.com/questions/tagged/sql?sort=votes&pagesize=50"
        ]
    
    def extract_problems(self, html: str) -> List[Dict]:
        """
        Extrait les problèmes de programmation RÉELS de Stack Overflow
        avec parsing HTML complet.
        """
        soup = BeautifulSoup(html, 'html.parser')
        problems = []
        
        # Trouver les conteneurs de questions - structure réelle de Stack Overflow
        question_summaries = soup.find_all('div', class_='s-post-summary')
        
        print(f"🔍 Found {len(question_summaries)} question summaries on page")
        
        for summary in question_summaries:
            try:
                # Extraire le titre et l'URL
                title_elem = summary.find('a', class_='s-link')
                if not title_elem:
                    continue
                    
                title = title_elem.get_text().strip()
                href = title_elem.get('href', '')
                
                # Vérifier que c'est un lien de question valide
                if not href.startswith('/questions/'):
                    continue
                
                # Extraire le contenu/excerpt de la question
                excerpt_elem = summary.find('div', class_='s-post-summary--content-excerpt')
                content = excerpt_elem.get_text().strip() if excerpt_elem else f"StackOverflow question: {title}"
                
                # Extraire les statistiques (votes, réponses, vues)
                stats = summary.find_all('span', class_='s-post-summary--stats-item-number')
                votes = int(stats[0].get_text().strip()) if len(stats) > 0 else 0
                answers = int(stats[1].get_text().strip()) if len(stats) > 1 else 0
                views_text = stats[2].get_text().strip().replace(',', '') if len(stats) > 2 else '0'
                views = int(views_text) if views_text.isdigit() else 0
                
                # Extraire les tags
                tags = [tag.get_text() for tag in summary.find_all('a', class_='post-tag')]
                
                # Détecter le langage de programmation
                language = self._detect_language(tags)
                
                # Ignorer les questions non liées à la programmation
                if language == 'unknown' and not self._is_programming_question(tags, title):
                    continue
                
                # Estimer la difficulté
                difficulty = self._estimate_difficulty(votes, answers, views)
                
                # Classifier le type de problème
                problem_type = self._classify_problem_type(title, content, tags)
                
                problem_data = {
                    'source': 'stackoverflow',
                    'title': title,
                    'content': content,
                    'full_question_url': self.base_url + href,
                    'tags': tags,
                    'votes': votes,
                    'answers': answers,
                    'views': views,
                    'language': language,
                    'difficulty': difficulty,
                    'problem_type': problem_type
                }
                
                problems.append(problem_data)
                print(f"✅ Extracted REAL: {title[:60]}... (Language: {language}, Difficulty: {difficulty})")
                
            except Exception as e:
                print(f"⚠️ Error parsing question: {e}")
                continue
        
        print(f"🎉 Successfully extracted {len(problems)} REAL programming problems from StackOverflow")
        return problems
    
    def _is_programming_question(self, tags: List[str], title: str) -> bool:
        """Vérifie si c'est une question de programmation"""
        programming_keywords = ['python', 'javascript', 'java', 'c#', 'c++', 'php', 'ruby', 'go', 'rust', 'sql']
        title_lower = title.lower()
        return any(keyword in title_lower for keyword in programming_keywords)
    
    def _detect_language(self, tags: List[str]) -> str:
        """Détecte le langage de programmation basé sur les tags"""
        language_map = {
            'python': 'python', 'javascript': 'javascript', 'java': 'java',
            'c#': 'csharp', 'sql': 'sql', 'c++': 'cpp', 'php': 'php'
        }
        for tag in tags:
            if tag in language_map:
                return language_map[tag]
        return 'unknown'
    
    def _estimate_difficulty(self, votes: int, answers: int, views: int) -> str:
        """Estime la difficulté basée sur les métriques d'engagement"""
        engagement_score = votes + (answers * 5) + (views / 100)
        if engagement_score > 1000: return 'hard'
        elif engagement_score > 200: return 'medium'
        else: return 'easy'
    
    def _classify_problem_type(self, title: str, content: str, tags: List[str]) -> str:
        """Classifie le type de problème de programmation"""
        title_lower = title.lower()
        if any(word in title_lower for word in ['error', 'exception', 'debug', 'fix']):
            return 'debugging'
        elif any(word in title_lower for word in ['algorithm', 'data structure', 'optimize']):
            return 'algorithm'
        elif any(word in title_lower for word in ['database', 'query', 'sql']):
            return 'database'
        else:
            return 'general'
    
    def get_next_page(self, soup: BeautifulSoup) -> Optional[str]:
        """Trouve le lien vers la page suivante"""
        return None  # Une seule page pour le test
    

# Add this after your existing BaseSpider and StackOverflowSpider classes

class LeetCodeSpiderLegacy(BaseSpider):
    """
    Advanced spider for scraping LeetCode problems with complete details
    """
    
    def __init__(self):
        super().__init__("leetcode", "https://leetcode.com")
        self.start_urls = [
            "https://leetcode.com/problemset/all/",
        ]
        self.api_base = "https://leetcode.com/graphql"
        
        # Add proper headers to mimic browser
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        })

    def get_detailed_problem_info(self, title_slug: str) -> Optional[Dict]:
        """
        Get detailed problem information including test cases and solutions via GraphQL API
        """
        query = """
        query getQuestionDetail($titleSlug: String!) {
            question(titleSlug: $titleSlug) {
                questionId
                questionFrontendId
                title
                titleSlug
                content
                difficulty
                categoryTitle
                codeSnippets {
                    lang
                    langSlug
                    code
                }
                sampleTestCase
                exampleTestcases
                exampleTestcaseList
                metaData
                hints
                solution {
                    id
                    canSeeDetail
                    paidOnly
                    hasVideoSolution
                    paidOnlyVideo
                    __typename
                }
                topicTags {
                    name
                    slug
                }
                companyTagStats
                stats
                judgerAvailable
                judgeType
                mysqlSchemas
                enableRunCode
                enableTestMode
                enableDebugger
                libraryUrl
                adminUrl
                challengeQuestion {
                    id
                    date
                    incompleteChallengeCount
                    streakCount
                    type
                    __typename
                }
                note
            }
        }
        """
        
        variables = {"titleSlug": title_slug}
        
        try:
            response = self.session.post(
                self.api_base,
                json={'query': query, 'variables': variables},
                headers={
                    'Content-Type': 'application/json',
                    'Referer': f'https://leetcode.com/problems/{title_slug}/',
                    'Origin': 'https://leetcode.com',
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get('data', {}).get('question')
            else:
                logger.error(f"API request failed for {title_slug}: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Error fetching detailed info for {title_slug}: {e}")
            return None

    def extract_problems(self, html: str) -> List[Dict]:
        """
        Extract problems from LeetCode HTML with enhanced data extraction
        """
        problems = []
        soup = BeautifulSoup(html, 'html.parser')
        
        try:
            # Method 1: Extract from __NEXT_DATA__
            script_tag = soup.find('script', {'id': '__NEXT_DATA__'})
            if script_tag and script_tag.string:
                logger.info("Found __NEXT_DATA__, extracting problems...")
                data = json.loads(script_tag.string)
                problems.extend(self._extract_from_next_data(data))
            
            # Method 2: Extract from problem table
            if not problems:
                logger.info("Trying table extraction...")
                problems.extend(self._extract_from_table(soup))
                
            # Method 3: Try API-based extraction
            if not problems:
                logger.info("Trying API extraction...")
                problems.extend(self._extract_via_api())
                
        except Exception as e:
            logger.error(f"Error extracting problems: {e}")
            problems.extend(self._extract_from_table_simple(soup))
        
        return problems

    def _extract_from_next_data(self, data: dict) -> List[Dict]:
        """Extract problems from __NEXT_DATA__ structure"""
        problems = []
        
        try:
            queries = data.get('props', {}).get('pageProps', {}).get('dehydratedState', {}).get('queries', [])
            
            for query in queries:
                query_data = query.get('state', {}).get('data', {})
                
                problem_data = (
                    query_data.get('problemsetQuestionList', {}).get('questions', []) or
                    query_data.get('questionList', {}).get('questions', []) or
                    query_data.get('questions', [])
                )
                
                if problem_data and isinstance(problem_data, list):
                    for problem in problem_data:
                        parsed = self._parse_problem_data(problem)
                        if parsed:
                            problems.append(parsed)
                    break
                    
        except Exception as e:
            logger.error(f"Error parsing __NEXT_DATA__: {e}")
        
        return problems

    def _extract_from_table(self, soup: BeautifulSoup) -> List[Dict]:
        """Extract problems from the problems table"""
        problems = []
        
        try:
            rows = soup.select('[role="rowgroup"] [role="row"]') or soup.select('.reactable-data tr')
            
            for row in rows:
                try:
                    title_elem = row.find('a', href=re.compile(r'/problems/'))
                    if not title_elem:
                        continue
                    
                    title = title_elem.get_text(strip=True)
                    href = title_elem.get('href', '')
                    problem_url = urljoin(self.base_url, href)
                    title_slug = self.extract_title_slug(problem_url)
                    
                    # Extract difficulty
                    difficulty_elem = row.find('span', class_=re.compile(r'difficulty'))
                    if difficulty_elem:
                        difficulty_text = difficulty_elem.get_text(strip=True).lower()
                        difficulty = difficulty_text if difficulty_text in ['easy', 'medium', 'hard'] else 'medium'
                    else:
                        difficulty = 'medium'
                    
                    # Extract acceptance rate
                    acceptance_text = row.get_text()
                    acceptance_match = re.search(r'(\d+(?:\.\d+)?)%', acceptance_text)
                    acceptance_rate = float(acceptance_match.group(1)) if acceptance_match else 0.0
                    
                    problem = {
                        'source': 'leetcode',
                        'title': title,
                        'title_slug': title_slug,
                        'content': f'LeetCode Problem: {title}',
                        'full_question_url': problem_url,
                        'difficulty': difficulty,
                        'tags': [],
                        'skillTags': [],
                        'language': 'multiple',
                        'votes': 0,
                        'answers': 0,
                        'acceptance_rate': acceptance_rate,
                        'problem_type': 'coding',
                        'type': 'coding',
                        'status': 'pending_review',
                        'aiGenerated': False,
                        'source_scraped': 'web_scraped',
                    }
                    
                    problems.append(problem)
                    
                except Exception as e:
                    logger.error(f"Error parsing problem row: {e}")
                    continue
                    
        except Exception as e:
            logger.error(f"Error in table extraction: {e}")
        
        return problems

    def _extract_from_table_simple(self, soup: BeautifulSoup) -> List[Dict]:
        """Simple fallback table extraction"""
        problems = []
        
        try:
            problem_links = soup.find_all('a', href=re.compile(r'/problems/[^/]+/$'))
            
            for link in problem_links:
                try:
                    title = link.get_text(strip=True)
                    if not title or title == ' ':
                        continue
                        
                    href = link.get('href')
                    problem_url = urljoin(self.base_url, href)
                    title_slug = self.extract_title_slug(problem_url)
                    
                    parent_text = link.parent.get_text() if link.parent else ''
                    
                    if 'Easy' in parent_text:
                        difficulty = 'easy'
                    elif 'Medium' in parent_text:
                        difficulty = 'medium'
                    elif 'Hard' in parent_text:
                        difficulty = 'hard'
                    else:
                        difficulty = 'medium'
                    
                    problem = {
                        'source': 'leetcode',
                        'title': title,
                        'title_slug': title_slug,
                        'content': f'LeetCode Problem: {title}',
                        'full_question_url': problem_url,
                        'difficulty': difficulty,
                        'tags': [],
                        'skillTags': [],
                        'language': 'multiple',
                        'votes': 0,
                        'answers': 0,
                        'problem_type': 'coding',
                        'type': 'coding',
                        'status': 'pending_review',
                        'aiGenerated': False,
                        'source_scraped': 'web_scraped',
                    }
                    
                    problems.append(problem)
                    
                except Exception as e:
                    logger.error(f"Error in simple extraction for {link}: {e}")
                    continue
                    
        except Exception as e:
            logger.error(f"Error in simple table extraction: {e}")
        
        return problems

    def _extract_via_api(self) -> List[Dict]:
        """Try to extract problems via the GraphQL API"""
        problems = []
        
        try:
            query = """
            query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
                problemsetQuestionList: questionList(
                    categorySlug: $categorySlug
                    limit: $limit
                    skip: $skip
                    filters: $filters
                ) {
                    total: totalNum
                    questions: data {
                        acRate
                        difficulty
                        frontendQuestionId: questionFrontendId
                        isFavor
                        paidOnly: isPaidOnly
                        status
                        title
                        titleSlug
                        topicTags {
                            name
                            slug
                        }
                    }
                }
            }
            """
            
            variables = {
                "categorySlug": "",
                "skip": 0,
                "limit": 20,  # Reduced for testing
                "filters": {}
            }
            
            response = self.session.post(
                self.api_base,
                json={'query': query, 'variables': variables},
                headers={
                    'Content-Type': 'application/json',
                    'Referer': 'https://leetcode.com/problemset/all/',
                    'Origin': 'https://leetcode.com',
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                questions = data.get('data', {}).get('problemsetQuestionList', {}).get('questions', [])
                
                for question in questions:
                    problem = self._parse_api_problem_data(question)
                    if problem:
                        problems.append(problem)
                        
        except Exception as e:
            logger.error(f"Error in API extraction: {e}")
        
        return problems

    def _parse_api_problem_data(self, data: dict) -> Optional[Dict]:
        """Parse problem data from API response"""
        try:
            title = data.get('title', '')
            title_slug = data.get('titleSlug', '')
            difficulty = data.get('difficulty', 'Medium').lower()
            
            topic_tags = data.get('topicTags', [])
            tags = [tag.get('name', '') for tag in topic_tags if tag.get('name')]
            
            problem_url = f"https://leetcode.com/problems/{title_slug}/"
            
            problem = {
                'source': 'leetcode',
                'title': title,
                'title_slug': title_slug,
                'content': f'LeetCode Problem: {title}',
                'full_question_url': problem_url,
                'difficulty': difficulty,
                'tags': tags,
                'skillTags': tags,
                'language': 'multiple',
                'votes': 0,
                'answers': 0,
                'problem_type': 'coding',
                'type': 'coding',
                'leetcode_id': data.get('frontendQuestionId', ''),
                'is_paid_only': data.get('paidOnly', False),
                'acceptance_rate': data.get('acRate', 0),
                'status': 'pending_review',
                'aiGenerated': False,
                'source_scraped': 'web_scraped',
            }
            
            return problem
            
        except Exception as e:
            logger.error(f"Error parsing API problem data: {e}")
            return None

    def extract_title_slug(self, url: str) -> Optional[str]:
        """Extract title slug from problem URL"""
        try:
            match = re.search(r'/problems/([^/]+)/', url)
            return match.group(1) if match else None
        except Exception as e:
            logger.error(f"Error extracting title slug from {url}: {e}")
            return None

    def get_next_page(self, soup: BeautifulSoup) -> Optional[str]:
        """Find the next page URL"""
        try:
            current_url = getattr(self.session, 'url', self.start_urls[0])
            
            page_match = re.search(r'page=(\d+)', current_url)
            if page_match:
                current_page = int(page_match.group(1))
                next_page = current_page + 1
                next_url = re.sub(r'page=\d+', f'page={next_page}', current_url)
                return next_url
            else:
                if '?' in current_url:
                    return f"{current_url}&page=2"
                else:
                    return f"{current_url}?page=2"
                    
        except Exception as e:
            logger.error(f"Error finding next page: {e}")
        
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
            self.spiders = [StackOverflowSpider(),LeetCodePatternSpider(),GitHubSpiderAdapter(), HackerRankSpiderAdapter()]
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

# CORS middleware — env-driven allowlist (no wildcard with credentials).
from app.core.config import settings as _cors_settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_settings.CORS_ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Internal service auth — every non-public path requires the X-API-Token header
# (INTERNAL_API_TOKEN). Reaching the port is not enough; probes/docs stay open.
from app.core.security import add_internal_token_guard
add_internal_token_guard(app)

# =============================================================================
# VARIATION ENGINE ROUTES
# =============================================================================
try:
    from app.routes.variation_routes import router as variation_router
    app.include_router(variation_router)
    print("✅ Variation Engine routes loaded successfully")
except ImportError as e:
    print(f"⚠️ Variation Engine routes not available: {e}")
    # Create a simple fallback route
    @app.get("/variations/health")
    async def variation_fallback():
                return {"error": "Variation Engine not available", "available": False}

#vector store
app.include_router(vector_router)


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
            "web_scraping": SCRAPING_AVAILABLE,
            "variation_engine": True  #  NEW

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
@app.post("/generate-with-diagram")
async def generate_question_with_diagram_route(request: Dict[str, Any]):
    """
    ✨ NOUVEAU: Génère une question avec diagramme automatique si nécessaire
    
    Body:
        {
            "topic": "database schema for ecommerce",
            "difficulty": "medium"
        }
    
    Response:
        {
            "success": true,
            "question": {...},
            "diagram": {
                "needed": true,
                "type": "er",
                "code": "erDiagram...",
                "imageUrl": "https://cloudinary.com/..."
            },
            "metadata": {...}
        }
    """
    try:
        topic = request.get("topic")
        difficulty = request.get("difficulty", "medium")
        
        if not topic:
            raise HTTPException(status_code=400, detail="Topic is required")
        
        logger.info(f"🎯 Generating question with diagram: {topic} ({difficulty})")
        
        # Appeler la nouvelle méthode
        result = await gemini_ai_service.generate_question_with_diagram(topic, difficulty)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Generation failed")
            )
        
        return {
            "success": True,
            "question": result["question"],
            "diagram": result.get("diagram"),
            "metadata": {
                "topic": topic,
                "difficulty": difficulty,
                "source": "gemini_ai",
                "diagram_generation_available": DIAGRAM_GENERATION_AVAILABLE,
                "diagram_needed": result.get("diagram") is not None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in generate-with-diagram route: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Generation failed: {str(e)}"
        )

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

# @app.post("/scraping/start")
# async def start_scraping_job(request: dict = None):
#     if not SCRAPING_AVAILABLE:
#         raise HTTPException(status_code=503, detail="Web scraping module not available")
    
#     sources = request.get("sources", ["stackoverflow"]) if request else ["stackoverflow"]
#     max_pages = request.get("max_pages", 3) if request else 3
    
#     result = await web_scraping_service.run_scraping_job(sources=sources, max_pages=max_pages)
#     return result

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

@app.get("/scraping/test-db")
async def test_database_connection():
    """Test Prisma database connection"""
    return await web_scraping_service.test_prisma_connection()

@app.get("/scraping/problems/enhanced")
async def get_enhanced_problems(
    limit: int = 50, 
    offset: int = 0,
    language: str = None,
    source: str = None,
    difficulty: str = None
):
    """Get scraped problems with enhanced filtering"""
    return web_scraping_service.get_scraped_problems(
        limit=limit, offset=offset, 
        language=language, source=source, difficulty=difficulty
    )

@app.post("/scraping/leetcode/url")
async def scrape_leetcode_pattern_by_url(request: dict):
    """
    SAFE: Extract LeetCode PATTERN ONLY by URL (no statement/examples/solutions/tests stored).
    """
    try:
        url = request.get("url")
        if not url:
            raise HTTPException(status_code=400, detail="URL is required")

        print(f"🔍 Pattern-extracting LeetCode URL: {url}")

        # Extract title slug from URL
        title_slug = extract_leetcode_slug(url)
        if not title_slug:
            raise HTTPException(status_code=400, detail="Invalid LeetCode URL")

        print(f"📝 Extracted title slug: {title_slug}")

        # ✅ Use the NEW safe spider
        spider = LeetCodePatternSpider()

        # Fetch minimal metadata + extract pattern
        meta = spider._fetch_meta(title_slug)  # or spider.fetch_meta(...) if you expose it public
        if not meta:
            raise HTTPException(status_code=404, detail="Problem not found or access denied")

        pattern = spider._extract_pattern(meta)

        # Guardrail: ensure we never return forbidden content keys
        spider._assert_safe(pattern)

        return {
            "success": True,
            "message": "LeetCode pattern extracted successfully",
            "pattern": pattern,
            "metadata": {
                "url": url,
                "title_slug": title_slug,
                "scraped_at": datetime.now().isoformat()
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extracting LeetCode pattern: {e}")
        raise HTTPException(status_code=500, detail=f"Pattern extraction failed: {str(e)}")

@app.post("/scraping/leetcode/test")
async def test_leetcode_scraping(request: dict):
    """
    LEGACY: Test LeetCode scraping with the full-content approach (description/tests/snippets).
    Disabled by default. Enable only for local debugging:
    ALLOW_LEGACY_LEETCODE_FULL_SCRAPE=true
    """
    try:
        # ✅ GUARD (add this at the very top)
        if not ALLOW_LEGACY:
            raise HTTPException(
                status_code=403,
                detail="Legacy LeetCode full scrape disabled. Set ALLOW_LEGACY_LEETCODE_FULL_SCRAPE=true to enable."
            )

        url = request.get("url")
        if not url:
            raise HTTPException(status_code=400, detail="URL is required")

        print(f"🧪 Testing LeetCode scraping for: {url}")

        # Extract title slug from URL
        title_slug = extract_leetcode_slug(url)
        if not title_slug:
            raise HTTPException(status_code=400, detail="Invalid LeetCode URL")

        print(f"📝 Extracted title slug: {title_slug}")

        # Use the working GraphQL query directly
        query = {
            "operationName": "questionData",
            "variables": {"titleSlug": title_slug},
            "query": """
            query questionData($titleSlug: String!) {
                question(titleSlug: $titleSlug) {
                    questionId
                    title
                    titleSlug
                    content
                    difficulty
                    exampleTestcases
                    codeSnippets {
                        lang
                        langSlug
                        code
                    }
                    sampleTestCase
                    topicTags {
                        name
                        slug
                    }
                }
            }
            """
        }

        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Referer": f"https://leetcode.com/problems/{title_slug}/",
        }

        print("🔄 Sending GraphQL request...")
        response = requests.post(
            "https://leetcode.com/graphql",
            json=query,
            headers=headers,
            timeout=10
        )

        if response.status_code == 200:
            data = response.json()
            if "data" in data and data["data"].get("question"):
                problem_data = data["data"]["question"]
                print(f"✅ Successfully fetched: {problem_data.get('title', 'Unknown')}")

                # ✅ GET THE CONTENT AND CLEAN IT
                raw_content = problem_data.get("content", "") or ""
                clean_description = clean_html_content(raw_content)

                return {
                    "success": True,
                    "message": "LeetCode scraping test successful (LEGACY)",
                    "data": {
                        "question_id": problem_data.get("questionId"),
                        "title": problem_data.get("title"),
                        "title_slug": problem_data.get("titleSlug"),
                        "difficulty": problem_data.get("difficulty"),
                        "topics": [tag["name"] for tag in problem_data.get("topicTags", [])],

                        # ✅ DESCRIPTION
                        "description": clean_description,
                        "description_preview": (clean_description[:500] + "...") if len(clean_description) > 500 else clean_description,
                        "description_length": len(clean_description),
                        "has_content": bool(raw_content),

                        # ✅ TEST CASES
                        "test_cases": problem_data.get("exampleTestcases", ""),
                        "sample_test_case": problem_data.get("sampleTestCase", ""),

                        # CODE SNIPPETS (just languages list)
                        "code_snippets": [s.get("lang") for s in problem_data.get("codeSnippets", []) if s.get("lang")],

                        # ✅ URL
                        "url": f"https://leetcode.com/problems/{problem_data.get('titleSlug')}/"
                    }
                }
            else:
                print("❌ No question data in response")
                return {
                    "success": False,
                    "error": "No question data found in response"
                }

        print(f"❌ HTTP Error: {response.status_code}")
        return {
            "success": False,
            "error": f"HTTP {response.status_code}",
            "response_text": response.text[:500] if response.text else "No response text"
        }

    except HTTPException:
        # keep FastAPI HTTP errors clean
        raise

    except Exception as e:
        logger.error(f"Error in test scraping: {e}")
        return {
            "success": False,
            "error": str(e)
        }
@app.get("/debug/fetch")
async def debug_fetch(url: str = Query(..., description="URL to fetch")):
    r = requests.get(
        url,
        headers={"User-Agent": "Mozilla/5.0"},
        timeout=20
    )
    soup = BeautifulSoup(r.text, "html.parser")
    title = soup.title.get_text(strip=True) if soup.title else None
    return {
        "status_code": r.status_code,
        "final_url": str(r.url),
        "title": title,
        "html_preview": r.text[:800]
    }

@app.get("/scraping/stackoverflow/parse-test")
async def so_parse_test(tag: str = "python", pagesize: int = 30):
    url = f"https://stackoverflow.com/questions/tagged/{tag}?sort=votes&pagesize={pagesize}"
    r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=20)

    soup = BeautifulSoup(r.text, "html.parser")

    # ✅ Current-ish selectors (StackOverflow changes often)
    links = []
    for a in soup.select("a.s-link[href^='/questions/']"):
        href = a.get("href", "")
        if href.count("/") >= 2:
            full = "https://stackoverflow.com" + href.split("?")[0]
            links.append(full)

    # Deduplicate
    links = list(dict.fromkeys(links))

    return {
        "tag": tag,
        "status_code": r.status_code,
        "url": url,
        "found_links": len(links),
        "sample": links[:10],
        "html_title": soup.title.get_text(strip=True) if soup.title else None,
    }
@app.get("/scraping/stackoverflow/api-test")
async def so_api_test(tag: str = Query("python"), pagesize: int = Query(20)):
    url = "https://api.stackexchange.com/2.3/questions"
    params = {
        "site": "stackoverflow",
        "tagged": tag,
        "pagesize": pagesize,
        "order": "desc",
        "sort": "votes",
        "filter": "default"
    }
    r = requests.get(url, params=params, timeout=20)
    r.raise_for_status()
    data = r.json()
    items = data.get("items", [])
    return {
        "tag": tag,
        "count": len(items),
        "sample": [
            {"title": q["title"], "link": q["link"], "score": q["score"]}
            for q in items[:10]
        ],
        "quota_remaining": data.get("quota_remaining"),
    }
@app.get("/scraping/stackoverflow/run")
async def run_so(max_pages: int = 1, pagesize: int = 30):
    spider = StackOverflowAPISpider(tags=None, pagesize=pagesize)  # ✅ ALL topics
    items = spider.crawl(max_pages=max_pages)

    health = spider.health_check()

    # show a tiny sample so you know it really worked
    sample = [
        {"title": x.get("title"), "source_url": x.get("source_url"), "difficulty": x.get("difficulty")}
        for x in items[:3]
    ]

    return {
        "count": len(items),
        "sample": sample,
        "health": health,
    }
@app.get("/scraping/stackoverflow/raw")
async def so_raw(page: int = 1, pagesize: int = 10, tagged: str = "python"):
    url = "https://api.stackexchange.com/2.3/questions"
    params = {
        "site": "stackoverflow",
        "pagesize": pagesize,
        "page": page,
        "order": "desc",
        "sort": "votes",
        "filter": "default",
        "tagged": tagged,
        # optionally add key if you have it
        # "key": os.getenv("STACKEXCHANGE_KEY"),
    }

    r = requests.get(url, params=params, timeout=20)

    # Try parse JSON even on 400
    try:
        data = r.json()
    except Exception:
        data = {"non_json_body_preview": (r.text or "")[:800]}

    return {
        "status_code": r.status_code,
        "final_url": str(r.url),
        "error_name": data.get("error_name"),
        "error_message": data.get("error_message"),
        "backoff": data.get("backoff"),
        "quota_remaining": data.get("quota_remaining"),
        "items_len": len(data.get("items", []) or []),
        "sample": [
            {"title": q.get("title"), "link": q.get("link"), "score": q.get("score")}
            for q in (data.get("items", [])[:5] if isinstance(data.get("items", []), list) else [])
        ],
        "raw": data,  # keep this while debugging
    }


def clean_html_content(html_content: str) -> str:
    """
    Clean HTML content and extract readable text
    """
    if not html_content:
        return ""
    
    try:
        from bs4 import BeautifulSoup
        
        # Parse HTML
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
        
        # Get text
        text = soup.get_text()
        
        # Clean up whitespace
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = ' '.join(chunk for chunk in chunks if chunk)
        
        return text
        
    except Exception as e:
        # Fallback: simple regex to remove HTML tags
        import re
        return re.sub('<[^<]+?>', '', html_content)
    
def extract_leetcode_slug(url: str) -> Optional[str]:
    """Extract title slug from LeetCode URL"""
    try:
        print(f"🔧 Extracting slug from URL: {url}")
        # Handle different LeetCode URL formats
        patterns = [
            r'leetcode\.com/problems/([^/?]+)',
            r'leetcode\.com/problems/([^/?]+)/description',
            r'leetcode\.com/problems/([^/?]+)/?'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                slug = match.group(1)
                print(f"✅ Extracted slug: {slug}")
                return slug
        print(f"❌ No slug found in URL: {url}")
        return None
    except Exception as e:
        logger.error(f"Error extracting slug from {url}: {e}")
        return None

def transform_leetcode_to_prisma_format(leetcode_data: Dict, source_url: str) -> Dict:
    """Transform LeetCode data to Prisma Question model format"""
    
    print(f"🔄 Transforming LeetCode data to Prisma format...")
    
    # Extract test cases
    test_cases = parse_leetcode_test_cases(leetcode_data)
    
    # Extract canonical solution (Python preferred)
    canonical_solution = extract_leetcode_solution(leetcode_data)
    
    # Extract tags
    topic_tags = [tag['name'] for tag in leetcode_data.get('topicTags', [])]
    
    # Get content and clean HTML tags
    content = leetcode_data.get('content', '')
    # Simple HTML tag removal
    content_clean = re.sub('<[^<]+?>', '', content)
    
    transformed_data = {
        # Required Prisma fields
        "title": leetcode_data.get('title', 'LeetCode Problem'),
        "description": f"LeetCode Problem: {leetcode_data.get('title', '')}",
        "problemStatement": content_clean[:2000],  # Limit length
        "difficulty": leetcode_data.get('difficulty', 'medium').lower(),
        "skillTags": topic_tags,
        "type": "coding",
        "canonicalSolution": canonical_solution,
        "testCases": test_cases,
        
        # MCQ fields (null for coding problems)
        "options": None,
        "correctAnswer": None,
        "explanation": leetcode_data.get('hints', [])[:3],  # Use first 3 hints as explanation
        
        # Metadata
        "status": "pending_review",
        "aiGenerated": False,
        "source": "web_scraped",
        
        # Additional LeetCode metadata
        "metadata": {
            "sourceUrl": source_url,
            "platform": "leetcode",
            "leetcodeId": leetcode_data.get('questionFrontendId'),
            "titleSlug": leetcode_data.get('titleSlug'),
            "category": leetcode_data.get('categoryTitle'),
            "hints": leetcode_data.get('hints', []),
            "isPaidOnly": leetcode_data.get('isPaidOnly', False),
            "scrapedAt": datetime.now().isoformat(),
            "contentLength": len(content)
        }
    }
    
    print(f"✅ Transformed data for: {transformed_data['title']}")
    return transformed_data

def parse_leetcode_test_cases(leetcode_data: Dict) -> Dict:
    """Parse test cases from LeetCode data"""
    test_cases = {
        "inputs": [],
        "outputs": [],
        "examples": []
    }
    
    try:
        print(f"🔧 Parsing test cases...")
        
        # Get sample test case
        sample_test_case = leetcode_data.get('sampleTestCase', '')
        if sample_test_case:
            test_cases["inputs"].append(sample_test_case)
            print(f"✅ Added sample test case: {sample_test_case[:50]}...")
        
        # Get example test cases
        example_testcases = leetcode_data.get('exampleTestcases', '')
        if example_testcases:
            # Split multiple test cases (usually separated by newlines)
            cases = example_testcases.split('\n')
            for i, case in enumerate(cases):
                if case.strip():
                    test_cases["examples"].append({
                        "input": case.strip(),
                        "output": f"Expected output for test case {i+1}",
                        "explanation": f"Example test case {i+1} from LeetCode"
                    })
            print(f"✅ Added {len(cases)} example test cases")
        
        # Get example test case list
        example_testcase_list = leetcode_data.get('exampleTestcaseList', [])
        for i, case in enumerate(example_testcase_list):
            if case.strip():
                test_cases["examples"].append({
                    "input": case.strip(),
                    "output": f"Expected output for example {i+1}",
                    "explanation": f"Example {i+1} from LeetCode"
                })
        print(f"✅ Added {len(example_testcase_list)} test cases from list")
                
    except Exception as e:
        logger.error(f"Error parsing LeetCode test cases: {e}")
        # Add a default test case if parsing fails
        test_cases["examples"].append({
            "input": "Default input",
            "output": "Default output", 
            "explanation": "Default test case"
        })
    
    print(f"📊 Total test cases: {len(test_cases['examples'])} examples")
    return test_cases

def extract_leetcode_solution(leetcode_data: Dict) -> str:
    """Extract canonical solution from LeetCode data"""
    try:
        print(f"🔧 Extracting solution...")
        code_snippets = leetcode_data.get('codeSnippets', [])
        
        # Prefer Python 3 solution
        python_snippets = [s for s in code_snippets if s.get('langSlug') == 'python3']
        if python_snippets:
            solution = python_snippets[0].get('code', '')
            print(f"✅ Found Python solution ({len(solution)} chars)")
            return solution
        
        # Fallback to any available solution
        if code_snippets:
            solution = code_snippets[0].get('code', '')
            print(f"✅ Found {code_snippets[0].get('lang', 'unknown')} solution ({len(solution)} chars)")
            return solution
            
    except Exception as e:
        logger.error(f"Error extracting LeetCode solution: {e}")
    
    # Default solution stub
    default_solution = """# LeetCode Solution
# Problem: {title}
# Difficulty: {difficulty}

class Solution:
    def main(self):
        \"\"\"
        Implement your solution here
        \"\"\"
        pass

# Test your solution
if __name__ == "__main__":
    solution = Solution()
    result = solution.main()
    print(f"Result: {{result}}")
""".format(
        title=leetcode_data.get('title', 'Unknown'),
        difficulty=leetcode_data.get('difficulty', 'medium')
    )
    
    print(f"⚠️ Using default solution template")
    return default_solution

@app.get("/scraping/debug")
async def debug_scraping():
    """Debug endpoint to test basic connectivity"""
    return {
        "status": "debug_route_working",
        "message": "Debug route is accessible",
        "timestamp": datetime.now().isoformat(),
        "scraping_available": SCRAPING_AVAILABLE
    }


# ADD NEW ROUTE TO TEST THE SCRAPERS:

# @app.get("/scraping/test-github")
# async def test_github_scraping():
#     try:
#         github_spider = GitHubSpiderAdapter()

#         test_url = "https://api.github.com/repos/TheAlgorithms/Python/contents/sorts"
#         response = github_spider.session.get(test_url, timeout=10)

#         if response.status_code != 200:
#             return {"success": False, "error": f"HTTP {response.status_code}", "message": "GitHub API request failed"}

#         patterns = github_spider.extract_problems(response.text)

#         return {
#             "success": True,
#             "message": f"Successfully extracted {len(patterns)} patterns from GitHub",
#             "patterns_sample": patterns[:3],
#             "total_patterns": len(patterns),
#             "spider_status": github_spider.health_check(),
#         }
#     except Exception as e:
#         logger.error(f"GitHub test failed: {e}")
#         return {"success": False, "error": str(e)}


# @app.get("/scraping/test-hackerrank")
# async def test_hackerrank_scraping():
#     try:
#         hackerrank_spider = HackerRankSpiderAdapter()

#         test_url = "https://www.hackerrank.com/rest/contests/master/tracks/algorithms/challenges?limit=20"
#         response = hackerrank_spider.session.get(test_url, timeout=10)

#         if response.status_code != 200:
#             return {"success": False, "error": f"HTTP {response.status_code}", "message": "HackerRank API request failed"}

#         patterns = hackerrank_spider.extract_problems(response.text)

#         return {
#             "success": True,
#             "message": f"Successfully extracted {len(patterns)} patterns from HackerRank",
#             "patterns_sample": patterns[:3],
#             "total_patterns": len(patterns),
#             "spider_status": hackerrank_spider.health_check(),
#         }
#     except Exception as e:
#         logger.error(f"HackerRank test failed: {e}")
#         return {"success": False, "error": str(e)}

# @app.post("/scraping/start-enhanced")
# async def start_scraping_job_enhanced(request: dict = None):
#     """
#     Enhanced scraping job with GitHub and HackerRank support
    
#     Body:
#         {
#             "sources": ["stackoverflow", "leetcode", "github", "hackerrank"],
#             "max_pages": 3
#         }
#     """
#     if not SCRAPING_AVAILABLE:
#         raise HTTPException(status_code=503, detail="Web scraping module not available")
    
#     sources = request.get("sources", ["stackoverflow", "leetcode"]) if request else ["stackoverflow"]
#     max_pages = request.get("max_pages", 3) if request else 3
    
#     print(f"🚀 Starting enhanced scraping job with sources: {sources}")
    
#     result = await web_scraping_service.run_scraping_job(sources=sources, max_pages=max_pages)
    
#     # Add summary
#     result["available_sources"] = ["stackoverflow", "leetcode", "github", "hackerrank"]
#     result["requested_sources"] = sources
    
#     return result
# =============================================================================
# MCQ GENERATION ROUTES (FIXED - ACCEPTS JSON BODY)
# =============================================================================

@app.post("/generate/mcq-only")
async def generate_mcq_question(request: Request):
    """
    Dedicated endpoint for MCQ generation (JSON body)
    
    Body:
        {
            "topic": "accounting",
            "difficulty": "medium"
        }
    """
    try:
        if not GEMINI_AVAILABLE:
            raise HTTPException(
                status_code=503,
                detail="Gemini AI service not available"
            )
        
        # Parse JSON body
        try:
            body = await request.json()
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid JSON body: {str(e)}"
            )
        
        topic = body.get("topic")
        difficulty = body.get("difficulty", "medium")
        
        if not topic:
            raise HTTPException(
                status_code=400,
                detail="Topic is required in request body"
            )
        
        result = gemini_ai_service.generate_question(topic, difficulty, "mcq")
        
        if not result["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"MCQ generation failed: {result.get('error', 'Unknown error')}"
            )
        
        return {
            "success": True,
            "question": result["data"],
            "metadata": {
                "topic": topic,
                "difficulty": difficulty,
                "type": "mcq",
                "source": result.get("source", "unknown")
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.post("/generate/mcq-batch")
async def generate_mcq_batch(request: Request):
    """
    Dedicated endpoint for batch MCQ generation (JSON body)
    
    Body:
        {
            "topics": ["python", "nursing", "marketing"],
            "difficulty": "medium",
            "count_per_topic": 5
        }
    """
    try:
        if not GEMINI_AVAILABLE:
            raise HTTPException(
                status_code=503,
                detail="Gemini AI service not available"
            )
        
        # Parse JSON body
        try:
            body = await request.json()
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid JSON body: {str(e)}"
            )
        
        topics = body.get("topics", ["python"])
        difficulty = body.get("difficulty", "medium")
        count_per_topic = body.get("count_per_topic", 5)
        
        if not topics:
            raise HTTPException(
                status_code=400,
                detail="Topics list is required"
            )
        
        result = gemini_ai_service.generate_batch(
            topics=topics,
            difficulty=difficulty,
            question_type="mcq",
            count_per_topic=count_per_topic
        )
        
        return {
            "success": True,
            "generated_count": result["generated_count"],
            "failed_count": result.get("failed_count", 0),
            "questions": result["questions"],
            "metadata": {
                "topics": topics,
                "difficulty": difficulty,
                "type": "mcq",
                "count_per_topic": count_per_topic
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.post("/generate/single")
async def generate_single_question_enhanced(request: Request):
    """
    Universal endpoint - generates coding OR MCQ questions (JSON body)
    
    Body:
        {
            "topic": "python",
            "difficulty": "medium",
            "question_type": "mcq"
        }
    """
    try:
        # Parse JSON body
        try:
            body = await request.json()
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid JSON body: {str(e)}"
            )
        
        topic = body.get("topic")
        difficulty = body.get("difficulty", "medium")
        question_type = body.get("question_type", "coding")
        
        if not topic:
            raise HTTPException(
                status_code=400,
                detail="Topic is required"
            )
        
        if question_type == "mcq":
            if not GEMINI_AVAILABLE:
                raise HTTPException(
                    status_code=503,
                    detail="Gemini AI service required for MCQ generation"
                )
            
            result = gemini_ai_service.generate_question(topic, difficulty, "mcq")
            
            if not result["success"]:
                raise HTTPException(
                    status_code=500,
                    detail=f"MCQ generation failed: {result.get('error')}"
                )
            
            return {
                "success": True,
                "question": result["data"],
                "metadata": {
                    "topic": topic,
                    "difficulty": difficulty,
                    "type": "mcq",
                    "source": result.get("source", "unknown")
                }
            }
        
        # Original coding question logic
        return await generate_question(body)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
# =============================================================================
# WEB SCRAPING URL-BASED ROUTES (ADD THESE)
# =============================================================================

@app.post("/api/scrape-questions")
async def scrape_questions(request: Dict[str, Any]):
    """
    Scrape questions from coding platforms and transform to Prisma model format
    """
    try:
        data = request
        urls = data.get('urls', [])
        platform = data.get('platform')
        
        print(f"🔍 Received scraping request for {len(urls)} URLs")
        
        if not urls:
            return {
                "success": False,
                "error": "No URLs provided"
            }
        
        scraped_questions = []
        
        for url in urls:
            try:
                print(f"🌐 Scraping URL: {url}")
                
                # Auto-detect platform from URL if not provided
                detected_platform = platform or detect_platform_from_url(url)
                
                # Scrape based on platform
                if detected_platform == "leetcode":
                    question_data = scrape_leetcode_question(url)
                elif detected_platform == "hackerrank":
                    question_data = scrape_hackerrank_question(url)
                elif detected_platform == "stackoverflow":
                    question_data = scrape_stackoverflow_question(url)
                else:
                    question_data = scrape_generic_question(url)
                
                if question_data:
                    # TRANSFORM to match Prisma Question model
                    transformed_question = transform_to_prisma_format(question_data, detected_platform, url)
                    scraped_questions.append(transformed_question)
                    print(f"✅ Successfully scraped & transformed: {question_data['title']}")
                else:
                    print(f"❌ Failed to scrape: {url}")
                    
                # Be respectful with delays
                await asyncio.sleep(1)
                
            except Exception as e:
                print(f"❌ Error scraping {url}: {str(e)}")
                continue
        
        # If no questions were scraped, return mock data for testing
        if not scraped_questions:
            scraped_questions = create_mock_questions(urls, platform)
        
        print(f"📦 Returning {len(scraped_questions)} questions in Prisma format")
        
        return {
            "success": True,
            "message": f"Scraped {len(scraped_questions)} questions",
            "questions": scraped_questions,  # ✅ Now in Prisma format
            "total_urls": len(urls),
            "successful": len(scraped_questions),
            "failed": len(urls) - len(scraped_questions)
        }
        
    except Exception as e:
        print(f"❌ Scraping route error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}")

def transform_to_prisma_format(scraped_data: Dict, platform: str, source_url: str) -> Dict:
    """
    Transform scraped question data to match the Prisma Question model exactly
    """
    return {
        # Required fields for Prisma model
        "title": scraped_data.get("title", "Untitled Question"),
        "description": scraped_data.get("description", f"Scraped from {platform}"),
        "problemStatement": scraped_data.get("problemStatement", scraped_data.get("content", "Problem statement not available")),
        "difficulty": scraped_data.get("difficulty", "medium"),
        "skillTags": scraped_data.get("skillTags", scraped_data.get("tags", [platform])),
        "type": scraped_data.get("type", "coding"),
        "canonicalSolution": scraped_data.get("canonicalSolution", generate_solution_stub(scraped_data.get("language", "python"))),
        "testCases": scraped_data.get("testCases", {
            "inputs": [],
            "outputs": [],
            "examples": [
                {
                    "input": "sample_input_1",
                    "output": "sample_output_1", 
                    "explanation": "Basic test case"
                }
            ]
        }),
        
        # Metadata fields
        "status": "pending_review",  # Always review scraped content
        "aiGenerated": False,
        "source": "web_scraped",  # Critical for filtering!
        
        # Additional metadata for tracking
        "metadata": {
            "sourceUrl": source_url,
            "platform": platform,
            "scrapedAt": datetime.now().isoformat(),
            "originalTitle": scraped_data.get("title"),
            "votes": scraped_data.get("votes", 0),
            "answers": scraped_data.get("answers", 0),
            "views": scraped_data.get("views", 0),
            "language": scraped_data.get("language", "unknown")
        }
    }

def generate_solution_stub(language: str) -> str:
    """Generate a solution stub based on programming language"""
    stubs = {
        'python': '''# Solution stub
def solution():
    """
    Implement your solution here.
    Return the appropriate result based on the problem requirements.
    """
    # TODO: Implement based on scraped problem
    pass

# Test cases
if __name__ == "__main__":
    # Add test cases based on problem requirements
    result = solution()
    print(f"Result: {result}")
''',
        'javascript': '''// Solution stub
function solution() {
    /**
     * Implement your solution here.
     * Return the appropriate result based on the problem requirements.
     */
    // TODO: Implement based on scraped problem
}

// Test cases
// console.log(solution());
''',
        'java': '''// Solution stub
public class Solution {
    public static Object solution() {
        /**
         * Implement your solution here.
         * Return the appropriate result based on the problem requirements.
         */
        // TODO: Implement based on scraped problem
        return null;
    }
    
    public static void main(String[] args) {
        // Test your solution here
        Object result = solution();
        System.out.println("Result: " + result);
    }
}
''',
        'default': '''# Solution stub
# Implement your solution based on the scraped problem requirements
# This is a placeholder - update with actual solution logic
'''
    }
    
    return stubs.get(language, stubs['default'])

def create_mock_questions(urls, platform):
    """Create mock questions in Prisma format when scraping fails"""
    mock_questions = []
    
    for i, url in enumerate(urls):
        detected_platform = platform or detect_platform_from_url(url)
        
        mock_questions.append({
            "title": f"Sample {detected_platform.capitalize()} Problem {i+1}",
            "description": f"This is a mock description for a problem from {url}",
            "problemStatement": f"Given this sample problem from {detected_platform}, write an efficient solution.\n\nThis is mock data since actual scraping failed.",
            "difficulty": "medium",
            "skillTags": [detected_platform, "algorithm", "data-structures"],
            "type": "coding",
            "canonicalSolution": generate_solution_stub("python"),
            "testCases": {
                "inputs": ["test_input_1", "test_input_2"],
                "outputs": ["expected_output_1", "expected_output_2"],
                "examples": [
                    {
                        "input": "sample_input",
                        "output": "sample_output",
                        "explanation": "Mock test case"
                    }
                ]
            },
            "status": "pending_review",
            "aiGenerated": False,
            "source": "web_scraped",
            "metadata": {
                "sourceUrl": url,
                "platform": detected_platform,
                "scrapedAt": datetime.now().isoformat(),
                "isMock": True
            }
        })
    
    return mock_questions



@app.get("/api/scrape-service/health")
async def scrape_service_health():
    """Health check for scraping service"""
    return {
        "success": True,
        "service": "Web Scraping Service",
        "status": "healthy",
        "timestamp": time.time()
    }

# @app.get("/health") already exists
def detect_platform_from_url(url):
    """Auto-detect the platform from URL"""
    if "leetcode.com" in url:
        return "leetcode"
    elif "hackerrank.com" in url:
        return "hackerrank"
    elif "stackoverflow.com" in url:
        return "stackoverflow"
    elif "codeforces.com" in url:
        return "codeforces"
    elif "geeksforgeeks.org" in url:
        return "geeksforgeeks"
    else:
        return "generic"

def scrape_stackoverflow_question(url):
    """Scrape Stack Overflow question"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(url, headers=headers)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Extract title
        title_element = soup.find('h1', class_='fs-headline1')
        title = title_element.text.strip() if title_element else "Stack Overflow Question"
        
        # Extract question body
        question_body = soup.find('div', class_='s-prose')
        problem_statement = question_body.get_text() if question_body else f"Question from Stack Overflow: {url}"
        
        # Extract tags
        tags = []
        tag_elements = soup.find_all('a', class_='post-tag')
        for tag in tag_elements:
            tags.append(tag.text.strip())
        
        # Extract code blocks
        code_blocks = soup.find_all('code')
        sample_solution = ""
        if code_blocks:
            sample_solution = f"# Sample code from Stack Overflow:\n{code_blocks[0].text}"
        
        return {
            "title": title,
            "problemStatement": problem_statement[:1500],  # Limit length
            "description": f"Scraped from Stack Overflow: {title}",
            "difficulty": "medium",  # Stack Overflow doesn't have difficulty levels
            "skillTags": tags[:8],  # Limit to 8 tags
            "type": "coding",
            "canonicalSolution": sample_solution or "# Stack Overflow solution would go here",
            "testCases": {
                "inputs": [],
                "outputs": [],
                "note": "Test cases not available from Stack Overflow"
            }
        }
        
    except Exception as e:
        print(f"Stack Overflow scraping error: {str(e)}")
        return None

def create_mock_questions(urls, platform):
    """Create mock questions for testing when scraping fails"""
    mock_questions = []
    
    for i, url in enumerate(urls):
        detected_platform = platform or detect_platform_from_url(url)
        
        mock_questions.append({
            "title": f"Sample {detected_platform.capitalize()} Problem {i+1}",
            "description": f"This is a mock description for a problem from {url}",
            "problemStatement": f"Given this sample problem from {detected_platform}, write an efficient solution.\n\nThis is mock data since actual scraping failed or is not implemented yet.",
            "difficulty": "medium",
            "skillTags": [detected_platform, "algorithm", "data-structures"],
            "type": "coding",
            "canonicalSolution": f"# Mock solution for {detected_platform} problem\ndef solution():\n    return 'mock answer'",
            "testCases": {
                "inputs": ["test_case_1", "test_case_2"],
                "outputs": ["expected_1", "expected_2"]
            },
            "sourceUrl": url,
            "platform": detected_platform
        })
    
    return mock_questions

def scrape_leetcode_question(url):
    """Scrape LeetCode question"""
    try:
        # Note: LeetCode requires proper headers and might have anti-bot protection
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(url, headers=headers)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Extract title
        title_element = soup.find('span', class_='mr-2')
        title = title_element.text.strip() if title_element else "LeetCode Problem"
        
        # Extract difficulty
        difficulty_element = soup.find('div', class_='bg-yellow')
        if not difficulty_element:
            difficulty_element = soup.find('div', class_='bg-olive')
        if not difficulty_element:
            difficulty_element = soup.find('div', class_='bg-pink')
        
        difficulty_text = difficulty_element.text.strip().lower() if difficulty_element else "medium"
        difficulty_map = {
            'easy': 'easy',
            'medium': 'medium', 
            'hard': 'hard'
        }
        difficulty = difficulty_map.get(difficulty_text, 'medium')
        
        # Extract problem statement (simplified)
        content_element = soup.find('div', class_='content__u3I1')
        problem_statement = content_element.get_text() if content_element else f"Problem from {url}"
        
        # Extract tags
        tags = []
        tag_elements = soup.find_all('a', class_='tag__2PqS')
        for tag in tag_elements:
            tags.append(tag.text.strip())
        
        return {
            "title": title,
            "problemStatement": problem_statement[:1000],  # Limit length
            "description": f"Scraped from LeetCode: {title}",
            "difficulty": difficulty,
            "skillTags": tags[:5],  # Limit to 5 tags
            "type": "coding",
            "canonicalSolution": "# LeetCode solution would go here\n# This is a placeholder for scraped content",
            "testCases": {
                "inputs": [],
                "outputs": [],
                "note": "Test cases would need to be extracted separately"
            }
        }
        
    except Exception as e:
        print(f"LeetCode scraping error: {str(e)}")
        return None

def scrape_hackerrank_question(url):
    """Scrape HackerRank question"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(url, headers=headers)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Extract title
        title_element = soup.find('h1', class_='ui-icon-label')
        title = title_element.text.strip() if title_element else "HackerRank Problem"
        
        # Extract problem statement
        problem_element = soup.find('div', class_='problem-statement')
        problem_statement = problem_element.get_text() if problem_element else f"Problem from {url}"
        
        return {
            "title": title,
            "problemStatement": problem_statement[:1000],
            "description": f"Scraped from HackerRank: {title}",
            "difficulty": "medium",  # HackerRank doesn't always show difficulty in URL
            "skillTags": ["hackerrank"],
            "type": "coding",
            "canonicalSolution": "# HackerRank solution placeholder",
            "testCases": {
                "inputs": [],
                "outputs": []
            }
        }
        
    except Exception as e:
        print(f"HackerRank scraping error: {str(e)}")
        return None

def scrape_generic_question(url):
    """Generic scraper for other platforms"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(url, headers=headers)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        title = soup.find('title')
        title_text = title.text.strip() if title else "Coding Problem"
        
        return {
            "title": title_text,
            "problemStatement": f"Problem scraped from: {url}",
            "description": f"Scraped from: {url}",
            "difficulty": "medium",
            "skillTags": ["coding", "algorithm"],
            "type": "coding",
            "canonicalSolution": "# Generic solution placeholder",
            "testCases": {
                "inputs": [],
                "outputs": []
            }
        }
        
    except Exception as e:
        print(f"Generic scraping error: {str(e)}")
        return None


#  this to your existing health check if you have one
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "success": True,
        "service": "AI Question Generation & Web Scraping",
        "status": "healthy",
        "timestamp": time.time()
    })

# =============================================================================
# SCRAPING ROUTES - REFACTORED VERSION
# Replace your existing scraping routes with these
# =============================================================================


# Get global orchestrator instance
scraping_orchestrator = get_orchestrator()


# =============================================================================
# INDIVIDUAL SOURCE ROUTES
# =============================================================================

@app.post("/scraping/leetcode/run")
async def run_leetcode_scraping(max_items: int = 500):
    """
    Run LeetCode scraping job.
    Routes just trigger - NO business logic here.
    """
    return await scraping_orchestrator.run_scraping("leetcode", max_items)


@app.post("/scraping/github/run")
async def run_github_scraping(
    max_items: int = 200,
    max_pages: int = 5,              # interpreted as max_repos
    max_depth: int = 2,
    per_repo_max_files: int = 60,
    use_search: bool = True,
    search_pages: int = 2,
):
    return await scraping_orchestrator.run_scraping(
        "github",
        max_items,
        max_pages=max_pages,
        max_depth=max_depth,
        per_repo_max_files=per_repo_max_files,
        use_search=use_search,
        search_pages=search_pages,
    )

@app.post("/scraping/stackoverflow/run")
async def run_stackoverflow_scraping(
    max_items: int = 30,
    max_pages: int = 2,
    auto: bool = True,
    hard_cap: int = 5000,
    stop_after_empty_pages: int = 3,
):
    """Run StackOverflow scraping job"""
    return await scraping_orchestrator.run_scraping(
        "stackoverflow",
        max_items,
        max_pages=max_pages,
        auto=auto,
        hard_cap=hard_cap,
        stop_after_empty_pages=stop_after_empty_pages,
    )



@app.post("/scraping/hackerrank/run")
async def run_hackerrank_scraping(
    max_items: int = 500,
    pages_per_track: int = 10,
):
    """
    Run HackerRank scraping job.

    - pages_per_track: how many offset pages to fetch FOR EACH track
    - max_items: global cap in orchestrator (if it enforces it)
    """
    return await scraping_orchestrator.run_scraping(
        "hackerrank",
        max_items,
        max_pages=pages_per_track,  # keep orchestrator arg name unchanged
    )

# =============================================================================
# BATCH SCRAPING ROUTE
# =============================================================================

@app.post("/scraping/batch")
async def run_batch_scraping(request: Dict[str, Any]):
    """
    Run batch scraping for multiple sources.
    
    Body:
        {
            "sources": ["leetcode", "github", "stackoverflow", "hackerrank"],
            "max_items": 50
        }
    """
    sources = request.get("sources", ["leetcode"])
    max_items = request.get("max_items", 50)
    
    return await scraping_orchestrator.run_batch_scraping(sources, max_items)


# =============================================================================
# SCHEDULER ENDPOINT (FOR NODE-CRON)
# =============================================================================

@app.post("/scrape")
async def scheduler_scrape_endpoint(request: Dict[str, Any]):
    source = request.get("source")
    max_problems = request.get("max_problems", 50)
    max_pages = request.get("max_pages", 3)

    if not source:
        raise HTTPException(status_code=400, detail="Source is required")

    result = await scraping_orchestrator.execute_scheduled_job(
        source,
        max_problems,
        max_pages=max_pages
    )

    return {
        "success": result["status"] == "completed",
        "patterns": result.get("patterns_scraped", 0),
        "count": result.get("patterns_scraped", 0),
        "job_log": result
    }


# =============================================================================
# HEALTH CHECK ROUTES
# =============================================================================

@app.get("/scraping/health")
async def scraping_health_check():
    """Check health of all spiders"""
    return scraping_orchestrator.health_check()


@app.get("/scraping/status")
async def get_scraping_status():
    """Get current scraping service status"""
    health = scraping_orchestrator.health_check()
    
    return {
        "service": "scraping",
        "status": health["status"],
        "available_sources": list(scraping_orchestrator.spiders.keys()),
        "spiders": health["spiders"],
        "healthy_count": health["healthy_count"],
        "total_count": health["total_count"]
    }



# =============================================================================
# USER-FACING PATTERN EXTRACTION FROM URLs
# =============================================================================

# =============================================================================
# USER-FACING PATTERN EXTRACTION FROM URLs
# =============================================================================
@app.post("/extract-patterns-from-urls")
async def extract_patterns_from_urls(request: Dict[str, Any]):
    """
    Extract algorithm patterns from user-provided URLs.
    
    Body:
        {
            "urls": ["https://leetcode.com/problems/two-sum/"],
            "platform": "leetcode"  # or "github", "stackoverflow", "hackerrank"
        }
    
    Returns patterns in the format expected by Node.js backend
    """
    try:
        urls = request.get("urls", [])
        platform = request.get("platform")
        
        if not urls:
            raise HTTPException(status_code=400, detail="URLs are required")
        
        if not platform:
            raise HTTPException(status_code=400, detail="Platform is required")
        
        print(f"🔍 [USER PATTERN EXTRACTION] Extracting patterns from {len(urls)} URLs on {platform}")
        
        # Get the pattern extractor
        extractor = UnifiedPatternExtractor()
        
        all_patterns = []
        
        for url in urls:
            try:
                print(f"📥 [USER EXTRACTION] Processing URL: {url}")
                
                # Extract pattern based on platform
                if platform == "leetcode":
                    # Extract slug from URL
                    import re
                    match = re.search(r'/problems/([^/?]+)', url)
                    if not match:
                        print(f"⚠️ Could not extract slug from {url}")
                        continue
                    
                    slug = match.group(1)
                    spider = LeetCodePatternSpider()
                    
                    # Fetch metadata
                    meta = spider._fetch_meta(slug)
                    if not meta:
                        print(f"⚠️ Could not fetch metadata for {slug}")
                        continue
                    
                    # Extract pattern
                    pattern_data = spider._extract_pattern(meta)
                    
                    # Convert to expected format
                    pattern = {
                        "source": "leetcode",
                        "source_id": slug,
                        "pattern": pattern_data.get("pattern", "general_algorithm"),
                        "domain": pattern_data.get("domain", "algorithms"),
                        "difficulty": pattern_data.get("difficulty", "medium"),
                        "tags": pattern_data.get("tags", []),
                        "constraints": pattern_data.get("constraints", {}),
                        "input_structure": pattern_data.get("input_structure", {}),
                        "extracted_at": int(time.time())
                    }
                    
                    all_patterns.append(pattern)
                    print(f"✅ Extracted pattern: {pattern.get('pattern')} from {slug}")
                
                elif platform == "github":
                    # GitHub repository URL
                    print(f"📥 [GITHUB] Processing repository URL: {url}")
                    
                    # Extract owner and repo from URL
                    import re
                    match = re.search(r'github\.com/([^/]+)/([^/]+)', url)
                    if not match:
                        print(f"⚠️ Could not extract owner/repo from {url}")
                        continue
                    
                    owner = match.group(1)
                    repo = match.group(2).rstrip('/')
                    
                    print(f"👤 Owner: {owner}, 📁 Repo: {repo}")
                    
                    # Fetch repository file structure using GitHub API
                    api_url = f"https://api.github.com/repos/{owner}/{repo}/contents"
                    
                    headers = {
                        "Accept": "application/vnd.github.v3+json",
                        "User-Agent": "Mozilla/5.0"
                    }
                    
                    try:
                        response = requests.get(api_url, headers=headers, timeout=10)
                        
                        if response.status_code != 200:
                            print(f"⚠️ GitHub API error: {response.status_code}")
                            continue
                        
                        contents = response.json()
                        
                        # Look for algorithm files
                        algorithm_files = []
                        
                        for item in contents:
                            if item["type"] == "file" and item["name"].endswith((".py", ".js", ".java", ".cpp", ".c")):
                                algorithm_files.append(item)
                            elif item["type"] == "dir":
                                # Check common algorithm directories
                                dir_name_lower = item["name"].lower()
                                if any(keyword in dir_name_lower for keyword in ["algorithm", "sort", "search", "tree", "graph", "dp", "dynamic", "data-structure"]):
                                    # Fetch directory contents
                                    try:
                                        dir_response = requests.get(item["url"], headers=headers, timeout=10)
                                        if dir_response.status_code == 200:
                                            dir_contents = dir_response.json()
                                            algorithm_files.extend([f for f in dir_contents if f.get("type") == "file" and f.get("name", "").endswith((".py", ".js", ".java", ".cpp", ".c"))])
                                    except Exception as e:
                                        print(f"⚠️ Error fetching directory {item['name']}: {e}")
                                        continue
                        
                        print(f"📂 Found {len(algorithm_files)} algorithm files")
                        
                        # Extract patterns from files (limit to first 10)
                        for file_item in algorithm_files[:10]:
                            try:
                                file_name = file_item["name"]
                                download_url = file_item.get("download_url")
                                
                                if not download_url:
                                    continue
                                
                                # Detect pattern from filename
                                pattern_name = "general_algorithm"
                                
                                filename_lower = file_name.lower()
                                
                                # Pattern detection from filename
                                if "sort" in filename_lower:
                                    if "quick" in filename_lower:
                                        pattern_name = "quicksort"
                                    elif "merge" in filename_lower:
                                        pattern_name = "merge_sort"
                                    elif "bubble" in filename_lower:
                                        pattern_name = "bubble_sort"
                                    else:
                                        pattern_name = "sorting"
                                elif "search" in filename_lower or "binary" in filename_lower:
                                    pattern_name = "binary_search"
                                elif "tree" in filename_lower:
                                    if "bst" in filename_lower or "binary" in filename_lower:
                                        pattern_name = "binary_tree"
                                    else:
                                        pattern_name = "tree_traversal"
                                elif "graph" in filename_lower:
                                    if "dfs" in filename_lower:
                                        pattern_name = "depth_first_search"
                                    elif "bfs" in filename_lower:
                                        pattern_name = "breadth_first_search"
                                    else:
                                        pattern_name = "graph_traversal"
                                elif "dp" in filename_lower or "dynamic" in filename_lower:
                                    pattern_name = "dynamic_programming"
                                elif "array" in filename_lower:
                                    pattern_name = "array_manipulation"
                                elif "string" in filename_lower:
                                    pattern_name = "string_processing"
                                elif "linked" in filename_lower or "list" in filename_lower:
                                    pattern_name = "linked_list"
                                elif "hash" in filename_lower:
                                    pattern_name = "hash_table"
                                elif "two" in filename_lower and "pointer" in filename_lower:
                                    pattern_name = "two_pointers"
                                
                                # Determine language
                                if file_name.endswith(".py"):
                                    language = "python"
                                elif file_name.endswith(".js"):
                                    language = "javascript"
                                elif file_name.endswith(".java"):
                                    language = "java"
                                elif file_name.endswith(".cpp") or file_name.endswith(".c"):
                                    language = "cpp"
                                else:
                                    language = "unknown"
                                
                                # Estimate difficulty based on file complexity (simple heuristic)
                                difficulty = "medium"  # Default
                                if any(keyword in filename_lower for keyword in ["easy", "basic", "simple"]):
                                    difficulty = "easy"
                                elif any(keyword in filename_lower for keyword in ["hard", "advanced", "complex"]):
                                    difficulty = "hard"
                                
                                pattern = {
                                    "source": "github",
                                    "source_id": f"{owner}/{repo}/{file_name}",
                                    "pattern": pattern_name,
                                    "domain": "algorithms",
                                    "difficulty": difficulty,
                                    "tags": [language, pattern_name.replace("_", "-")],
                                    "constraints": {},
                                    "input_structure": {},
                                    "extracted_at": int(time.time()),
                                    "metadata": {
                                        "repository": f"{owner}/{repo}",
                                        "file_name": file_name,
                                        "language": language
                                    }
                                }
                                
                                all_patterns.append(pattern)
                                print(f"✅ Extracted pattern '{pattern_name}' from {file_name}")
                                
                            except Exception as e:
                                print(f"⚠️ Error processing file {file_item.get('name')}: {e}")
                                continue
                    
                    except Exception as e:
                        print(f"❌ Error accessing GitHub API: {e}")
                        continue
                
                elif platform == "stackoverflow":
                    # StackOverflow question URL
                    import re
                    match = re.search(r'/questions/(\d+)/', url)
                    if not match:
                        print(f"⚠️ Could not extract question ID from {url}")
                        continue
                    
                    question_id = match.group(1)
                    
                    # Fetch question using StackExchange API
                    api_url = f"https://api.stackexchange.com/2.3/questions/{question_id}"
                    params = {
                        "site": "stackoverflow",
                        "filter": "withbody"
                    }
                    
                    print(f"🔍 Fetching SO question {question_id}...")
                    response = requests.get(api_url, params=params, timeout=10)
                    
                    if response.status_code != 200:
                        print(f"⚠️ StackExchange API error: {response.status_code}")
                        continue
                    
                    data = response.json()
                    
                    if not data.get("items"):
                        print(f"⚠️ No question data found for {question_id}")
                        continue
                    
                    question = data["items"][0]
                    title = question.get("title", "")
                    tags = question.get("tags", [])
                    body = question.get("body", "")
                    
                    print(f"📝 SO Question: {title}")
                    print(f"🏷️ Tags: {tags}")
                    
                    # Extract pattern from title and tags
                    pattern_name = "general_algorithm"
                    domain = "algorithms"
                    
                    # Detect pattern from tags
                    tag_to_pattern = {
                        "arrays": "array_manipulation",
                        "array": "array_manipulation",
                        "string": "string_processing",
                        "recursion": "recursion",
                        "dynamic-programming": "dynamic_programming",
                        "sorting": "sorting",
                        "hash-table": "hash_table",
                        "hashtable": "hash_table",
                        "binary-search": "binary_search",
                        "tree": "tree_traversal",
                        "binary-tree": "binary_tree",
                        "graph": "graph_traversal",
                        "linked-list": "linked_list",
                        "two-pointers": "two_pointers",
                        "sliding-window": "sliding_window",
                        "greedy": "greedy_algorithm",
                        "backtracking": "backtracking",
                        "dfs": "depth_first_search",
                        "bfs": "breadth_first_search",
                        "queue": "queue_operations",
                        "stack": "stack_operations"
                    }
                    
                    # Check tags for pattern
                    for tag in tags:
                        if tag in tag_to_pattern:
                            pattern_name = tag_to_pattern[tag]
                            break
                    
                    # If no pattern found in tags, check title
                    if pattern_name == "general_algorithm":
                        title_lower = title.lower()
                        for keyword, pattern in tag_to_pattern.items():
                            if keyword.replace("-", " ") in title_lower:
                                pattern_name = pattern
                                break
                    
                    # Determine domain from tags
                    if any(t in tags for t in ["python", "javascript", "java", "c++", "c#", "ruby", "go", "rust"]):
                        domain = "programming"
                    elif any(t in tags for t in ["algorithm", "data-structures"]):
                        domain = "algorithms"
                    elif any(t in tags for t in ["database", "sql", "mysql", "postgresql"]):
                        domain = "database"
                    
                    # Estimate difficulty based on question score
                    score = question.get("score", 0)
                    if score < 10:
                        difficulty = "easy"
                    elif score < 50:
                        difficulty = "medium"
                    else:
                        difficulty = "hard"
                    
                    pattern = {
                        "source": "stackoverflow",
                        "source_id": str(question_id),
                        "pattern": pattern_name,
                        "domain": domain,
                        "difficulty": difficulty,
                        "tags": tags[:10],  # Limit tags
                        "constraints": {},
                        "input_structure": {},
                        "extracted_at": int(time.time()),
                        "metadata": {
                            "title": title,
                            "score": score,
                            "view_count": question.get("view_count", 0),
                            "answer_count": question.get("answer_count", 0)
                        }
                    }
                    all_patterns.append(pattern)
                    
                    print(f"✅ Extracted pattern '{pattern_name}' from SO question {question_id}")
                
                elif platform == "hackerrank":
                    # HackerRank challenge URL
                    import re
                    match = re.search(r'/challenges/([^/?]+)', url)
                    if not match:
                        print(f"⚠️ Could not extract challenge slug from {url}")
                        continue
                    
                    slug = match.group(1)
                    
                    # Pattern detection from slug
                    pattern_name = "general_algorithm"
                    slug_lower = slug.lower()
                    
                    # Common HackerRank challenge patterns
                    if "sort" in slug_lower:
                        pattern_name = "sorting"
                    elif "search" in slug_lower:
                        pattern_name = "binary_search"
                    elif "array" in slug_lower:
                        pattern_name = "array_manipulation"
                    elif "string" in slug_lower:
                        pattern_name = "string_processing"
                    elif "tree" in slug_lower:
                        pattern_name = "tree_traversal"
                    elif "graph" in slug_lower:
                        pattern_name = "graph_traversal"
                    elif "dp" in slug_lower or "dynamic" in slug_lower:
                        pattern_name = "dynamic_programming"
                    elif "greedy" in slug_lower:
                        pattern_name = "greedy_algorithm"
                    
                    pattern = {
                        "source": "hackerrank",
                        "source_id": slug,
                        "pattern": pattern_name,
                        "domain": "algorithms",
                        "difficulty": "medium",  # Default
                        "tags": [slug.replace("-", "_")],
                        "constraints": {},
                        "input_structure": {},
                        "extracted_at": int(time.time()),
                        "metadata": {
                            "challenge_slug": slug
                        }
                    }
                    all_patterns.append(pattern)
                    print(f"✅ Extracted pattern '{pattern_name}' from HackerRank challenge {slug}")
                
            except Exception as e:
                print(f"❌ Error processing URL {url}: {e}")
                continue
        
        print(f"🎉 [USER EXTRACTION] Successfully extracted {len(all_patterns)} patterns")
        
        return {
            "success": True,
            "message": f"Extracted {len(all_patterns)} patterns from {len(urls)} URLs",
            "patterns": all_patterns,
            "total_urls": len(urls),
            "successful_extractions": len(all_patterns),
            "failed_extractions": len(urls) - len(all_patterns)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in user pattern extraction: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Pattern extraction failed: {str(e)}"
        )

# Add this endpoint to your Python FastAPI app

@app.post("/generate-question-from-pattern")
async def generate_question_from_pattern(request: Dict[str, Any]):
    """
    Generate a COMPLETE question from an extracted pattern using REAL Gemini AI.
    
    Body:
        {
            "pattern": {
                "source": "leetcode",
                "source_id": "two-sum",
                "pattern": "two_pointers",
                "domain": "algorithms",
                "difficulty": "medium",
                "tags": ["array", "hash-table"],
                "constraints": {...},
                "input_structure": {...}
            },
            "difficulty": "medium",
            "user_context": "Generate for user..."
        }
    """
    try:
        pattern = request.get("pattern")
        difficulty = request.get("difficulty", "medium")
        user_context = request.get("user_context", "")
        
        if not pattern:
            raise HTTPException(status_code=400, detail="Pattern is required")
        
        print(f"🤖 [GENERATE FROM PATTERN] Generating COMPLETE question from pattern: {pattern.get('pattern')}")
        
        # ✅ FIX: Use REAL Gemini AI service instead of simple generation
        if not GEMINI_AVAILABLE:
            raise HTTPException(
                status_code=503,
                detail="Gemini AI service not available"
            )
        
        # Build a detailed topic description from pattern
        pattern_name = pattern.get("pattern", "general_algorithm")
        pattern_domain = pattern.get("domain", "algorithms")
        pattern_tags = pattern.get("tags", [])
        pattern_constraints = pattern.get("constraints", {})
        
        # Create a rich topic description for Gemini
        topic_parts = [
            f"{pattern_domain}",
            f"{pattern_name.replace('_', ' ')} pattern"
        ]
        
        if pattern_tags and len(pattern_tags) > 0:
            topic_parts.append(f"involving {', '.join(pattern_tags[:3])}")
        
        if pattern_constraints:
            constraint_desc = ", ".join([f"{k}: {v}" for k, v in pattern_constraints.items()])
            if constraint_desc:
                topic_parts.append(f"with constraints: {constraint_desc}")
        
        topic = " ".join(topic_parts)
        
        print(f"📝 [GENERATE FROM PATTERN] Generated topic: {topic}")
        print(f"🎯 [GENERATE FROM PATTERN] Difficulty: {difficulty}")
        
        # ✅ FIX: Generate COMPLETE question using Gemini (same method as /generate endpoint)
        ai_result = gemini_ai_service.generate_question(topic, difficulty)
        
        if not ai_result["success"] or not ai_result.get("data"):
            raise HTTPException(
                status_code=500,
                detail=f"AI generation failed: {ai_result.get('error', 'Unknown error')}"
            )
        
        # Get the complete question data from Gemini
        question = ai_result["data"]
        
        # ✅ Enhance the generated question with pattern metadata
        enhanced_question = {
            # Use Gemini-generated content
            "title": f"{pattern_name.replace('_', ' ').title()} - {question.get('title', 'Problem')}",
            "description": question.get("explanation", f"Pattern-based problem: {pattern_name}"),
            "problem_statement": question.get("problemStatement", question.get("problem_statement", "")),
            "difficulty": difficulty,
            "skill_tags": list(set((question.get("skillTags", []) or []) + pattern_tags[:5])),
            "type": "coding",
            
            # Use Gemini-generated solution and test cases
            "solution": question.get("canonicalSolution", question.get("canonical_solution", "")),
            "test_cases": question.get("testCases", question.get("test_cases", {})),
            
            # Pattern metadata
            "metadata": {
                "generated_from_pattern": True,
                "pattern_name": pattern_name,
                "pattern_domain": pattern_domain,
                "pattern_tags": pattern_tags,
                "original_pattern_source": pattern.get("source"),
                "original_pattern_id": pattern.get("source_id"),
                "pattern_constraints": pattern_constraints,
                "user_context": user_context,
                "generated_at": datetime.now().isoformat(),
                "ai_source": "gemini"
            }
        }
        
        print(f"✅ [GENERATE FROM PATTERN] Generated complete question: {enhanced_question['title']}")
        print(f"📊 [GENERATE FROM PATTERN] Content lengths - Problem: {len(enhanced_question.get('problem_statement', ''))}, Solution: {len(enhanced_question.get('solution', ''))}")
        
        return {
            "success": True,
            "question": enhanced_question,
            "metadata": {
                "pattern_used": pattern_name,
                "difficulty": difficulty,
                "user_context": user_context,
                "ai_service": "gemini"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generating question from pattern: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Question generation from pattern failed: {str(e)}"
        )
def extract_stackoverflow_id(url: str) -> Optional[str]:
    """Extract question ID from StackOverflow URL"""
    try:
        match = re.search(r'/questions/(\d+)/', url)
        return match.group(1) if match else None
    except Exception as e:
        logger.error(f"Error extracting SO ID from {url}: {e}")
        return None


def extract_hackerrank_slug(url: str) -> Optional[str]:
    """Extract challenge slug from HackerRank URL"""
    try:
        match = re.search(r'/challenges/([^/?]+)', url)
        return match.group(1) if match else None
    except Exception as e:
        logger.error(f"Error extracting HackerRank slug from {url}: {e}")
        return None

# Initialiser le service de vetting (avec variables d'environnement)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6380/1")
SANDBOX_URL = os.getenv("SANDBOX_SERVICE_URL", "localhost:50054")

vetting_service = VettingPipelineService(
    redis_url=REDIS_URL,
    sandbox_url=SANDBOX_URL
)


# Ajouter les routes
@app.post("/vetting/process")
async def process_question(request: Dict[str, Any]):
    """Process a single question through vetting pipeline"""
    try:
        question = request.get("question")
        if not question:
            raise HTTPException(status_code=400, detail="Question is required")
        
        result = vetting_service.process_question(question)
        return {
            "success": True,
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/vetting/batch-process")
async def batch_process_questions(request: Dict[str, Any]):
    """Process multiple questions"""
    try:
        questions = request.get("questions", [])
        if not questions:
            raise HTTPException(status_code=400, detail="Questions list is required")
        
        result = vetting_service.batch_process(questions)
        return {
            "success": True,
            **result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/vetting/stats")
async def get_vetting_stats():
    """Get pipeline statistics"""
    return {
        "success": True,
        "stats": vetting_service.get_pipeline_stats()
    }

@app.get("/vetting/health")
async def vetting_health():
    """Health check for vetting pipeline"""
    try:
        stats = vetting_service.get_pipeline_stats()
        return {
            "status": "healthy",
            "sandbox_connected": stats['sandbox_connected'],
            "redis_connected": stats['redis_connected']
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
    
#added a router of from pattern to questions 
app.include_router(questions_from_pattern_router, tags=["questions"])

# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    print("🌐 Starting FastAPI server on http://0.0.0.0:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)