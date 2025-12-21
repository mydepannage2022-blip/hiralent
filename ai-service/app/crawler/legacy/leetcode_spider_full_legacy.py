"""
LeetCode Spider - Scrapes programming problems from LeetCode with complete details
"""
from base_spider import BaseSpider
from bs4 import BeautifulSoup
import json
import re
from typing import List, Dict, Optional, Any
import logging
import time
from urllib.parse import urljoin
import requests
import html

logger = logging.getLogger(__name__)

class LeetCodeSpider(BaseSpider):
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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Content-Type': 'application/json',
        })

    def get_detailed_problem_info(self, title_slug: str) -> Optional[Dict]:
        """
        Get detailed problem information including description, test cases and solutions via GraphQL API
        """
        query = """
        query questionData($titleSlug: String!) {
            question(titleSlug: $titleSlug) {
                questionId
                questionFrontendId
                title
                titleSlug
                content
                difficulty
                categoryTitle
                likes
                dislikes
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
                topicTags {
                    name
                    slug
                }
                stats
                similarQuestions
            }
        }
        """
        
        variables = {"titleSlug": title_slug}
        
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': f'https://leetcode.com/problems/{title_slug}/',
            'Origin': 'https://leetcode.com',
            'Accept': 'application/json',
        }
        
        try:
            logger.info(f"🔍 Fetching detailed data for: {title_slug}")
            response = requests.post(
                "https://leetcode.com/graphql",
                json={'query': query, 'variables': variables},
                headers=headers,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'data' in data and data['data']['question']:
                    question_data = data['data']['question']
                    logger.info(f"✅ Successfully retrieved problem: {question_data.get('title')}")
                    return question_data
                else:
                    logger.error(f"❌ No question data in response for: {title_slug}")
                    return None
            else:
                logger.error(f"❌ HTTP Error {response.status_code} for: {title_slug}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error fetching {title_slug}: {str(e)}")
            return None

    def clean_html_content(self, html_content: str) -> str:
        """
        Clean HTML content and convert to readable text
        """
        if not html_content:
            return ""
        
        try:
            # Parse HTML
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
            
            # Handle code blocks specially
            for code in soup.find_all('code'):
                code.string = f"`{code.get_text()}`"
            
            for pre in soup.find_all('pre'):
                pre.string = f"\n```\n{pre.get_text()}\n```\n"
            
            # Handle lists
            for ul in soup.find_all('ul'):
                for li in ul.find_all('li'):
                    li.string = f"• {li.get_text()}"
            
            for ol in soup.find_all('ol'):
                for i, li in enumerate(ol.find_all('li'), 1):
                    li.string = f"{i}. {li.get_text()}"
            
            # Get text
            text = soup.get_text(separator='\n')
            
            # Clean up whitespace
            lines = [line.strip() for line in text.split('\n')]
            text = '\n'.join(line for line in lines if line)
            
            # Decode HTML entities
            text = html.unescape(text)
            
            # Remove excessive newlines
            text = re.sub(r'\n{3,}', '\n\n', text)
            
            return text.strip()
            
        except Exception as e:
            logger.error(f"Error cleaning HTML: {e}")
            return html_content

    def parse_test_cases_from_content(self, content: str, example_testcases: str = "") -> List[Dict]:
        """
        Parse test cases from problem content and example testcases
        """
        test_cases = []
        
        try:
            # Method 1: Parse from HTML content (Examples section)
            if content:
                # Find Example patterns
                example_pattern = r'Example\s*\d*:?\s*Input:\s*([^\n]+)\s*Output:\s*([^\n]+)'
                matches = re.findall(example_pattern, content, re.IGNORECASE | re.DOTALL)
                
                for match in matches:
                    input_val = match[0].strip()
                    output_val = match[1].strip()
                    
                    # Clean up the values
                    input_val = re.sub(r'<[^>]+>', '', input_val).strip()
                    output_val = re.sub(r'<[^>]+>', '', output_val).strip()
                    
                    if input_val and output_val:
                        test_cases.append({
                            "input": input_val,
                            "output": output_val
                        })
            
            # Method 2: Parse from exampleTestcases field
            if example_testcases and not test_cases:
                lines = example_testcases.strip().split('\n')
                # Group lines into test cases (this varies by problem)
                current_input = []
                for line in lines:
                    line = line.strip()
                    if line:
                        current_input.append(line)
                
                # For simple cases, treat each line as a separate input
                if current_input:
                    test_cases.append({
                        "input": '\n'.join(current_input),
                        "output": ""  # Output not always available
                    })
            
        except Exception as e:
            logger.error(f"Error parsing test cases: {e}")
        
        return test_cases

    def extract_canonical_solution(self, code_snippets: List[Dict]) -> str:
        """Extract canonical solution template from code snippets"""
        if not code_snippets:
            return ""
        
        # Prefer Python3, then Python, then Java, then any
        preferred_langs = ['python3', 'python', 'java', 'javascript', 'cpp']
        
        for lang in preferred_langs:
            for snippet in code_snippets:
                if snippet.get('langSlug', '').lower() == lang:
                    return snippet.get('code', '')
        
        # Fallback to first available
        return code_snippets[0].get('code', '') if code_snippets else ""

    def format_problem_for_database(self, problem_data: Dict) -> Dict:
        """
        Format the scraped problem data for database storage
        """
        # Clean the HTML content to get readable description
        raw_content = problem_data.get('content', '')
        clean_description = self.clean_html_content(raw_content)
        
        # Parse test cases
        test_cases = self.parse_test_cases_from_content(
            raw_content, 
            problem_data.get('exampleTestcases', '')
        )
        
        # Format test cases for database
        formatted_test_cases = []
        for tc in test_cases:
            formatted_test_cases.append({
                "input": tc.get("input", ""),
                "output": tc.get("output", "")
            })
        
        # If no test cases found, create from exampleTestcases
        if not formatted_test_cases and problem_data.get('exampleTestcases'):
            example_lines = problem_data.get('exampleTestcases', '').strip().split('\n')
            formatted_test_cases.append({
                "input": '\n'.join(example_lines),
                "output": ""
            })
        
        # Extract code snippets
        code_snippets = problem_data.get('codeSnippets', [])
        canonical_solution = self.extract_canonical_solution(code_snippets)
        
        # Extract topic tags
        topic_tags = [tag['name'] for tag in problem_data.get('topicTags', [])]
        
        # Build the formatted problem
        formatted_problem = {
            # Basic info
            'title': problem_data.get('title', ''),
            'description': clean_description,  # ✅ NOW INCLUDES THE PROBLEM DESCRIPTION
            'problemStatement': clean_description,  # ✅ SAME AS DESCRIPTION
            'difficulty': problem_data.get('difficulty', 'Medium').lower(),
            
            # Classification
            'type': 'coding',
            'skillTags': topic_tags,
            
            # Solution and tests
            'canonicalSolution': canonical_solution,
            'testCases': formatted_test_cases,
            
            # Metadata
            'source': 'leetcode',
            'sourceUrl': f"https://leetcode.com/problems/{problem_data.get('titleSlug', '')}/",
            'leetcodeId': problem_data.get('questionFrontendId', ''),
            'status': 'pending_review',
            'aiGenerated': False,
            
            # Additional LeetCode specific data
            'hints': problem_data.get('hints', []),
            'categoryTitle': problem_data.get('categoryTitle', ''),
        }
        
        return formatted_problem

    def scrape_problem_by_slug(self, title_slug: str) -> Optional[Dict]:
        """
        Scrape a single problem by its title slug
        Returns formatted problem ready for database
        """
        try:
            # Get detailed problem info
            problem_data = self.get_detailed_problem_info(title_slug)
            
            if not problem_data:
                logger.error(f"❌ Could not fetch problem: {title_slug}")
                return None
            
            # Format for database
            formatted_problem = self.format_problem_for_database(problem_data)
            
            logger.info(f"✅ Successfully scraped: {formatted_problem['title']}")
            logger.info(f"   - Description: {len(formatted_problem['description'])} chars")
            logger.info(f"   - Test cases: {len(formatted_problem['testCases'])}")
            logger.info(f"   - Tags: {formatted_problem['skillTags']}")
            
            return formatted_problem
            
        except Exception as e:
            logger.error(f"❌ Error scraping {title_slug}: {e}")
            return None

    def scrape_problems_by_urls(self, urls: List[str]) -> List[Dict]:
        """
        Scrape multiple problems from URLs
        """
        problems = []
        
        for url in urls:
            try:
                # Extract title slug from URL
                match = re.search(r'/problems/([^/]+)/?', url)
                if not match:
                    logger.error(f"❌ Invalid LeetCode URL: {url}")
                    continue
                
                title_slug = match.group(1)
                
                # Scrape the problem
                problem = self.scrape_problem_by_slug(title_slug)
                
                if problem:
                    problems.append(problem)
                
                # Be respectful - add delay between requests
                time.sleep(1.5)
                
            except Exception as e:
                logger.error(f"❌ Error processing URL {url}: {e}")
                continue
        
        logger.info(f"🎯 Successfully scraped {len(problems)} out of {len(urls)} problems")
        return problems

    def get_problem_list(self, limit: int = 20, skip: int = 0) -> List[Dict]:
        """
        Get list of problems from LeetCode API
        """
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
                    paidOnly: isPaidOnly
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
            "skip": skip,
            "limit": limit,
            "filters": {}
        }
        
        try:
            response = requests.post(
                self.api_base,
                json={'query': query, 'variables': variables},
                headers={
                    'Content-Type': 'application/json',
                    'Referer': 'https://leetcode.com/problemset/all/',
                    'Origin': 'https://leetcode.com',
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                questions = data.get('data', {}).get('problemsetQuestionList', {}).get('questions', [])
                
                # Filter out paid problems
                free_questions = [q for q in questions if not q.get('paidOnly', False)]
                
                return free_questions
            else:
                logger.error(f"❌ API error: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"❌ Error getting problem list: {e}")
            return []

    def crawl(self, max_problems: int = 10) -> List[Dict]:
        """
        Crawl LeetCode and return formatted problems
        """
        all_problems = []
        
        try:
            # Get problem list
            logger.info(f"📋 Fetching problem list (limit: {max_problems})...")
            problem_list = self.get_problem_list(limit=max_problems)
            
            logger.info(f"📝 Found {len(problem_list)} free problems")
            
            # Scrape each problem with details
            for i, problem_info in enumerate(problem_list):
                try:
                    title_slug = problem_info.get('titleSlug')
                    if not title_slug:
                        continue
                    
                    logger.info(f"📄 [{i+1}/{len(problem_list)}] Scraping: {problem_info.get('title')}")
                    
                    # Get full problem details
                    formatted_problem = self.scrape_problem_by_slug(title_slug)
                    
                    if formatted_problem:
                        all_problems.append(formatted_problem)
                    
                    # Rate limiting
                    time.sleep(2)
                    
                except Exception as e:
                    logger.error(f"❌ Error scraping problem: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"❌ Crawl error: {e}")
        
        logger.info(f"🎯 Total problems scraped: {len(all_problems)}")
        return all_problems

    def health_check(self) -> Dict:
        """
        Check if LeetCode scraping is working
        """
        try:
            # Test with a known problem
            test_slug = "two-sum"
            problem_data = self.get_detailed_problem_info(test_slug)
            
            if problem_data:
                # Format the problem
                formatted = self.format_problem_for_database(problem_data)
                
                return {
                    "status": "healthy",
                    "message": "LeetCode scraping is working",
                    "test_problem": {
                        "title": formatted['title'],
                        "difficulty": formatted['difficulty'],
                        "description_length": len(formatted['description']),
                        "description_preview": formatted['description'][:500] + "..." if len(formatted['description']) > 500 else formatted['description'],
                        "test_cases_count": len(formatted['testCases']),
                        "tags": formatted['skillTags'],
                        "has_solution_template": bool(formatted['canonicalSolution']),
                    }
                }
            else:
                return {
                    "status": "unhealthy",
                    "message": "Could not fetch test problem"
                }
                
        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }


# Test the spider
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    print("=" * 70)
    print("🧪 Testing LeetCode Spider")
    print("=" * 70)
    
    spider = LeetCodeSpider()
    
    # Test 1: Health check
    print("\n📋 Test 1: Health Check")
    print("-" * 40)
    health = spider.health_check()
    print(f"Status: {health['status']}")
    print(f"Message: {health['message']}")
    
    if health['status'] == 'healthy':
        test_problem = health['test_problem']
        print(f"\n📝 Test Problem Details:")
        print(f"   Title: {test_problem['title']}")
        print(f"   Difficulty: {test_problem['difficulty']}")
        print(f"   Description Length: {test_problem['description_length']} chars")
        print(f"   Test Cases: {test_problem['test_cases_count']}")
        print(f"   Tags: {test_problem['tags']}")
        print(f"   Has Solution Template: {test_problem['has_solution_template']}")
        print(f"\n   Description Preview:")
        print(f"   {test_problem['description_preview']}")
    
    # Test 2: Scrape by URL
    print("\n" + "=" * 70)
    print("📋 Test 2: Scrape by URL")
    print("-" * 40)
    
    test_urls = [
        "https://leetcode.com/problems/two-sum/",
        "https://leetcode.com/problems/add-two-numbers/",
    ]
    
    problems = spider.scrape_problems_by_urls(test_urls)
    
    for problem in problems:
        print(f"\n✅ {problem['title']}")
        print(f"   Difficulty: {problem['difficulty']}")
        print(f"   Description: {len(problem['description'])} chars")
        print(f"   Test Cases: {len(problem['testCases'])}")
        print(f"   Tags: {problem['skillTags']}")

