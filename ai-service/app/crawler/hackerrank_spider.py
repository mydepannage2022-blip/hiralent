# app/crawler/hackerrank_spider.py
"""
HackerRank Spider - Metadata Extraction for QuestionBank
Extracts challenge metadata and patterns from HackerRank
LEGAL: Only stores metadata, NEVER full problem statements

Usage:
    spider = HackerRankSpider()
    patterns = spider.crawl(max_pages=3)
    # patterns are then used to generate questions via Gemini AI
"""

import requests
import time
from typing import List, Dict, Optional
from bs4 import BeautifulSoup
import logging
import json

logger = logging.getLogger(__name__)


class HackerRankSpider:
    """
    HackerRank Spider - Extracts metadata and patterns ONLY
    LEGAL: Never stores full problem statements
    
    This spider feeds the QuestionBank by:
    1. Fetching challenge metadata from HackerRank API
    2. Extracting difficulty, track, tags, success metrics
    3. Mapping tracks to algorithmic patterns
    4. Returning patterns to be used by Gemini AI for question generation
    """
    
    def __init__(self):
        self.name = "hackerrank"
        self.base_url = "https://www.hackerrank.com"
        self.api_base = f"{self.base_url}/rest/contests/master"
        
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json'
        })
        
        # Available tracks to scrape
        self.tracks = [
            "algorithms",
            "data-structures",
            "python",
            "sql",
            "java",
            "cpp",
            "mathematics"
        ]
        
        # Build start URLs from tracks
        self.start_urls = [
            f"{self.api_base}/tracks/{track}/challenges?limit=50&offset=0"
            for track in self.tracks
        ]
    
    def crawl(self, max_pages: int = 3) -> List[Dict]:
        """
        Execute the crawling with pagination
        Returns: List of patterns (NOT full problem text)
        """
        all_patterns = []
        
        logger.info(f"🚀 Starting HackerRank spider with {len(self.tracks)} tracks")
        
        # Limit to max_pages tracks
        tracks_to_scrape = self.start_urls[:max_pages]
        
        for i, url in enumerate(tracks_to_scrape):
            try:
                track_name = self.tracks[i] if i < len(self.tracks) else "unknown"
                logger.info(f"📥 Scraping track {i+1}/{len(tracks_to_scrape)}: {track_name}")
                
                response = self.session.get(url, timeout=15)
                response.raise_for_status()
                
                # Extract patterns from this track
                patterns = self.extract_problems(response.text)
                all_patterns.extend(patterns)
                
                logger.info(f"✅ Extracted {len(patterns)} patterns from {track_name}")
                
                # Rate limiting (be respectful)
                time.sleep(2)
                
            except requests.RequestException as e:
                logger.error(f"❌ Network error scraping HackerRank: {e}")
                continue
            except Exception as e:
                logger.error(f"❌ Error processing HackerRank data: {e}")
                continue
        
        logger.info(f"🎉 HackerRank spider finished: {len(all_patterns)} patterns collected")
        return all_patterns
    
    def extract_problems(self, html: str) -> List[Dict]:
        """
        Extract problem metadata from HackerRank
        Returns: List of patterns (NOT full problem text)
        """
        patterns = []
        
        try:
            data = json.loads(html)
            
            # HackerRank API returns challenges in 'models' key
            challenges = data.get('models', [])
            
            if not challenges:
                logger.warning("No challenges found in response")
                return patterns
            
            for challenge in challenges:
                pattern = self._transform_challenge_to_pattern(challenge)
                if pattern:
                    patterns.append(pattern)
                    logger.info(f"✅ Extracted: {pattern['title']}")
            
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing HackerRank JSON: {e}")
        except Exception as e:
            logger.error(f"Error extracting from HackerRank: {e}")
        
        return patterns
    
    def _transform_challenge_to_pattern(self, challenge: Dict) -> Optional[Dict]:
        """
        Transform HackerRank challenge metadata to pattern format
        Returns: Pattern data for QuestionBank
        """
        try:
            # Extract basic info
            slug = challenge.get('slug', '')
            name = challenge.get('name', 'HackerRank Challenge')
            
            # Extract track info
            track = challenge.get('track', {})
            track_name = track.get('track_name', 'algorithms')
            subtrack = track.get('track_name', '')
            
            # Map track to algorithmic pattern
            algorithm_pattern = self._map_track_to_pattern(track_name)
            domain = self._get_domain_from_track(track_name)
            
            # Get difficulty
            difficulty_name = challenge.get('difficulty_name', 'Medium').lower()
            difficulty = self._normalize_difficulty(difficulty_name)
            
            # Extract tags
            tags = self._extract_tags(track_name, subtrack, algorithm_pattern)
            
            # Extract metrics
            max_score = challenge.get('max_score', 0)
            success_ratio = challenge.get('success_ratio', 0.0)
            solved_count = challenge.get('solved_count', 0)
            
            # Preview text (first 200 chars only - LEGAL)
            preview = challenge.get('preview', '')[:200]
            
            # Infer constraint ranges from difficulty and metrics
            constraints = self._infer_constraints(difficulty, success_ratio, max_score)
            
            return {
                'source': 'hackerrank',
                'title': name,
                'pattern': algorithm_pattern,
                'domain': domain,
                'difficulty': difficulty,
                'tags': tags,
                'input_structure': self._infer_input_from_track(track_name),
                'constraints': constraints,
                'source_url': f"{self.base_url}/challenges/{slug}",
                'source_id': slug,
                'language': 'multiple',
                'metadata': {
                    'track': track_name,
                    'subtrack': subtrack,
                    'max_score': max_score,
                    'success_rate': round(success_ratio * 100, 2),
                    'solved_count': solved_count,
                    'preview_snippet': preview,  # Only first 200 chars
                    'is_paid': challenge.get('is_premium', False)
                }
            }
            
        except Exception as e:
            logger.error(f"Error transforming challenge: {e}")
            return None
    
    def _map_track_to_pattern(self, track: str) -> str:
        """Map HackerRank track to algorithmic pattern"""
        track_lower = track.lower()
        
        # Comprehensive pattern mapping
        pattern_mapping = {
            # Algorithms track
            'warmup': 'basic_operations',
            'implementation': 'simulation',
            'strings': 'string_manipulation',
            'sorting': 'sorting',
            'search': 'binary_search',
            'graph theory': 'graph_traversal',
            'greedy': 'greedy',
            'dynamic programming': 'dynamic_programming',
            'constructive algorithms': 'greedy',
            'bit manipulation': 'bit_manipulation',
            'recursion': 'recursion',
            'brute force': 'brute_force',
            'game theory': 'game_theory',
            
            # Data structures track
            'arrays': 'array_manipulation',
            'linked lists': 'linked_list',
            'trees': 'tree_traversal',
            'balanced trees': 'balanced_tree',
            'stacks': 'stack_operations',
            'queues': 'queue_operations',
            'heap': 'heap_operations',
            'disjoint set': 'union_find',
            'trie': 'trie_operations',
            'advanced': 'advanced_data_structures',
            
            # Math track
            'number theory': 'number_theory',
            'combinatorics': 'combinatorics',
            'algebra': 'algebra',
            'geometry': 'geometry',
            'probability': 'probability',
            
            # Language-specific
            'python': 'python_fundamentals',
            'java': 'java_fundamentals',
            'sql': 'sql_queries',
            'cpp': 'cpp_fundamentals'
        }
        
        # Find matching pattern
        for key, pattern in pattern_mapping.items():
            if key in track_lower:
                return pattern
        
        return 'general_algorithm'
    
    def _get_domain_from_track(self, track: str) -> str:
        """Get problem domain from track"""
        track_lower = track.lower()
        
        domain_mapping = {
            'graph': 'graphs',
            'tree': 'trees',
            'string': 'strings',
            'array': 'arrays',
            'linked list': 'linked_lists',
            'dynamic': 'optimization',
            'sorting': 'arrays',
            'search': 'arrays',
            'stack': 'data_structures',
            'queue': 'data_structures',
            'heap': 'heaps',
            'math': 'mathematics',
            'number': 'mathematics',
            'geometry': 'geometry',
            'sql': 'databases',
            'python': 'python',
            'java': 'java',
            'cpp': 'cpp'
        }
        
        for key, domain in domain_mapping.items():
            if key in track_lower:
                return domain
        
        return 'algorithms'
    
    def _normalize_difficulty(self, difficulty_name: str) -> str:
        """Normalize difficulty to easy/medium/hard"""
        difficulty_name = difficulty_name.lower()
        
        if difficulty_name in ['easy', 'simple']:
            return 'easy'
        elif difficulty_name in ['medium', 'moderate', 'intermediate']:
            return 'medium'
        elif difficulty_name in ['hard', 'difficult', 'expert', 'advanced']:
            return 'hard'
        else:
            return 'medium'  # Default
    
    def _extract_tags(self, track: str, subtrack: str, pattern: str) -> List[str]:
        """Extract skill tags from track info and pattern"""
        tags = []
        
        # Add track as tag
        if track:
            tags.append(track.lower().replace(' ', '-'))
        
        # Add subtrack as tag
        if subtrack and subtrack != track:
            tags.append(subtrack.lower().replace(' ', '-'))
        
        # Add pattern as tag
        if pattern:
            tags.append(pattern.replace('_', '-'))
        
        # Add common algorithm tags based on pattern
        pattern_tags = {
            'dynamic_programming': ['dp', 'memoization'],
            'graph_traversal': ['bfs', 'dfs', 'graphs'],
            'tree_traversal': ['trees', 'binary-tree'],
            'sorting': ['sorting', 'arrays'],
            'binary_search': ['binary-search', 'search'],
            'greedy': ['greedy-algorithms'],
            'backtracking': ['recursion', 'backtracking'],
            'heap_operations': ['heap', 'priority-queue']
        }
        
        if pattern in pattern_tags:
            tags.extend(pattern_tags[pattern])
        
        # Remove duplicates and limit to 8 tags
        return list(set(tags))[:8]
    
    def _infer_input_from_track(self, track: str) -> Dict:
        """Infer input structure from track"""
        track_lower = track.lower()
        
        input_structures = {
            'graph': {'type': 'graph', 'format': 'adjacency_list'},
            'tree': {'type': 'tree', 'format': 'tree_node'},
            'string': {'type': 'string', 'format': 'text'},
            'array': {'type': 'array', 'format': 'numeric'},
            'linked list': {'type': 'linked_list', 'format': 'nodes'},
            'sql': {'type': 'table', 'format': 'relational'},
            'matrix': {'type': 'matrix', 'format': '2d_array'}
        }
        
        for key, structure in input_structures.items():
            if key in track_lower:
                return structure
        
        return {'type': 'array', 'format': 'list'}
    
    def _infer_constraints(self, difficulty: str, success_rate: float, max_score: int) -> Dict:
        """Infer constraint ranges from difficulty and metrics"""
        
        # Base constraints by difficulty
        constraint_ranges = {
            'easy': {
                'n_max': 1000,
                'time_limit': '1 second',
                'memory_limit': '256 MB'
            },
            'medium': {
                'n_max': 100000,
                'time_limit': '2 seconds',
                'memory_limit': '512 MB'
            },
            'hard': {
                'n_max': 1000000,
                'time_limit': '5 seconds',
                'memory_limit': '1 GB'
            }
        }
        
        base_constraints = constraint_ranges.get(difficulty, constraint_ranges['medium'])
        
        # Add success metrics
        constraints = {
            **base_constraints,
            'success_rate': round(success_rate * 100, 2),
            'max_score': max_score,
            'expected_difficulty': difficulty
        }
        
        return constraints
    
    def health_check(self) -> Dict:
        """Check if HackerRank API is accessible"""
        try:
            # Test with a simple request
            test_url = f"{self.api_base}/tracks/algorithms/challenges?limit=1"
            response = self.session.get(test_url, timeout=5)
            
            return {
                "status": "healthy" if response.status_code == 200 else "unhealthy",
                "status_code": response.status_code,
                "base_url": self.base_url,
                "tracks_available": len(self.tracks)
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "base_url": self.base_url
            }
    
    def get_next_page(self, soup: BeautifulSoup) -> Optional[str]:
        """
        HackerRank API uses offset-based pagination
        This method is for compatibility with BaseSpider
        """
        # For HackerRank, pagination is handled via offset parameter
        # Not needed for single-page track scraping
        return None