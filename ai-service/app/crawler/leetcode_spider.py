# ai-service/app/crawler/leetcode_spider.py
"""
LeetCode Spider - Scrapes programming problems from LeetCode
"""
from base_spider import BaseSpider
from bs4 import BeautifulSoup
import json
import re
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class LeetCodeSpider(BaseSpider):
    """
    Spider for scraping LeetCode problems
    """
    
    def __init__(self):
        super().__init__("leetcode", "https://leetcode.com")
        self.start_urls = [
            "https://leetcode.com/problemset/all/?page=1",
            "https://leetcode.com/problemset/all/?difficulty=EASY&page=1",
            "https://leetcode.com/problemset/all/?difficulty=MEDIUM&page=1",
        ]
        self.api_base = "https://leetcode.com/graphql"
    
    def extract_problems(self, html: str) -> List[Dict]:
        """
        Extract problems from LeetCode HTML
        LeetCode uses JavaScript/React, so we need to extract from script tags
        """
        problems = []
        soup = BeautifulSoup(html, 'html.parser')
        
        try:
            # LeetCode embeds data in script tags with __NEXT_DATA__
            script_tag = soup.find('script', {'id': '__NEXT_DATA__'})
            
            if script_tag and script_tag.string:
                data = json.loads(script_tag.string)
                problem_list = self._extract_from_next_data(data)
                problems.extend(problem_list)
            else:
                # Fallback: Try to extract from table rows
                logger.warning("Could not find __NEXT_DATA__, trying table extraction")
                problems.extend(self._extract_from_table(soup))
                
        except Exception as e:
            logger.error(f"Error extracting problems: {e}")
        
        return problems
    
    def _extract_from_next_data(self, data: dict) -> List[Dict]:
        """Extract problems from __NEXT_DATA__ structure"""
        problems = []
        
        try:
            # Navigate the nested structure
            props = data.get('props', {})
            page_props = props.get('pageProps', {})
            
            # Different LeetCode pages have different structures
            problem_list = (
                page_props.get('problemsetQuestionList', {}).get('questions', []) or
                page_props.get('questions', [])
            )
            
            for problem_data in problem_list:
                problem = self._parse_problem_data(problem_data)
                if problem:
                    problems.append(problem)
                    
        except Exception as e:
            logger.error(f"Error parsing __NEXT_DATA__: {e}")
        
        return problems
    
    def _extract_from_table(self, soup: BeautifulSoup) -> List[Dict]:
        """Fallback: Extract from HTML table"""
        problems = []
        
        try:
            # Find problem rows in the table
            rows = soup.find_all('div', {'role': 'row'})
            
            for row in rows:
                try:
                    # Extract problem info from row
                    title_link = row.find('a')
                    if not title_link:
                        continue
                    
                    title = title_link.get_text(strip=True)
                    problem_url = f"https://leetcode.com{title_link.get('href', '')}"
                    
                    # Extract difficulty
                    difficulty_span = row.find('span', text=re.compile(r'(Easy|Medium|Hard)'))
                    difficulty = difficulty_span.get_text(strip=True).lower() if difficulty_span else 'medium'
                    
                    problem = {
                        'source': 'leetcode',
                        'title': title,
                        'content': f'Problem from LeetCode: {title}',
                        'full_question_url': problem_url,
                        'difficulty': difficulty,
                        'tags': [],
                        'language': 'multiple',  # LeetCode supports multiple languages
                        'votes': 0,
                        'answers': 0,
                    }
                    
                    problems.append(problem)
                    
                except Exception as e:
                    logger.error(f"Error parsing problem row: {e}")
                    continue
                    
        except Exception as e:
            logger.error(f"Error in table extraction: {e}")
        
        return problems
    
    def _parse_problem_data(self, data: dict) -> Optional[Dict]:
        """Parse individual problem data"""
        try:
            # Extract fields
            title = data.get('title', 'Untitled')
            title_slug = data.get('titleSlug', '')
            difficulty = data.get('difficulty', 'Medium').lower()
            
            # Get topic tags
            topic_tags = data.get('topicTags', [])
            tags = [tag.get('name', '') for tag in topic_tags]
            
            # Stats
            stats = data.get('stats', '{}')
            if isinstance(stats, str):
                stats = json.loads(stats)
            
            total_submitted = stats.get('totalSubmissionRaw', 0)
            total_accepted = stats.get('totalAcceptedRaw', 0)
            
            # Construct problem URL
            problem_url = f"https://leetcode.com/problems/{title_slug}/"
            
            problem = {
                'source': 'leetcode',
                'title': title,
                'content': data.get('content', f'Problem: {title}'),
                'full_question_url': problem_url,
                'difficulty': difficulty,
                'tags': tags,
                'language': 'multiple',
                'votes': total_accepted,  # Using accepted as proxy for votes
                'answers': total_submitted,
                'problem_type': 'coding',
                'leetcode_id': data.get('questionFrontendId', ''),
                'is_paid_only': data.get('paidOnly', False),
                'acceptance_rate': self._calculate_acceptance_rate(total_accepted, total_submitted),
            }
            
            return problem
            
        except Exception as e:
            logger.error(f"Error parsing problem data: {e}")
            return None
    
    def _calculate_acceptance_rate(self, accepted: int, submitted: int) -> float:
        """Calculate acceptance rate percentage"""
        if submitted == 0:
            return 0.0
        return round((accepted / submitted) * 100, 2)
    
    def get_next_page(self, soup: BeautifulSoup) -> Optional[str]:
        """Find the next page URL"""
        try:
            # Look for pagination
            next_button = soup.find('button', {'aria-label': 'next'})
            
            if next_button and not next_button.get('disabled'):
                # Extract current page from URL and increment
                current_url = self.session.url if hasattr(self.session, 'url') else self.start_urls[0]
                
                # Extract page number
                page_match = re.search(r'page=(\d+)', current_url)
                if page_match:
                    current_page = int(page_match.group(1))
                    next_page = current_page + 1
                    next_url = re.sub(r'page=\d+', f'page={next_page}', current_url)
                    return next_url
                    
        except Exception as e:
            logger.error(f"Error finding next page: {e}")
        
        return None
    
    def fetch_problem_details(self, problem_slug: str) -> Optional[Dict]:
        """
        Fetch detailed information for a specific problem using GraphQL API
        This is optional and can be used to get full problem descriptions
        """
        query = """
        query questionData($titleSlug: String!) {
            question(titleSlug: $titleSlug) {
                questionId
                title
                content
                difficulty
                topicTags {
                    name
                }
                codeSnippets {
                    lang
                    code
                }
                sampleTestCase
                exampleTestcases
                hints
            }
        }
        """
        
        try:
            response = self.session.post(
                self.api_base,
                json={
                    'query': query,
                    'variables': {'titleSlug': problem_slug}
                },
                headers={
                    'Content-Type': 'application/json',
                    'Referer': f'https://leetcode.com/problems/{problem_slug}/'
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get('data', {}).get('question')
                
        except Exception as e:
            logger.error(f"Error fetching problem details for {problem_slug}: {e}")
        
        return None


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
        print("\n📋 Sample Problem:")
        sample = problems[0]
        for key, value in sample.items():
            print(f"  {key}: {value}")