"""
LeetCode Spider - Scrapes programming problems from LeetCode
"""
from base_spider import BaseSpider
from bs4 import BeautifulSoup
import json
import re
from typing import List, Dict, Optional
import logging
import time
from urllib.parse import urljoin

logger = logging.getLogger(__name__)

class LeetCodeSpider(BaseSpider):
    """
    Spider for scraping LeetCode problems
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
    
    def extract_problems(self, html: str) -> List[Dict]:
        """
        Extract problems from LeetCode HTML
        """
        problems = []
        soup = BeautifulSoup(html, 'html.parser')
        
        try:
            # Method 1: Try to extract from __NEXT_DATA__
            script_tag = soup.find('script', {'id': '__NEXT_DATA__'})
            if script_tag and script_tag.string:
                logger.info("Found __NEXT_DATA__, extracting problems...")
                data = json.loads(script_tag.string)
                problems.extend(self._extract_from_next_data(data))
            
            # Method 2: Try to extract from problem table
            if not problems:
                logger.info("Trying table extraction...")
                problems.extend(self._extract_from_table(soup))
                
            # Method 3: Try API-based extraction
            if not problems:
                logger.info("Trying API extraction...")
                problems.extend(self._extract_via_api())
                
        except Exception as e:
            logger.error(f"Error extracting problems: {e}")
            # Fallback to simple table extraction
            problems.extend(self._extract_from_table_simple(soup))
        
        return problems
    
    def _extract_from_next_data(self, data: dict) -> List[Dict]:
        """Extract problems from __NEXT_DATA__ structure"""
        problems = []
        
        try:
            # Navigate through the complex Next.js structure
            queries = data.get('props', {}).get('pageProps', {}).get('dehydratedState', {}).get('queries', [])
            
            for query in queries:
                query_data = query.get('state', {}).get('data', {})
                
                # Check for problems in different possible locations
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
            # Look for problem rows - LeetCode uses specific selectors
            rows = soup.select('[role="rowgroup"] [role="row"]') or soup.select('.reactable-data tr')
            
            for row in rows:
                try:
                    # Extract title and link
                    title_elem = row.find('a', href=re.compile(r'/problems/'))
                    if not title_elem:
                        continue
                    
                    title = title_elem.get_text(strip=True)
                    href = title_elem.get('href', '')
                    problem_url = urljoin(self.base_url, href)
                    
                    # Extract difficulty
                    difficulty_elem = row.find('span', class_=re.compile(r'difficulty'))
                    if not difficulty_elem:
                        # Try by text content
                        difficulty_text = row.get_text()
                        if 'Easy' in difficulty_text:
                            difficulty = 'easy'
                        elif 'Medium' in difficulty_text:
                            difficulty = 'medium'
                        elif 'Hard' in difficulty_text:
                            difficulty = 'hard'
                        else:
                            difficulty = 'medium'
                    else:
                        difficulty_text = difficulty_elem.get_text(strip=True).lower()
                        difficulty = difficulty_text if difficulty_text in ['easy', 'medium', 'hard'] else 'medium'
                    
                    # Extract acceptance rate (if available)
                    acceptance_text = row.get_text()
                    acceptance_match = re.search(r'(\d+(?:\.\d+)?)%', acceptance_text)
                    acceptance_rate = float(acceptance_match.group(1)) if acceptance_match else 0.0
                    
                    problem = {
                        'source': 'leetcode',
                        'title': title,
                        'content': f'LeetCode Problem: {title}',
                        'full_question_url': problem_url,
                        'difficulty': difficulty,
                        'tags': [],  # Will be filled from detailed API call
                        'language': 'multiple',
                        'votes': 0,
                        'answers': 0,
                        'acceptance_rate': acceptance_rate,
                        'problem_type': 'coding',
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
            # Find all links to problems
            problem_links = soup.find_all('a', href=re.compile(r'/problems/[^/]+/$'))
            
            for link in problem_links:
                try:
                    title = link.get_text(strip=True)
                    if not title or title == ' ':
                        continue
                        
                    href = link.get('href')
                    problem_url = urljoin(self.base_url, href)
                    
                    # Try to find difficulty from parent elements
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
                        'content': f'LeetCode Problem: {title}',
                        'full_question_url': problem_url,
                        'difficulty': difficulty,
                        'tags': [],
                        'language': 'multiple',
                        'votes': 0,
                        'answers': 0,
                        'problem_type': 'coding',
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
            # This query gets a list of problems
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
                "limit": 50,  # Get first 50 problems
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
            
            # Get tags
            topic_tags = data.get('topicTags', [])
            tags = [tag.get('name', '') for tag in topic_tags if tag.get('name')]
            
            # Construct URL
            problem_url = f"https://leetcode.com/problems/{title_slug}/"
            
            problem = {
                'source': 'leetcode',
                'title': title,
                'content': f'LeetCode Problem: {title}',
                'full_question_url': problem_url,
                'difficulty': difficulty,
                'tags': tags,
                'language': 'multiple',
                'votes': 0,
                'answers': 0,
                'problem_type': 'coding',
                'leetcode_id': data.get('frontendQuestionId', ''),
                'is_paid_only': data.get('paidOnly', False),
                'acceptance_rate': data.get('acRate', 0),
            }
            
            return problem
            
        except Exception as e:
            logger.error(f"Error parsing API problem data: {e}")
            return None
    
    def _parse_problem_data(self, data: dict) -> Optional[Dict]:
        """Parse individual problem data from various sources"""
        try:
            # Handle different data structures
            title = data.get('title') or data.get('questionTitle', 'Untitled')
            title_slug = data.get('titleSlug') or data.get('questionTitleSlug', '')
            
            if not title or title == 'Untitled':
                return None
                
            difficulty = data.get('difficulty', 'Medium').lower()
            
            # Get tags
            topic_tags = data.get('topicTags', [])
            tags = [tag.get('name', '') for tag in topic_tags if tag.get('name')]
            
            # Construct problem URL
            problem_url = f"https://leetcode.com/problems/{title_slug}/" if title_slug else ''
            
            problem = {
                'source': 'leetcode',
                'title': title,
                'content': data.get('content') or data.get('question') or f'Problem: {title}',
                'full_question_url': problem_url,
                'difficulty': difficulty,
                'tags': tags,
                'language': 'multiple',
                'votes': 0,
                'answers': 0,
                'problem_type': 'coding',
                'leetcode_id': data.get('questionFrontendId') or data.get('frontendQuestionId', ''),
                'is_paid_only': data.get('paidOnly') or data.get('isPaidOnly', False),
                'acceptance_rate': data.get('acRate') or data.get('acceptanceRate', 0),
            }
            
            return problem
            
        except Exception as e:
            logger.error(f"Error parsing problem data: {e}")
            return None
    
    def get_next_page(self, soup: BeautifulSoup) -> Optional[str]:
        """Find the next page URL"""
        try:
            # LeetCode uses client-side navigation, but we can try to construct the next page URL
            current_url = getattr(self.session, 'url', self.start_urls[0])
            
            # Extract current page number
            page_match = re.search(r'page=(\d+)', current_url)
            if page_match:
                current_page = int(page_match.group(1))
                next_page = current_page + 1
                next_url = re.sub(r'page=\d+', f'page={next_page}', current_url)
                return next_url
            else:
                # First page, add page parameter
                if '?' in current_url:
                    return f"{current_url}&page=2"
                else:
                    return f"{current_url}?page=2"
                    
        except Exception as e:
            logger.error(f"Error finding next page: {e}")
        
        return None

    def crawl(self, max_pages: int = 3) -> List[Dict]:
        """Override crawl to add delays between requests"""
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
                
                # Be respectful - add delay between requests
                time.sleep(2)
                
            except Exception as e:
                logger.error(f"Error crawling page {current_page}: {e}")
                break
        
        # Remove duplicates based on title
        seen_titles = set()
        unique_problems = []
        for problem in all_problems:
            if problem['title'] not in seen_titles:
                seen_titles.add(problem['title'])
                unique_problems.append(problem)
        
        logger.info(f"🎯 Total unique problems found: {len(unique_problems)}")
        return unique_problems


# Test the spider
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    print("🧪 Testing LeetCode Spider...")
    spider = LeetCodeSpider()
    
    # Health check
    health = spider.health_check()
    print(f"Health Check: {health}")
    
    # Crawl problems
    problems = spider.crawl(max_pages=1)
    print(f"\n✅ Scraped {len(problems)} problems")
    
    # Show sample
    if problems:
        print("\n📋 Sample Problems:")
        for i, problem in enumerate(problems[:3]):  # Show first 3
            print(f"  {i+1}. {problem['title']} ({problem['difficulty']}) - {problem['full_question_url']}")