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
import random

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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        })
        
        # Problem type mapping
        self.problem_types = {
            'coding': ['algorithm', 'data-structure', 'database', 'shell', 'concurrency'],
            'mcq': ['multiple-choice', 'concept'],
        }

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
                    'x-csrftoken': self.get_csrf_token(),
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

    def get_csrf_token(self) -> str:
        """Get CSRF token from the main page"""
        try:
            response = self.session.get("https://leetcode.com/")
            if response.status_code == 200:
                # Extract CSRF token from cookies or page
                csrf_token = self.session.cookies.get('csrftoken')
                if csrf_token:
                    return csrf_token
        except Exception as e:
            logger.error(f"Error getting CSRF token: {e}")
        return ""

    def parse_test_cases(self, problem_data: Dict) -> Dict[str, Any]:
        """
        Parse test cases from problem data
        Returns: { inputs: [], outputs: [] }
        """
        test_cases = {"inputs": [], "outputs": []}
        
        try:
            # Get sample test cases
            sample_test_case = problem_data.get('sampleTestCase', '')
            example_testcases = problem_data.get('exampleTestcases', '')
            example_testcase_list = problem_data.get('exampleTestcaseList', [])
            
            # Parse metadata for input/output structure
            metadata_str = problem_data.get('metaData', '{}')
            metadata = json.loads(metadata_str) if metadata_str else {}
            
            # Try multiple methods to extract test cases
            if example_testcase_list:
                # New format with list of test cases
                for test_case in example_testcase_list:
                    if test_case:
                        # Parse the test case (usually input and expected output)
                        parsed = self.parse_single_test_case(test_case, metadata)
                        if parsed:
                            test_cases["inputs"].append(parsed.get("input", ""))
                            test_cases["outputs"].append(parsed.get("output", ""))
            
            elif example_testcases:
                # Split multiple test cases (usually separated by newlines)
                cases = example_testcases.split('\n')
                for case in cases:
                    if case.strip():
                        parsed = self.parse_single_test_case(case, metadata)
                        if parsed:
                            test_cases["inputs"].append(parsed.get("input", ""))
                            test_cases["outputs"].append(parsed.get("output", ""))
            
            elif sample_test_case:
                # Single test case
                parsed = self.parse_single_test_case(sample_test_case, metadata)
                if parsed:
                    test_cases["inputs"].append(parsed.get("input", ""))
                    test_cases["outputs"].append(parsed.get("output", ""))
                    
        except Exception as e:
            logger.error(f"Error parsing test cases: {e}")
            
        return test_cases

    def parse_single_test_case(self, test_case: str, metadata: Dict) -> Optional[Dict]:
        """Parse a single test case string"""
        try:
            # This is a simplified parser - you may need to customize based on problem type
            if '\n' in test_case:
                # Multiple lines - might be input and output
                lines = test_case.strip().split('\n')
                if len(lines) >= 2:
                    return {"input": lines[0], "output": lines[1]}
            
            # For single line, try to extract based on metadata
            params = metadata.get('params', [])
            if len(params) == 1:
                # Single parameter input
                return {"input": test_case, "output": ""}
            else:
                # Multiple parameters - might be in format "param1\nparam2\nexpected"
                return {"input": test_case, "output": ""}
                
        except Exception as e:
            logger.error(f"Error parsing single test case: {e}")
            return {"input": test_case, "output": ""}

    def extract_canonical_solution(self, problem_data: Dict) -> str:
        """Extract canonical solution from problem data"""
        try:
            code_snippets = problem_data.get('codeSnippets', [])
            
            # Prefer Python 3 solution
            python_snippets = [s for s in code_snippets if s.get('langSlug') == 'python3']
            if python_snippets:
                return python_snippets[0].get('code', '')
            
            # Fallback to any available solution
            if code_snippets:
                return code_snippets[0].get('code', '')
                
        except Exception as e:
            logger.error(f"Error extracting canonical solution: {e}")
            
        return ""

    def determine_problem_type(self, problem_data: Dict) -> str:
        """Determine if problem is coding or MCQ"""
        try:
            content = problem_data.get('content', '').lower()
            title = problem_data.get('title', '').lower()
            
            # Check for MCQ indicators
            mcq_indicators = [
                'multiple choice', 'choose the', 'which of the following',
                'select the', 'what is', 'mcq', 'conceptual'
            ]
            
            for indicator in mcq_indicators:
                if indicator in content or indicator in title:
                    return 'mcq'
                    
            # Default to coding
            return 'coding'
            
        except Exception as e:
            logger.error(f"Error determining problem type: {e}")
            return 'coding'

    def extract_mcq_data(self, problem_data: Dict) -> Dict[str, Any]:
        """Extract MCQ-specific data (options, correct answer, explanation)"""
        mcq_data = {
            "options": [],
            "correctAnswer": "",
            "explanation": ""
        }
        
        try:
            content = problem_data.get('content', '')
            
            # Extract options (A, B, C, D, etc.)
            option_pattern = r'[A-D]\)\s*(.+?)(?=\n[A-D]\)|\n\n|$)'
            options = re.findall(option_pattern, content, re.IGNORECASE | re.DOTALL)
            
            if options:
                mcq_data["options"] = [opt.strip() for opt in options]
                
                # Try to extract correct answer from hints or solution
                hints = problem_data.get('hints', [])
                if hints:
                    mcq_data["explanation"] = '\n'.join(hints)
                    
                # For LeetCode, correct answer might not be directly available
                # This would need manual verification or additional processing
                
        except Exception as e:
            logger.error(f"Error extracting MCQ data: {e}")
            
        return mcq_data

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
        
        # Enhance problems with detailed information
        enhanced_problems = []
        for problem in problems[:5]:  # Limit to 5 for testing
            try:
                enhanced = self.enhance_problem_details(problem)
                if enhanced:
                    enhanced_problems.append(enhanced)
                time.sleep(1)  # Be respectful
            except Exception as e:
                logger.error(f"Error enhancing problem {problem.get('title')}: {e}")
                enhanced_problems.append(problem)
        
        return enhanced_problems

    def enhance_problem_details(self, problem: Dict) -> Optional[Dict]:
        """Enhance problem with detailed information from API"""
        try:
            title_slug = problem.get('title_slug') or self.extract_title_slug(problem.get('full_question_url', ''))
            if not title_slug:
                return problem
                
            logger.info(f"🔍 Enhancing problem details: {title_slug}")
            detailed_info = self.get_detailed_problem_info(title_slug)
            
            if not detailed_info:
                return problem
            
            # Update problem with detailed information
            problem['description'] = detailed_info.get('content', '')
            problem['problemStatement'] = detailed_info.get('content', '')[:1000]  # First 1000 chars
            
            # Extract and parse test cases
            test_cases = self.parse_test_cases(detailed_info)
            problem['testCases'] = test_cases
            
            # Extract canonical solution
            problem['canonicalSolution'] = self.extract_canonical_solution(detailed_info)
            
            # Determine problem type and extract additional data
            problem_type = self.determine_problem_type(detailed_info)
            problem['type'] = problem_type
            
            if problem_type == 'mcq':
                mcq_data = self.extract_mcq_data(detailed_info)
                problem['options'] = mcq_data['options']
                problem['correctAnswer'] = mcq_data['correctAnswer']
                problem['explanation'] = mcq_data['explanation']
            
            # Add additional fields
            problem['leetcode_id'] = detailed_info.get('questionFrontendId', '')
            problem['categoryTitle'] = detailed_info.get('categoryTitle', '')
            problem['hints'] = detailed_info.get('hints', [])
            problem['topicTags'] = [tag['name'] for tag in detailed_info.get('topicTags', [])]
            problem['skillTags'] = problem['topicTags']
            
            # Set status and source
            problem['status'] = 'pending_review'
            problem['aiGenerated'] = False
            problem['source'] = 'web_scraped'
            
            logger.info(f"✅ Enhanced problem: {problem['title']}")
            
        except Exception as e:
            logger.error(f"Error enhancing problem details: {e}")
            
        return problem

    def extract_title_slug(self, url: str) -> Optional[str]:
        """Extract title slug from problem URL"""
        try:
            match = re.search(r'/problems/([^/]+)/', url)
            return match.group(1) if match else None
        except Exception as e:
            logger.error(f"Error extracting title slug from {url}: {e}")
            return None

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
                        'source': 'web_scraped',
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
                        'source': 'web_scraped',
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
                'source': 'web_scraped',
            }
            
            return problem
            
        except Exception as e:
            logger.error(f"Error parsing API problem data: {e}")
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

    def crawl(self, max_pages: int = 2, enhance_details: bool = True) -> List[Dict]:
        """Enhanced crawl method with detailed problem extraction"""
        all_problems = []
        current_page = 1
        next_url = self.start_urls[0]
        
        while next_url and current_page <= max_pages:
            try:
                logger.info(f"📄 Crawling page {current_page}: {next_url}")
                
                response = self.session.get(next_url)
                if response.status_code != 200:
                    logger.error(f"Failed to fetch page {current_page}: HTTP {response.status_code}")
                    break
                
                problems = self.extract_problems(response.text)
                logger.info(f"✅ Found {len(problems)} problems on page {current_page}")
                all_problems.extend(problems)
                
                # Get next page
                soup = BeautifulSoup(response.text, 'html.parser')
                next_url = self.get_next_page(soup)
                current_page += 1
                
                # Be respectful - add delay
                time.sleep(3)
                
            except Exception as e:
                logger.error(f"Error crawling page {current_page}: {e}")
                break
        
        # Remove duplicates
        seen_titles = set()
        unique_problems = []
        for problem in all_problems:
            if problem['title'] not in seen_titles:
                seen_titles.add(problem['title'])
                unique_problems.append(problem)
        
        logger.info(f"🎯 Total unique problems found: {len(unique_problems)}")
        return unique_problems


# Test the enhanced spider
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    print("🧪 Testing Enhanced LeetCode Spider...")
    spider = LeetCodeSpider()
    
    # Health check
    health = spider.health_check()
    print(f"Health Check: {health}")
    
    # Crawl problems with enhanced details
    problems = spider.crawl(max_pages=1, enhance_details=True)
    print(f"\n✅ Scraped {len(problems)} problems with complete details")
    
    # Show sample with all fields
    if problems:
        print("\n📋 Sample Problem with Complete Details:")
        sample = problems[0]
        print(f"  Title: {sample['title']}")
        print(f"  Difficulty: {sample['difficulty']}")
        print(f"  Type: {sample['type']}")
        print(f"  URL: {sample['full_question_url']}")
        print(f"  Description Length: {len(sample.get('description', ''))} chars")
        print(f"  Test Cases: {len(sample.get('testCases', {}).get('inputs', []))} inputs")
        print(f"  Solution Length: {len(sample.get('canonicalSolution', ''))} chars")
        print(f"  Tags: {sample.get('skillTags', [])}")
        
        if sample['type'] == 'mcq':
            print(f"  Options: {sample.get('options', [])}")
            print(f"  Explanation: {sample.get('explanation', '')[:100]}...")