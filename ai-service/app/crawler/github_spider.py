# app/crawler/github_spider.py
"""
GitHub Spider - AST-based Code Analysis for QuestionBank
Extracts algorithmic patterns from code repositories
LEGAL: Only analyzes code structure, does NOT store README problem statements

Usage:
    spider = GitHubSpider()
    patterns = spider.crawl(max_pages=3)
    # patterns are then used to generate questions via Gemini AI
"""

import ast
import requests
import re
import os
import time
from typing import List, Dict, Optional
from bs4 import BeautifulSoup
import logging

logger = logging.getLogger(__name__)


class AlgorithmPatternExtractor(ast.NodeVisitor):
    """
    Extract algorithmic patterns from Python code using AST analysis
    This is LEGAL because we're analyzing code structure, not copying content
    """
    
    def __init__(self):
        self.features = {
            "loops": 0,
            "nested_loops": 0,
            "recursion": False,
            "heap_usage": False,
            "graph_operations": False,
            "dp_indicators": False,
            "sorting": False,
            "hash_table": False,
            "tree_operations": False,
            "stack_queue": False,
            "two_pointers": False,
            "binary_search": False,
            "backtracking": False,
            "greedy": False,
            "bit_manipulation": False
        }
        self.function_calls = []
        self.data_structures = []
        self.complexity_hints = []
        self.loop_depth = 0
    
    def visit_For(self, node):
        """Detect loops and nested patterns"""
        self.features["loops"] += 1
        self.loop_depth += 1
        
        # Check for nested loops
        for child in ast.walk(node):
            if isinstance(child, (ast.For, ast.While)) and child != node:
                self.features["nested_loops"] += 1
        
        self.generic_visit(node)
        self.loop_depth -= 1
    
    def visit_While(self, node):
        """Detect while loops"""
        self.features["loops"] += 1
        self.loop_depth += 1
        self.generic_visit(node)
        self.loop_depth -= 1
    
    def visit_FunctionDef(self, node):
        """Detect function patterns and recursion"""
        # Check for recursion
        for child in ast.walk(node):
            if isinstance(child, ast.Call):
                if isinstance(child.func, ast.Name):
                    func_name = child.func.id
                    
                    # Recursion detection
                    if func_name == node.name:
                        self.features["recursion"] = True
                    
                    # Library function detection
                    self.function_calls.append(func_name)
                    
                    # Heap operations (priority queue)
                    if 'heap' in func_name.lower() or func_name in ['heappush', 'heappop', 'heapify']:
                        self.features["heap_usage"] = True
                    
                    # Sorting
                    if func_name in ['sort', 'sorted']:
                        self.features["sorting"] = True
                    
                    # Binary search
                    if 'bisect' in func_name or 'binary_search' in func_name:
                        self.features["binary_search"] = True
                    
                    # Graph operations
                    if func_name in ['bfs', 'dfs', 'dijkstra', 'bellman_ford']:
                        self.features["graph_operations"] = True
                    
                    # Backtracking indicators
                    if func_name in ['backtrack', 'permute', 'combine']:
                        self.features["backtracking"] = True
        
        self.generic_visit(node)
    
    def visit_Call(self, node):
        """Detect special function calls and patterns"""
        if isinstance(node.func, ast.Attribute):
            attr_name = node.func.attr
            
            # Dictionary/Hash table operations
            if attr_name in ['get', 'setdefault', 'update', 'pop']:
                self.features["hash_table"] = True
            
            # List operations (two pointers pattern)
            if attr_name in ['pop', 'append', 'extend'] and self.features["loops"] > 0:
                self.features["two_pointers"] = True
            
            # Stack/Queue operations
            if attr_name in ['popleft', 'appendleft']:
                self.features["stack_queue"] = True
            
            # Bit manipulation
            if attr_name in ['bit_length', 'to_bytes']:
                self.features["bit_manipulation"] = True
        
        self.generic_visit(node)
    
    def visit_Import(self, node):
        """Detect imported modules"""
        for alias in node.names:
            module_name = alias.name
            
            if 'collections' in module_name:
                self.features["hash_table"] = True
                self.features["stack_queue"] = True
            if 'heapq' in module_name:
                self.features["heap_usage"] = True
            if 'bisect' in module_name:
                self.features["binary_search"] = True
            if 'itertools' in module_name:
                self.features["backtracking"] = True
    
    def visit_ImportFrom(self, node):
        """Detect from...import statements"""
        if node.module:
            if 'collections' in node.module:
                self.features["hash_table"] = True
            if 'heapq' in node.module:
                self.features["heap_usage"] = True
    
    def visit_Dict(self, node):
        """Detect dictionary usage (memoization/DP)"""
        self.features["hash_table"] = True
        # If dictionary is used with recursion, likely DP
        if self.features["recursion"]:
            self.features["dp_indicators"] = True
    
    def visit_ListComp(self, node):
        """Detect list comprehensions (functional programming)"""
        # Count generators inside comprehension
        if len(node.generators) > 1:
            self.features["nested_loops"] += 1
    
    def visit_BinOp(self, node):
        """Detect binary operations (bit manipulation)"""
        if isinstance(node.op, (ast.BitAnd, ast.BitOr, ast.BitXor, ast.LShift, ast.RShift)):
            self.features["bit_manipulation"] = True
        self.generic_visit(node)
    
    def get_pattern(self) -> Dict:
        """
        Map extracted features to algorithmic patterns
        Returns abstract pattern, NOT original code
        """
        features = self.features
        
        # Pattern classification logic (priority-based)
        if features["dp_indicators"] or (features["recursion"] and features["hash_table"]):
            algorithm = "dynamic_programming"
            domain = "optimization"
        elif features["heap_usage"] and features["graph_operations"]:
            algorithm = "shortest_path"
            domain = "graphs"
        elif features["heap_usage"] and features["loops"] > 1:
            algorithm = "priority_queue_operations"
            domain = "heaps"
        elif features["graph_operations"]:
            algorithm = "graph_traversal"
            domain = "graphs"
        elif features["backtracking"]:
            algorithm = "backtracking"
            domain = "recursion"
        elif features["recursion"] and features["tree_operations"]:
            algorithm = "tree_traversal"
            domain = "trees"
        elif features["recursion"] and not features["dp_indicators"]:
            algorithm = "recursion"
            domain = "recursion"
        elif features["binary_search"]:
            algorithm = "binary_search"
            domain = "arrays"
        elif features["two_pointers"] or (features["loops"] >= 2 and not features["nested_loops"]):
            algorithm = "two_pointers"
            domain = "arrays"
        elif features["nested_loops"] >= 2:
            algorithm = "nested_iteration"
            domain = "arrays"
        elif features["sorting"]:
            algorithm = "sorting"
            domain = "arrays"
        elif features["bit_manipulation"]:
            algorithm = "bit_manipulation"
            domain = "math"
        elif features["stack_queue"]:
            algorithm = "stack_queue"
            domain = "data_structures"
        elif features["hash_table"]:
            algorithm = "hash_table"
            domain = "data_structures"
        elif features["loops"] > 0:
            algorithm = "iteration"
            domain = "arrays"
        else:
            algorithm = "general"
            domain = "algorithms"
        
        return {
            "algorithm": algorithm,
            "domain": domain,
            "features": features,
            "complexity_estimate": self._estimate_complexity(),
            "space_complexity": self._estimate_space_complexity()
        }
    
    def _estimate_complexity(self) -> str:
        """Estimate time complexity based on features"""
        features = self.features
        
        if features["nested_loops"] >= 3:
            return "O(n^3)"
        elif features["nested_loops"] == 2:
            return "O(n^2)"
        elif features["recursion"] and features["dp_indicators"]:
            return "O(n)"
        elif features["recursion"] and not features["dp_indicators"]:
            return "O(2^n)"
        elif features["binary_search"]:
            return "O(log n)"
        elif features["sorting"]:
            return "O(n log n)"
        elif features["heap_usage"]:
            return "O(n log n)"
        elif features["loops"] > 0:
            return "O(n)"
        else:
            return "O(1)"
    
    def _estimate_space_complexity(self) -> str:
        """Estimate space complexity"""
        features = self.features
        
        if features["dp_indicators"]:
            if features["nested_loops"] >= 2:
                return "O(n^2)"
            else:
                return "O(n)"
        elif features["recursion"]:
            return "O(n)"
        elif features["heap_usage"] or features["hash_table"]:
            return "O(n)"
        else:
            return "O(1)"


class GitHubSpider:
    """
    GitHub Spider - Analyzes code repositories for algorithmic patterns
    LEGAL: Only extracts patterns from code structure, never stores README text
    
    This spider feeds the QuestionBank by:
    1. Analyzing GitHub repositories with coding solutions
    2. Extracting algorithmic patterns using AST
    3. Returning patterns (NOT code) to be used by Gemini AI
    4. Gemini generates original questions based on these patterns
    """
    
    def __init__(self):
        self.name = "github"
        self.base_url = "https://github.com"
        self.api_base = "https://api.github.com"
        
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/vnd.github.v3+json'
        })
        
        # GitHub API token (optional but recommended for rate limits)
        self.github_token = os.getenv('GITHUB_TOKEN')
        
        if self.github_token:
            self.session.headers.update({
                'Authorization': f'token {self.github_token}'
            })
            logger.info("✅ GitHub token configured - 5000 requests/hour")
        else:
            logger.warning("⚠️ No GitHub token - limited to 60 requests/hour")
        
        # Popular coding problem repositories
        self.start_urls = [
            f"{self.api_base}/repos/TheAlgorithms/Python/contents/sorts",
            f"{self.api_base}/repos/TheAlgorithms/Python/contents/searches",
            f"{self.api_base}/repos/TheAlgorithms/Python/contents/dynamic_programming",
            f"{self.api_base}/repos/keon/algorithms/contents/dp",
            f"{self.api_base}/repos/keon/algorithms/contents/array",
            f"{self.api_base}/repos/keon/algorithms/contents/tree",
        ]
    
    def crawl(self, max_pages: int = 3) -> List[Dict]:
        """
        Execute the crawling with pagination
        Returns: List of patterns (NOT full code)
        """
        all_patterns = []
        
        logger.info(f"🚀 Starting GitHub spider with {len(self.start_urls)} repositories")
        
        for i, url in enumerate(self.start_urls[:max_pages]):
            try:
                logger.info(f"📥 Crawling repository {i+1}/{min(max_pages, len(self.start_urls))}: {url}")
                
                response = self.session.get(url, timeout=15)
                response.raise_for_status()
                
                # Extract patterns from this repository
                patterns = self.extract_problems(response.text)
                all_patterns.extend(patterns)
                
                logger.info(f"✅ Extracted {len(patterns)} patterns from {url}")
                
                # Rate limiting
                time.sleep(2)
                
            except requests.RequestException as e:
                logger.error(f"❌ Network error crawling {url}: {e}")
                continue
            except Exception as e:
                logger.error(f"❌ Error processing {url}: {e}")
                continue
        
        logger.info(f"🎉 GitHub spider finished: {len(all_patterns)} patterns collected")
        return all_patterns
    
    def extract_problems(self, html: str) -> List[Dict]:
        """
        Extract algorithmic patterns from GitHub repository
        Returns: List of patterns (NOT full code)
        """
        patterns = []
        
        try:
            import json
            data = json.loads(html)
            
            # If it's a file list
            if isinstance(data, list):
                for item in data:
                    if item['type'] == 'file' and item['name'].endswith('.py'):
                        pattern = self._analyze_file(item)
                        if pattern:
                            patterns.append(pattern)
                            logger.info(f"✅ Analyzed: {item['name']}")
                    elif item['type'] == 'dir' and len(patterns) < 50:
                        # Recursively explore directories (limited)
                        sub_patterns = self._explore_directory(item['url'], depth=1)
                        patterns.extend(sub_patterns)
            
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing GitHub response: {e}")
        except Exception as e:
            logger.error(f"Error extracting from GitHub: {e}")
        
        return patterns
    
    def _analyze_file(self, file_info: Dict) -> Optional[Dict]:
        """
        Analyze a single Python file and extract pattern
        Returns: Pattern data for QuestionBank
        """
        try:
            # Download file content
            download_url = file_info.get('download_url')
            if not download_url:
                return None
            
            response = self.session.get(download_url, timeout=10)
            if response.status_code != 200:
                return None
            
            code = response.text
            
            # Skip files that are too short or too long
            if len(code) < 100 or len(code) > 10000:
                return None
            
            # Extract pattern using AST
            pattern = self._extract_pattern_from_code(code)
            
            if not pattern:
                return None
            
            # Estimate difficulty
            difficulty = self._estimate_difficulty_from_code(code, pattern)
            
            # Generate clean title from filename
            title = self._clean_filename(file_info['name'])
            
            return {
                'source': 'github',
                'title': title,
                'pattern': pattern['algorithm'],
                'domain': pattern['domain'],
                'difficulty': difficulty,
                'tags': self._generate_tags(pattern),
                'input_structure': self._infer_input_structure(pattern),
                'constraints': {
                    'time_complexity': pattern.get('complexity_estimate', 'O(n)'),
                    'space_complexity': pattern.get('space_complexity', 'O(1)')
                },
                'source_url': file_info['html_url'],
                'language': 'python',
                'features': pattern.get('features', {}),
                'metadata': {
                    'file_name': file_info['name'],
                    'repository': self._extract_repo_name(file_info['html_url']),
                    'lines_of_code': len(code.split('\n'))
                }
            }
            
        except Exception as e:
            logger.error(f"Error analyzing file {file_info.get('name')}: {e}")
            return None
    
    def _extract_pattern_from_code(self, code: str) -> Optional[Dict]:
        """
        Extract algorithmic pattern from Python code using AST
        """
        try:
            tree = ast.parse(code)
            extractor = AlgorithmPatternExtractor()
            extractor.visit(tree)
            return extractor.get_pattern()
        except SyntaxError as e:
            logger.warning(f"Syntax error in code: {e}")
            return None
        except Exception as e:
            logger.error(f"Error parsing code: {e}")
            return None
    
    def _estimate_difficulty_from_code(self, code: str, pattern: Dict) -> str:
        """
        Estimate difficulty based on code complexity
        """
        lines = len(code.split('\n'))
        features = pattern.get('features', {})
        
        # Difficulty scoring
        complexity_score = 0
        
        # High complexity indicators
        if features.get('nested_loops', 0) >= 2:
            complexity_score += 3
        if features.get('dp_indicators'):
            complexity_score += 3
        if features.get('backtracking'):
            complexity_score += 3
        if features.get('graph_operations'):
            complexity_score += 2
        
        # Medium complexity indicators
        if features.get('recursion'):
            complexity_score += 2
        if features.get('heap_usage'):
            complexity_score += 2
        if features.get('binary_search'):
            complexity_score += 1
        if features.get('two_pointers'):
            complexity_score += 1
        
        # Code length factor
        if lines > 100:
            complexity_score += 2
        elif lines > 50:
            complexity_score += 1
        
        # Classify difficulty
        if complexity_score >= 6:
            return 'hard'
        elif complexity_score >= 3:
            return 'medium'
        else:
            return 'easy'
    
    def _generate_tags(self, pattern: Dict) -> List[str]:
        """Generate skill tags based on pattern"""
        tags = [pattern['domain'], pattern['algorithm']]
        
        features = pattern.get('features', {})
        tag_mapping = {
            'recursion': 'recursion',
            'dp_indicators': 'dynamic-programming',
            'two_pointers': 'two-pointers',
            'sorting': 'sorting',
            'binary_search': 'binary-search',
            'heap_usage': 'heap',
            'hash_table': 'hash-table',
            'backtracking': 'backtracking',
            'graph_operations': 'graph-algorithms',
            'bit_manipulation': 'bit-manipulation'
        }
        
        for feature, tag in tag_mapping.items():
            if features.get(feature):
                tags.append(tag)
        
        return list(set(tags))[:8]  # Unique tags, max 8
    
    def _infer_input_structure(self, pattern: Dict) -> Dict:
        """Infer input structure from pattern"""
        domain = pattern['domain']
        
        structures = {
            'arrays': {'type': 'array', 'format': 'list'},
            'graphs': {'type': 'graph', 'format': 'adjacency_list'},
            'trees': {'type': 'tree', 'format': 'tree_node'},
            'strings': {'type': 'string', 'format': 'text'},
            'optimization': {'type': 'array', 'format': 'numeric'},
            'heaps': {'type': 'array', 'format': 'numeric'},
            'data_structures': {'type': 'array', 'format': 'list'},
            'recursion': {'type': 'array', 'format': 'list'},
            'math': {'type': 'integer', 'format': 'number'}
        }
        
        return structures.get(domain, {'type': 'array', 'format': 'list'})
    
    def _explore_directory(self, dir_url: str, depth: int = 0) -> List[Dict]:
        """
        Recursively explore GitHub directory (limited depth)
        """
        if depth > 1:  # Limit recursion depth
            return []
        
        patterns = []
        
        try:
            response = self.session.get(dir_url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                
                for item in data[:10]:  # Limit to 10 items per directory
                    if item['type'] == 'file' and item['name'].endswith('.py'):
                        pattern = self._analyze_file(item)
                        if pattern:
                            patterns.append(pattern)
                
                time.sleep(1)  # Rate limiting
            
        except Exception as e:
            logger.error(f"Error exploring directory: {e}")
        
        return patterns
    
    def _clean_filename(self, filename: str) -> str:
        """Convert filename to readable title"""
        # Remove .py extension
        name = filename.replace('.py', '')
        
        # Replace underscores and dashes with spaces
        name = name.replace('_', ' ').replace('-', ' ')
        
        # Title case
        name = name.title()
        
        # Remove numbers
        name = re.sub(r'\d+', '', name).strip()
        
        return name or "Coding Problem"
    
    def _extract_repo_name(self, url: str) -> str:
        """Extract repository name from URL"""
        match = re.search(r'github\.com/([^/]+/[^/]+)', url)
        return match.group(1) if match else "unknown"
    
    def health_check(self) -> Dict:
        """Check if GitHub API is accessible"""
        try:
            response = self.session.get(f"{self.api_base}/zen", timeout=5)
            return {
                "status": "healthy" if response.status_code == 200 else "unhealthy",
                "status_code": response.status_code,
                "rate_limit_remaining": response.headers.get('X-RateLimit-Remaining', 'unknown'),
                "authenticated": bool(self.github_token)
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }