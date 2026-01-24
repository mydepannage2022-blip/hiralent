"""
app/pattern_extraction/extractor.py

Unified Pattern Extractor - Source-Agnostic Pattern Extraction
Replaces scattered extraction logic across all spiders
"""

import time
import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


class UnifiedPatternExtractor:
    """
    Centralized pattern extraction for all scraping sources.
    Takes raw metadata → Returns normalized pattern object compatible with Gemini AI.
    
    Supported sources: leetcode, github, stackoverflow, hackerrank
    """
    
    def __init__(self):
        self.algorithm_keywords = {
            'dynamic_programming': ['dp', 'dynamic', 'memoization', 'tabulation'],
            'graph_traversal': ['graph', 'bfs', 'dfs', 'dijkstra', 'bellman'],
            'tree_traversal': ['tree', 'binary tree', 'bst', 'trie'],
            'two_pointers': ['two pointer', 'sliding window'],
            'binary_search': ['binary search', 'bisect'],
            'sorting': ['sort', 'quicksort', 'mergesort'],
            'hash_table': ['hash', 'hashmap', 'dictionary', 'set'],
            'stack_queue': ['stack', 'queue', 'deque'],
            'recursion': ['recursion', 'recursive', 'backtrack'],
            'greedy': ['greedy'],
            'bit_manipulation': ['bit', 'xor', 'bitwise']
        }
    
    # =========================================================================
    # MAIN EXTRACTION METHOD
    # =========================================================================
    
    def extract_pattern(self, source_data: Dict, source: str) -> Dict[str, Any]:
        """
        Universal pattern extraction interface.
        
        Args:
            source_data: Raw metadata from any spider
            source: 'leetcode' | 'github' | 'stackoverflow' | 'hackerrank'
        
        Returns:
            Normalized pattern object:
            {
                "source": str,
                "source_id": str,
                "source_url": str,
                "pattern": str,
                "domain": str,
                "difficulty": str,
                "tags": List[str],
                "input_structure": Dict,
                "constraints": Dict,
                "extracted_at": float
            }
        """
        try:
            logger.info(f"🔍 Extracting pattern from {source}")
            
            return {
                "source": source,
                "source_id": self._extract_source_id(source_data, source),
                "source_url": self._extract_source_url(source_data, source),
                "pattern": self._classify_algorithm(source_data, source),
                "domain": self._infer_domain(source_data, source),
                "difficulty": self._normalize_difficulty(source_data, source),
                "tags": self._normalize_tags(source_data, source),
                "input_structure": self._infer_input_structure(source_data, source),
                "constraints": self._infer_constraints(source_data, source),
                "extracted_at": time.time()
            }
            
        except Exception as e:
            logger.error(f"❌ Pattern extraction failed for {source}: {e}")
            raise
    
    # =========================================================================
    # ALGORITHM CLASSIFICATION
    # =========================================================================
    
    def _classify_algorithm(self, data: Dict, source: str) -> str:
        """
        Source-agnostic algorithm classification.
        Returns: algorithm pattern name (e.g., 'dynamic_programming')
        """
        if source == "leetcode":
            return self._classify_from_leetcode_tags(data.get("tags", []))
        
        elif source == "github":
            return self._classify_from_github_features(data.get("features", {}))
        
        elif source == "stackoverflow":
            tags = data.get("tags", [])
            title = data.get("title", "")
            return self._classify_from_so_context(tags, title)
        
        elif source == "hackerrank":
            return self._classify_from_hackerrank_track(data.get("track", ""))
        
        return "general_algorithm"
    
    def _classify_from_leetcode_tags(self, tags: List[str]) -> str:
        """Classify from LeetCode topic tags"""
        tagset = set(t.lower().replace("-", "_") for t in tags)
        
        if "dynamic_programming" in tagset:
            return "dynamic_programming"
        if "graph" in tagset:
            return "graph_traversal"
        if "two_pointers" in tagset:
            return "two_pointers"
        if "binary_search" in tagset:
            return "binary_search"
        if "greedy" in tagset:
            return "greedy"
        if "hash_table" in tagset:
            return "hash_table"
        if "stack" in tagset or "queue" in tagset:
            return "stack_queue"
        if "recursion" in tagset or "backtracking" in tagset:
            return "recursion"
        if "string" in tagset:
            return "string_processing"
        if "tree" in tagset:
            return "tree_traversal"
        
        return "general_algorithm"
    
    def _classify_from_github_features(self, features: Dict) -> str:
        """Classify from GitHub code analysis features"""
        if features.get("dp_indicators"):
            return "dynamic_programming"
        if features.get("graph_operations"):
            return "graph_traversal"
        if features.get("tree_operations"):
            return "tree_traversal"
        if features.get("recursion") and not features.get("dp_indicators"):
            return "recursion"
        if features.get("binary_search"):
            return "binary_search"
        if features.get("two_pointers"):
            return "two_pointers"
        if features.get("sorting"):
            return "sorting"
        if features.get("hash_table"):
            return "hash_table"
        if features.get("stack_queue"):
            return "stack_queue"
        if features.get("bit_manipulation"):
            return "bit_manipulation"
        
        return "general_algorithm"
    
    def _classify_from_so_context(self, tags: List[str], title: str) -> str:
        """Classify from StackOverflow tags and title"""
        text = " ".join(tags + [title]).lower()
        
        for algorithm, keywords in self.algorithm_keywords.items():
            if any(keyword in text for keyword in keywords):
                return algorithm
        
        return "general_programming"
    
    def _classify_from_hackerrank_track(self, track: str) -> str:
        """Classify from HackerRank track name"""
        track_lower = track.lower()
        
        track_mapping = {
            'dynamic programming': 'dynamic_programming',
            'graph': 'graph_traversal',
            'tree': 'tree_traversal',
            'sorting': 'sorting',
            'search': 'binary_search',
            'greedy': 'greedy',
            'recursion': 'recursion',
            'string': 'string_processing',
            'array': 'array_manipulation',
            'stack': 'stack_queue',
            'queue': 'stack_queue'
        }
        
        for key, pattern in track_mapping.items():
            if key in track_lower:
                return pattern
        
        return "general_algorithm"
    
    # =========================================================================
    # DOMAIN INFERENCE
    # =========================================================================
    
    def _infer_domain(self, data: Dict, source: str) -> str:
        """
        Infer problem domain (e.g., 'graphs', 'arrays', 'strings').
        Returns: domain name
        """
        pattern = data.get("pattern", "")
        
        domain_mapping = {
            'dynamic_programming': 'optimization',
            'graph_traversal': 'graphs',
            'tree_traversal': 'trees',
            'two_pointers': 'arrays',
            'binary_search': 'arrays',
            'sorting': 'arrays',
            'hash_table': 'data_structures',
            'stack_queue': 'data_structures',
            'string_processing': 'strings',
            'recursion': 'recursion',
            'greedy': 'optimization',
            'bit_manipulation': 'math'
        }
        
        return domain_mapping.get(pattern, 'algorithms')
    
    # =========================================================================
    # DIFFICULTY NORMALIZATION
    # =========================================================================
    
    def _normalize_difficulty(self, data: Dict, source: str) -> str:
        """
        Unified difficulty normalization across all sources.
        Always returns: 'easy' | 'medium' | 'hard'
        """
        if source == "leetcode":
            difficulty = data.get("difficulty", "medium")
            return difficulty.lower() if difficulty.lower() in ['easy', 'medium', 'hard'] else 'medium'
        
        elif source == "stackoverflow":
            score = data.get("constraints", {}).get("score", 0)
            # High score = common/easier topic
            if score >= 2000:
                return "easy"
            elif score >= 500:
                return "medium"
            else:
                return "hard"
        
        elif source == "github":
            # Use complexity estimate
            features = data.get("features", {})
            complexity_score = 0
            
            if features.get("nested_loops", 0) >= 2:
                complexity_score += 3
            if features.get("dp_indicators"):
                complexity_score += 3
            if features.get("graph_operations"):
                complexity_score += 2
            if features.get("recursion"):
                complexity_score += 2
            
            if complexity_score >= 6:
                return "hard"
            elif complexity_score >= 3:
                return "medium"
            else:
                return "easy"
        
        elif source == "hackerrank":
            difficulty_name = data.get("difficulty", "medium").lower()
            
            if difficulty_name in ['easy', 'simple']:
                return "easy"
            elif difficulty_name in ['medium', 'moderate', 'intermediate']:
                return "medium"
            elif difficulty_name in ['hard', 'difficult', 'expert', 'advanced']:
                return "hard"
            else:
                return "medium"
        
        return "medium"
    
    # =========================================================================
    # TAG NORMALIZATION
    # =========================================================================
    
    def _normalize_tags(self, data: Dict, source: str) -> List[str]:
        """
        Normalize tags to consistent format across sources.
        Returns: List of normalized tags (max 8)
        """
        tags = []
        
        if source == "leetcode":
            tags = data.get("tags", [])
        
        elif source == "github":
            tags = data.get("tags", [])
        
        elif source == "stackoverflow":
            tags = data.get("tags", [])
        
        elif source == "hackerrank":
            tags = data.get("tags", [])
        
        # Normalize format: lowercase, hyphenated
        normalized = []
        for tag in tags[:8]:  # Limit to 8 tags
            if isinstance(tag, str):
                normalized_tag = tag.lower().replace("_", "-").replace(" ", "-")
                if normalized_tag not in normalized:  # Remove duplicates
                    normalized.append(normalized_tag)
        
        return normalized
    
    # =========================================================================
    # INPUT STRUCTURE INFERENCE
    # =========================================================================
    
    def _infer_input_structure(self, data: Dict, source: str) -> Dict[str, str]:
        """
        Infer input data structure.
        Returns: {"type": str, "format": str}
        """
        # Check if already provided
        existing_structure = data.get("input_structure")
        if existing_structure and isinstance(existing_structure, dict):
            return existing_structure
        
        # Infer from domain
        domain = data.get("domain", "")
        
        structure_mapping = {
            'graphs': {'type': 'graph', 'format': 'adjacency_list'},
            'trees': {'type': 'tree', 'format': 'tree_node'},
            'strings': {'type': 'string', 'format': 'text'},
            'arrays': {'type': 'array', 'format': 'list'},
            'data_structures': {'type': 'array', 'format': 'list'},
            'optimization': {'type': 'array', 'format': 'numeric'},
            'math': {'type': 'integer', 'format': 'number'}
        }
        
        return structure_mapping.get(domain, {'type': 'array', 'format': 'list'})
    
    # =========================================================================
    # CONSTRAINTS INFERENCE
    # =========================================================================
    
    def _infer_constraints(self, data: Dict, source: str) -> Dict[str, Any]:
        """
        Infer or extract constraint information.
        Returns: Dict with constraint metadata
        """
        # Check if already provided
        existing_constraints = data.get("constraints")
        if existing_constraints and isinstance(existing_constraints, dict):
            return existing_constraints
        
        # Infer from difficulty
        difficulty = self._normalize_difficulty(data, source)
        
        base_constraints = {
            "easy": {"n_max": 1000, "time_limit": "1s"},
            "medium": {"n_max": 100000, "time_limit": "2s"},
            "hard": {"n_max": 1000000, "time_limit": "5s"}
        }
        
        return {
            **base_constraints.get(difficulty, base_constraints["medium"]),
            "difficulty": difficulty
        }
    
    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    
    def _extract_source_id(self, data: Dict, source: str) -> str:
        """Extract unique identifier for the problem"""
        return data.get("source_id", "") or data.get("title_slug", "") or data.get("slug", "") or "unknown"
    
    def _extract_source_url(self, data: Dict, source: str) -> str:
        """Extract source URL"""
        url = data.get("source_url", "") or data.get("full_question_url", "") or data.get("url", "")
        
        if not url and source == "leetcode":
            title_slug = self._extract_source_id(data, source)
            url = f"https://leetcode.com/problems/{title_slug}/"
        
        return url
    
    # =========================================================================
    # VALIDATION
    # =========================================================================
    
    def validate_pattern(self, pattern: Dict) -> bool:
        """
        Validate extracted pattern has all required fields.
        Returns: True if valid, False otherwise
        """
        required_fields = [
            "source", "source_id", "pattern", "domain",
            "difficulty", "tags", "input_structure", "constraints"
        ]
        
        for field in required_fields:
            if field not in pattern:
                logger.error(f"❌ Missing required field: {field}")
                return False
        
        # Validate difficulty
        if pattern["difficulty"] not in ["easy", "medium", "hard"]:
            logger.error(f"❌ Invalid difficulty: {pattern['difficulty']}")
            return False
        
        # Validate tags is a list
        if not isinstance(pattern["tags"], list):
            logger.error(f"❌ Tags must be a list")
            return False
        
        return True