# app/crawler/github_spider.py
"""
GitHub Spider - AST-based Code Analysis for QuestionBank
Extracts algorithmic patterns from code repositories
LEGAL: Only analyzes code structure, does NOT store README problem statements

Usage:
    spider = GitHubSpider()
    patterns = spider.crawl(
        max_repos=10,
        per_repo_max_files=60,
        max_depth=2,
        use_search=True,
        search_pages=3
    )
"""

import ast
import logging
import os
import re
import time
from typing import Dict, List, Optional, Set, Tuple

import requests

logger = logging.getLogger(__name__)


# =============================================================================
# AST PATTERN EXTRACTOR (kept close to your current logic)
# =============================================================================

class AlgorithmPatternExtractor(ast.NodeVisitor):
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
            "bit_manipulation": False,
        }
        self.loop_depth = 0

    def visit_For(self, node):
        self.features["loops"] += 1
        self.loop_depth += 1
        for child in ast.walk(node):
            if isinstance(child, (ast.For, ast.While)) and child != node:
                self.features["nested_loops"] += 1
        self.generic_visit(node)
        self.loop_depth -= 1

    def visit_While(self, node):
        self.features["loops"] += 1
        self.loop_depth += 1
        self.generic_visit(node)
        self.loop_depth -= 1

    def visit_FunctionDef(self, node):
        for child in ast.walk(node):
            if isinstance(child, ast.Call):
                if isinstance(child.func, ast.Name):
                    func_name = child.func.id

                    if func_name == node.name:
                        self.features["recursion"] = True

                    if "heap" in func_name.lower() or func_name in ["heappush", "heappop", "heapify"]:
                        self.features["heap_usage"] = True

                    if func_name in ["sort", "sorted"]:
                        self.features["sorting"] = True

                    if "bisect" in func_name or "binary_search" in func_name:
                        self.features["binary_search"] = True

                    if func_name in ["bfs", "dfs", "dijkstra", "bellman_ford"]:
                        self.features["graph_operations"] = True

                    if func_name in ["backtrack", "permute", "combine"]:
                        self.features["backtracking"] = True

        self.generic_visit(node)

    def visit_Call(self, node):
        if isinstance(node.func, ast.Attribute):
            attr_name = node.func.attr

            if attr_name in ["get", "setdefault", "update", "pop"]:
                self.features["hash_table"] = True

            if attr_name in ["popleft", "appendleft"]:
                self.features["stack_queue"] = True

            if attr_name in ["bit_length", "to_bytes"]:
                self.features["bit_manipulation"] = True

        self.generic_visit(node)

    def visit_Import(self, node):
        for alias in node.names:
            module_name = alias.name
            if "collections" in module_name:
                self.features["hash_table"] = True
                self.features["stack_queue"] = True
            if "heapq" in module_name:
                self.features["heap_usage"] = True
            if "bisect" in module_name:
                self.features["binary_search"] = True
            if "itertools" in module_name:
                self.features["backtracking"] = True

    def visit_ImportFrom(self, node):
        if node.module:
            if "collections" in node.module:
                self.features["hash_table"] = True
            if "heapq" in node.module:
                self.features["heap_usage"] = True

    def visit_Dict(self, node):
        self.features["hash_table"] = True
        if self.features["recursion"]:
            self.features["dp_indicators"] = True

    def visit_BinOp(self, node):
        if isinstance(node.op, (ast.BitAnd, ast.BitOr, ast.BitXor, ast.LShift, ast.RShift)):
            self.features["bit_manipulation"] = True
        self.generic_visit(node)

    def get_pattern(self) -> Dict:
        f = self.features

        if f["dp_indicators"] or (f["recursion"] and f["hash_table"]):
            algorithm, domain = "dynamic_programming", "optimization"
        elif f["heap_usage"] and f["graph_operations"]:
            algorithm, domain = "shortest_path", "graphs"
        elif f["heap_usage"] and f["loops"] > 1:
            algorithm, domain = "priority_queue_operations", "heaps"
        elif f["graph_operations"]:
            algorithm, domain = "graph_traversal", "graphs"
        elif f["backtracking"]:
            algorithm, domain = "backtracking", "recursion"
        elif f["recursion"]:
            algorithm, domain = "recursion", "recursion"
        elif f["binary_search"]:
            algorithm, domain = "binary_search", "arrays"
        elif f["sorting"]:
            algorithm, domain = "sorting", "arrays"
        elif f["bit_manipulation"]:
            algorithm, domain = "bit_manipulation", "math"
        elif f["stack_queue"]:
            algorithm, domain = "stack_queue", "data_structures"
        elif f["hash_table"]:
            algorithm, domain = "hash_table", "data_structures"
        elif f["loops"] > 0:
            algorithm, domain = "iteration", "arrays"
        else:
            algorithm, domain = "general", "algorithms"

        return {
            "algorithm": algorithm,
            "domain": domain,
            "features": f,
            "complexity_estimate": self._estimate_complexity(),
            "space_complexity": self._estimate_space_complexity(),
        }

    def _estimate_complexity(self) -> str:
        f = self.features
        if f["nested_loops"] >= 3:
            return "O(n^3)"
        if f["nested_loops"] == 2:
            return "O(n^2)"
        if f["recursion"] and f["dp_indicators"]:
            return "O(n)"
        if f["recursion"] and not f["dp_indicators"]:
            return "O(2^n)"
        if f["binary_search"]:
            return "O(log n)"
        if f["sorting"] or f["heap_usage"]:
            return "O(n log n)"
        if f["loops"] > 0:
            return "O(n)"
        return "O(1)"

    def _estimate_space_complexity(self) -> str:
        f = self.features
        if f["dp_indicators"]:
            return "O(n^2)" if f["nested_loops"] >= 2 else "O(n)"
        if f["recursion"] or f["heap_usage"] or f["hash_table"]:
            return "O(n)"
        return "O(1)"


# =============================================================================
# GitHub Spider
# =============================================================================

class GitHubSpider:
    def __init__(self):
        self.name = "github"
        self.base_url = "https://github.com"
        self.api_base = "https://api.github.com"

        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/vnd.github.v3+json",
            }
        )

        self.github_token = os.getenv("GITHUB_TOKEN")
        if self.github_token:
            self.session.headers.update({"Authorization": f"token {self.github_token}"})
            logger.info("✅ GitHub token configured - higher rate limits")
        else:
            logger.warning("⚠️ No GitHub token - limited to 60 requests/hour")

        # Seed repos (more than before)
        self.seed_contents_urls = [
            f"{self.api_base}/repos/TheAlgorithms/Python/contents",
            f"{self.api_base}/repos/TheAlgorithms/Java/contents",
            f"{self.api_base}/repos/TheAlgorithms/C-Plus-Plus/contents",
            f"{self.api_base}/repos/neetcode-gh/leetcode/contents",
            f"{self.api_base}/repos/keon/algorithms/contents",
        ]

    # ---------------------------------------------------------------------
    # Public API
    # ---------------------------------------------------------------------

    def crawl(
        self,
        max_repos: int = 5,
        per_repo_max_files: int = 60,
        max_depth: int = 2,
        use_search: bool = True,
        search_pages: int = 2,
        sleep_s: float = 1.2,
    ) -> List[Dict]:
        """
        Crawl GitHub and return pattern metadata.

        - max_repos: how many seed repos to walk (from seed list + optionally discovered by search)
        - per_repo_max_files: cap of analyzed files per repo (safety)
        - max_depth: directory recursion depth for contents API
        - use_search: also use GitHub Search API to discover more solution files
        - search_pages: number of pages to pull from search API (pagination)
        """
        patterns: List[Dict] = []
        seen_ids: Set[str] = set()

        repo_roots = list(self.seed_contents_urls)

        # Optional: discover more repos/files via GitHub code search (this is where pagination really matters)
        if use_search:
            discovered = self._discover_repo_roots_via_search(pages=search_pages, sleep_s=sleep_s)
            for root in discovered:
                if root not in repo_roots:
                    repo_roots.append(root)

        repo_roots = repo_roots[: max_repos]

        logger.info("🚀 GitHub spider starting: repos=%s max_depth=%s per_repo_max_files=%s use_search=%s",
                    len(repo_roots), max_depth, per_repo_max_files, use_search)

        for idx, root in enumerate(repo_roots, start=1):
            logger.info("📥 [%s/%s] Repo root: %s", idx, len(repo_roots), root)

            try:
                repo_patterns = self._walk_contents_tree(
                    contents_url=root,
                    max_depth=max_depth,
                    per_repo_max_files=per_repo_max_files,
                    sleep_s=sleep_s,
                )

                added = 0
                for p in repo_patterns:
                    sid = p.get("source_id")
                    if not sid or sid in seen_ids:
                        continue
                    seen_ids.add(sid)
                    patterns.append(p)
                    added += 1

                logger.info("✅ +%s patterns from %s", added, root)

            except Exception as e:
                logger.error("❌ Error crawling repo root %s: %s", root, e)

        logger.info("🎉 GitHub spider finished: %s patterns collected", len(patterns))
        return patterns

    # ---------------------------------------------------------------------
    # Discovery via Search API (pagination)
    # ---------------------------------------------------------------------

    def _discover_repo_roots_via_search(self, pages: int, sleep_s: float) -> List[str]:
        """
        Use GitHub code search to find popular algorithm/leetcode solution repos and convert them into
        /repos/{owner}/{repo}/contents roots.
        """
        roots: List[str] = []
        seen_repos: Set[str] = set()

        # A few broad queries – you can expand later
        queries = [
            "leetcode solutions language:Python stars:>200",
            "algorithms data structures language:Python stars:>200",
            "dynamic programming language:Python stars:>200",
        ]

        for q in queries:
            for page in range(1, pages + 1):
                try:
                    url = f"{self.api_base}/search/code"
                    params = {
                        "q": q,
                        "per_page": 30,
                        "page": page,
                    }
                    r = self.session.get(url, params=params, timeout=15)
                    if r.status_code != 200:
                        logger.warning("⚠️ search/code failed (%s): %s", r.status_code, r.text[:200])
                        break

                    data = r.json()
                    items = data.get("items", []) or []
                    if not items:
                        break

                    for it in items:
                        repo = (it.get("repository") or {})
                        full = repo.get("full_name")  # owner/repo
                        if not full or full in seen_repos:
                            continue
                        seen_repos.add(full)
                        roots.append(f"{self.api_base}/repos/{full}/contents")

                    time.sleep(sleep_s)

                except Exception as e:
                    logger.warning("⚠️ search discovery error: %s", e)
                    break

        return roots

    # ---------------------------------------------------------------------
    # Contents API traversal
    # ---------------------------------------------------------------------

    def _walk_contents_tree(
        self,
        contents_url: str,
        max_depth: int,
        per_repo_max_files: int,
        sleep_s: float,
        _depth: int = 0,
        _files_seen: int = 0,
    ) -> List[Dict]:
        if _depth > max_depth:
            return []

        out: List[Dict] = []

        r = self.session.get(contents_url, timeout=15)
        if r.status_code != 200:
            logger.warning("⚠️ contents fetch failed (%s): %s", r.status_code, contents_url)
            return out

        data = r.json()
        if not isinstance(data, list):
            return out

        for item in data:
            if len(out) + _files_seen >= per_repo_max_files:
                break

            t = item.get("type")
            name = item.get("name", "")

            if t == "file" and name.endswith(".py"):
                p = self._analyze_file(item)
                if p:
                    out.append(p)

            elif t == "dir":
                # keep exploring
                child_url = item.get("url")
                if child_url:
                    time.sleep(sleep_s)
                    child = self._walk_contents_tree(
                        contents_url=child_url,
                        max_depth=max_depth,
                        per_repo_max_files=per_repo_max_files,
                        sleep_s=sleep_s,
                        _depth=_depth + 1,
                        _files_seen=_files_seen + len(out),
                    )
                    out.extend(child)

        return out

    # ---------------------------------------------------------------------
    # File analysis
    # ---------------------------------------------------------------------

    def _analyze_file(self, file_info: Dict) -> Optional[Dict]:
        try:
            download_url = file_info.get("download_url")
            html_url = file_info.get("html_url")
            if not download_url or not html_url:
                return None

            r = self.session.get(download_url, timeout=15)
            if r.status_code != 200:
                return None

            code = r.text or ""
            if len(code) < 120 or len(code) > 12000:
                return None

            pattern = self._extract_pattern_from_code(code)
            if not pattern:
                return None

            difficulty = self._estimate_difficulty_from_code(code, pattern)

            title = self._clean_filename(file_info.get("name", "solution.py"))

            repo_name = self._extract_repo_name(html_url)

            source_id = f"github:{repo_name}:{file_info.get('path', file_info.get('name',''))}"

            return {
                "source": "github",
                "source_id": source_id,
                "title": title,
                "pattern": pattern["algorithm"],
                "domain": pattern["domain"],
                "difficulty": difficulty,
                "tags": self._generate_tags(pattern),
                "input_structure": self._infer_input_structure(pattern),
                "constraints": {
                    "time_complexity": pattern.get("complexity_estimate", "O(n)"),
                    "space_complexity": pattern.get("space_complexity", "O(1)"),
                },
                "source_url": html_url,
                "language": "python",
                "features": pattern.get("features", {}),
                "metadata": {
                    "file_name": file_info.get("name"),
                    "path": file_info.get("path"),
                    "repository": repo_name,
                    "lines_of_code": len(code.splitlines()),
                },
            }

        except Exception as e:
            logger.error("Error analyzing file %s: %s", file_info.get("name"), e)
            return None

    def _extract_pattern_from_code(self, code: str) -> Optional[Dict]:
        try:
            tree = ast.parse(code)
            extractor = AlgorithmPatternExtractor()
            extractor.visit(tree)
            return extractor.get_pattern()
        except SyntaxError:
            return None
        except Exception as e:
            logger.error("Error parsing code: %s", e)
            return None

    def _estimate_difficulty_from_code(self, code: str, pattern: Dict) -> str:
        lines = len(code.splitlines())
        f = pattern.get("features", {})
        score = 0

        if f.get("nested_loops", 0) >= 2:
            score += 3
        if f.get("dp_indicators"):
            score += 3
        if f.get("backtracking"):
            score += 3
        if f.get("graph_operations"):
            score += 2

        if f.get("recursion"):
            score += 2
        if f.get("heap_usage"):
            score += 2
        if f.get("binary_search"):
            score += 1

        if lines > 120:
            score += 2
        elif lines > 60:
            score += 1

        if score >= 6:
            return "hard"
        if score >= 3:
            return "medium"
        return "easy"

    def _generate_tags(self, pattern: Dict) -> List[str]:
        tags = [pattern["domain"], pattern["algorithm"]]
        f = pattern.get("features", {})
        mapping = {
            "recursion": "recursion",
            "dp_indicators": "dynamic-programming",
            "two_pointers": "two-pointers",
            "sorting": "sorting",
            "binary_search": "binary-search",
            "heap_usage": "heap",
            "hash_table": "hash-table",
            "backtracking": "backtracking",
            "graph_operations": "graph-algorithms",
            "bit_manipulation": "bit-manipulation",
        }
        for k, tag in mapping.items():
            if f.get(k):
                tags.append(tag)
        # unique + cap
        uniq = []
        seen = set()
        for t in tags:
            if t and t not in seen:
                seen.add(t)
                uniq.append(t)
        return uniq[:10]

    def _infer_input_structure(self, pattern: Dict) -> Dict:
        domain = pattern["domain"]
        structures = {
            "arrays": {"type": "array", "format": "list"},
            "graphs": {"type": "graph", "format": "adjacency_list"},
            "trees": {"type": "tree", "format": "tree_node"},
            "strings": {"type": "string", "format": "text"},
            "optimization": {"type": "array", "format": "numeric"},
            "heaps": {"type": "array", "format": "numeric"},
            "data_structures": {"type": "array", "format": "list"},
            "recursion": {"type": "array", "format": "list"},
            "math": {"type": "integer", "format": "number"},
        }
        return structures.get(domain, {"type": "array", "format": "list"})

    def _clean_filename(self, filename: str) -> str:
        name = filename.replace(".py", "")
        name = name.replace("_", " ").replace("-", " ")
        name = re.sub(r"\d+", "", name).strip()
        return (name.title() if name else "Coding Problem")

    def _extract_repo_name(self, url: str) -> str:
        m = re.search(r"github\.com/([^/]+/[^/]+)", url)
        return m.group(1) if m else "unknown"

    def health_check(self) -> Dict:
        try:
            r = self.session.get(f"{self.api_base}/zen", timeout=5)
            return {
                "status": "healthy" if r.status_code == 200 else "unhealthy",
                "status_code": r.status_code,
                "rate_limit_remaining": r.headers.get("X-RateLimit-Remaining", "unknown"),
                "authenticated": bool(self.github_token),
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
