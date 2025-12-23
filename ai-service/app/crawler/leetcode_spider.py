"""
LeetCode Pattern Spider
LEGAL & SAFE: Extracts ONLY algorithmic patterns and metadata.
NEVER stores problem descriptions, examples, solutions, or test cases.

Pipeline:
LeetCode → Pattern Extraction → DELETE Raw Content → Gemini AI → Vetting → Vector
"""

import requests
import logging
import time
from typing import List, Dict, Optional
import json
logger = logging.getLogger(__name__)


class LeetCodeSpider:
    def __init__(self):
        self.name = "leetcode"
        self.api_base = "https://leetcode.com/graphql"

        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Referer": "https://leetcode.com/problemset/all/",
            "Origin": "https://leetcode.com"
        })

    # ------------------------------------------------------------------
    # PUBLIC API
    # ------------------------------------------------------------------

    def crawl(self, max_problems: int = 50) -> List[Dict]:
        """
        Crawl LeetCode and return algorithmic PATTERNS ONLY
        """
        logger.info(f"🚀 Starting LeetCode pattern crawl (limit={max_problems})")

        problems = self._get_problem_list(limit=max_problems)
        patterns: List[Dict] = []

        for i, problem in enumerate(problems):
            try:
                slug = problem["titleSlug"]
                logger.info(f"📥 [{i+1}/{len(problems)}] Processing: {slug}")

                raw = self._fetch_problem_metadata(slug)
                if not raw:
                    continue

                pattern = self._extract_pattern(raw)

                # 🔥 CRITICAL: delete raw content immediately
                del raw

                if pattern:
                    patterns.append(pattern)

                time.sleep(1.5)  # rate-limit

            except Exception as e:
                logger.error(f"❌ Error processing {problem}: {e}")

        logger.info(f"🎉 LeetCode spider finished: {len(patterns)} patterns collected")
        return patterns

    # ------------------------------------------------------------------
    # GRAPHQL FETCH (METADATA ONLY)
    # ------------------------------------------------------------------

    def _fetch_problem_metadata(self, slug: str) -> Optional[Dict]:
        """
        Fetch MINIMAL metadata needed for pattern extraction
        """
        query = """
        query questionMeta($titleSlug: String!) {
            question(titleSlug: $titleSlug) {
                titleSlug
                difficulty
                topicTags { slug }
                metaData
                stats
            }
        }
        """

        try:
            response = self.session.post(
                self.api_base,
                json={"query": query, "variables": {"titleSlug": slug}},
                timeout=10
            )

            if response.status_code != 200:
                return None

            data = response.json()
            return data.get("data", {}).get("question")

        except Exception as e:
            logger.error(f"Metadata fetch failed for {slug}: {e}")
            return None

    # ------------------------------------------------------------------
    # PROBLEM LIST
    # ------------------------------------------------------------------

    def _get_problem_list(self, limit: int = 50) -> List[Dict]:
        query = """
        query problemList($limit: Int!) {
            problemsetQuestionList(limit: $limit, skip: 0) {
                questions {
                    titleSlug
                    paidOnly
                }
            }
        }
        """

        response = self.session.post(
            self.api_base,
            json={"query": query, "variables": {"limit": limit}},
            timeout=10
        )

        if response.status_code != 200:
            return []

        questions = response.json()["data"]["problemsetQuestionList"]["questions"]
        return [q for q in questions if not q["paidOnly"]]

    # ------------------------------------------------------------------
    # PATTERN EXTRACTION
    # ------------------------------------------------------------------

    def _extract_pattern(self, q: Dict) -> Dict:
        tags = [t["slug"] for t in q.get("topicTags", [])]
        difficulty = q.get("difficulty", "Medium").lower()
        metadata = q.get("metaData", "{}")

        algorithm, domain = self._classify_algorithm(tags)

        return {
            "source": "leetcode",
            "source_id": q["titleSlug"],
            "pattern": algorithm,
            "domain": domain,
            "difficulty": difficulty,
            "tags": tags[:8],
            "input_structure": self._infer_input_structure(metadata),
            "constraints": self._infer_constraints(metadata, difficulty),
        }

    # ------------------------------------------------------------------
    # CLASSIFICATION HELPERS
    # ------------------------------------------------------------------

    def _classify_algorithm(self, tags: List[str]) -> (str, str):
        tagset = set(tags)

        if "dynamic-programming" in tagset:
            return "dynamic_programming", "optimization"
        if "graph" in tagset:
            return "graph_traversal", "graphs"
        if "string" in tagset and "array" in tagset:
            return "string_processing", "strings"
        if "two-pointers" in tagset:
            return "two_pointers", "arrays"
        if "binary-search" in tagset:
            return "binary_search", "arrays"
        if "greedy" in tagset:
            return "greedy", "optimization"
        if "hash-table" in tagset:
            return "hash_table", "data_structures"
        if "recursion" in tagset:
            return "recursion", "recursion"
        if "stack" in tagset or "queue" in tagset:
            return "stack_queue", "data_structures"

        return "general_algorithm", "algorithms"

    def _infer_input_structure(self, meta: str) -> Dict:
        if not meta:
            return {"type": "array", "format": "list"}

        meta = meta.lower()

        if "string" in meta:
            return {"type": "string", "format": "text"}
        if "matrix" in meta:
            return {"type": "matrix", "format": "2d_array"}
        if "graph" in meta:
            return {"type": "graph", "format": "adjacency_list"}

        return {"type": "array", "format": "list"}

    def _infer_constraints(self, meta: str, difficulty: str) -> Dict:
        base = {
            "easy": {"n_max": 1000},
            "medium": {"n_max": 100000},
            "hard": {"n_max": 1000000},
        }

        return {
            **base.get(difficulty, base["medium"]),
            "difficulty": difficulty
        }

    # ------------------------------------------------------------------
    # HEALTH CHECK
    # ------------------------------------------------------------------

    def health_check(self) -> Dict:
        try:
            test = self._fetch_problem_metadata("two-sum")
            return {
                "status": "healthy" if test else "unhealthy",
                "source": "leetcode"
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
