"""
app/crawler/leetcode_pattern_spider.py

FIXED VERSION - LeetCode GraphQL spider (SAFE METADATA ONLY)
Fixes:
- Uses isPaidOnly (not paidOnly)
- Handles compressed responses safely (Windows/brotli issue)
- Logs readable previews on failures
- Optional cookies via env: LEETCODE_SESSION, LEETCODE_CSRF
"""

import os
import time
import logging
from typing import Any, Dict, List, Optional

import requests
import gzip
import zlib

logger = logging.getLogger(__name__)
logger.warning("✅ Loaded leetcode_pattern_spider from: %s", os.path.abspath(__file__))


class LeetCodePatternSpider:
    """
    SAFE LeetCode spider: extracts ONLY metadata + pattern
    (no statements/examples/solutions/tests).
    """

    def __init__(self):
        self.name = "leetcode"
        self.base_url = "https://leetcode.com"
        self.api_base = "https://leetcode.com/graphql"

        self.session = requests.Session()

        # ✅ IMPORTANT: do NOT request Brotli (br) to avoid garbled responses on some envs
        # requests auto-decompresses gzip/deflate reliably.
        self.session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate",  # ✅ removed br
            "Content-Type": "application/json",
            "Origin": "https://leetcode.com",
            "Referer": "https://leetcode.com/problemset/all/",
            "Connection": "keep-alive",
        })

        self._maybe_apply_cookies()

    def _maybe_apply_cookies(self) -> None:
        """
        Optional: attach cookies from your real browser session.
        Helps bypass blocking.
        """
        leetcode_session = os.getenv("LEETCODE_SESSION")
        leetcode_csrf = os.getenv("LEETCODE_CSRF")

        if leetcode_session:
            self.session.cookies.set("LEETCODE_SESSION", leetcode_session, domain="leetcode.com")
        if leetcode_csrf:
            self.session.cookies.set("csrftoken", leetcode_csrf, domain="leetcode.com")
            self.session.headers["x-csrftoken"] = leetcode_csrf

        if leetcode_session or leetcode_csrf:
            logger.info("✅ LeetCode cookies applied (LEETCODE_SESSION / LEETCODE_CSRF).")

    # ----------------------------- Public API -----------------------------

    def crawl(self, max_problems: int = 200) -> List[Dict[str, Any]]:
        logger.info("🚀 Starting LeetCode pattern crawl (limit=%s)", max_problems)

        # ✅ pick tags that map well to your extractor
        tag_slugs = [
            "array", "string", "hash-table", "two-pointers", "sliding-window",
            "binary-search", "stack", "queue", "heap-priority-queue",
            "greedy", "dynamic-programming", "graph", "tree", "backtracking",
        ]
        difficulties = ["EASY", "MEDIUM", "HARD"]

        # distribute budget
        buckets = []
        per_bucket = max(10, max_problems // (len(difficulties) + 3))

        # 1) global (no filters) for baseline
        buckets.append(({}, per_bucket))

        # 2) by difficulty
        for d in difficulties:
            buckets.append(({"difficulty": d}, per_bucket))

        # 3) by tags (rotate tags; keep it bounded)
        for t in tag_slugs[:10]:
            buckets.append(({"tags": [t]}, per_bucket))

        collected_slugs: set[str] = set()
        problems: List[Dict[str, Any]] = []

        for filters, want in buckets:
            if len(problems) >= max_problems:
                break

            need = min(want, max_problems - len(problems))
            page = self._get_problem_list(
                limit=need * 2,          # overfetch a bit (dedupe + paid filtering)
                filters=filters,
                page_size=50,
                max_skip_pages=400       # go deeper
            )

            for p in page:
                slug = p.get("titleSlug")
                if not slug or slug in collected_slugs:
                    continue
                collected_slugs.add(slug)
                problems.append(p)
                if len(problems) >= max_problems:
                    break

            logger.info("📦 Bucket done filters=%s → total=%s", filters, len(problems))

        if not problems:
            logger.error("❌ No problems returned from LeetCode API")
            return []

        patterns: List[Dict[str, Any]] = []

        for i, problem in enumerate(problems):
            slug = problem.get("titleSlug")
            if not slug:
                continue

            logger.info("📥 [%s/%s] Processing: %s", i + 1, len(problems), slug)

            meta = self._fetch_meta(slug)
            if not meta:
                logger.warning("⚠️ No metadata for %s, skipping", slug)
                continue

            pattern = self._extract_pattern(meta)
            patterns.append(pattern)

        logger.info("✅ Extracted %s patterns", len(patterns))
        return patterns

    # ----------------------------- Robust HTTP -----------------------------

    def _decode_body(self, resp: requests.Response) -> str:
        """
        Return response body as text, safely handling gzip/deflate if needed.
        requests normally decodes automatically, but we guard for edge cases.
        """
        try:
            # First try normal decoding
            return resp.text
        except Exception:
            pass

        # Fallback: decode from bytes with possible compression
        raw = resp.content or b""
        encoding = (resp.headers.get("Content-Encoding") or "").lower()

        try:
            if "gzip" in encoding:
                return gzip.decompress(raw).decode("utf-8", errors="replace")
            if "deflate" in encoding:
                return zlib.decompress(raw).decode("utf-8", errors="replace")
        except Exception:
            # If decompression fails, just try bytes->text
            return raw.decode("utf-8", errors="replace")

        return raw.decode("utf-8", errors="replace")

    def _post_graphql(self, query: str, variables: Dict[str, Any], timeout: int) -> Optional[Dict[str, Any]]:
        try:
            resp = self.session.post(
                self.api_base,
                json={"query": query, "variables": variables},
                timeout=timeout
            )

            ct = (resp.headers.get("Content-Type") or "").lower()

            if resp.status_code != 200:
                body = self._decode_body(resp)
                logger.error("❌ LeetCode API returned status %s", resp.status_code)
                logger.error("Content-Type: %s", ct)
                logger.error("Body preview: %s", (body or "")[:800])
                return None

            # Read and decode body safely
            body = self._decode_body(resp)

            # LeetCode should return JSON; if it's HTML, you're blocked
            if "application/json" not in ct and not (body.strip().startswith("{") or body.strip().startswith("[")):
                logger.error("❌ Expected JSON but got Content-Type=%s", ct)
                logger.error("Body preview: %s", (body or "")[:800])
                return None

            try:
                return resp.json()
            except Exception as e:
                # If requests failed to json-decode, try manual parse
                import json as _json
                try:
                    return _json.loads(body)
                except Exception:
                    logger.error("❌ JSON parse failed: %s", e)
                    logger.error("Content-Type: %s", ct)
                    logger.error("Body preview: %s", (body or "")[:800])
                    return None

        except requests.exceptions.RequestException as e:
            logger.error("❌ Network error calling LeetCode GraphQL: %s", e)
            return None

    # ----------------------------- LeetCode GraphQL -----------------------------

    def _fetch_meta(self, slug: str) -> Optional[Dict[str, Any]]:
        """
        Fetch SAFE metadata only for a single problem.
        Needed because _get_problem_list returns only titleSlug/isPaidOnly,
        while _extract_pattern needs topicTags + difficulty.
        """
        query = """
        query questionMeta($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
            titleSlug
            difficulty
            isPaidOnly
            topicTags {
            slug
            }
        }
        }
        """

        variables = {"titleSlug": slug}
        data = self._post_graphql(query=query, variables=variables, timeout=20)
        if not data or "errors" in data:
            if data and "errors" in data:
                logger.error("❌ GraphQL errors (meta) for %s: %s", slug, data["errors"])
            return None

        q = (data.get("data") or {}).get("question")
        if not q:
            return None

        # extra safety: ensure we didn't accidentally fetch unsafe fields
        self._assert_safe(q)

        return q

    

    def _get_problem_list(
        self,
        limit: int,
        filters: Optional[Dict[str, Any]] = None,
        *,
        page_size: int = 50,
        max_skip_pages: int = 200,
    ) -> List[Dict[str, Any]]:
        """
        Get up to `limit` FREE problems using pagination via skip/limit,
        with optional filters (tags/difficulty/etc).
        """
        query = """
        query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
        problemsetQuestionList: questionList(
            categorySlug: $categorySlug
            limit: $limit
            skip: $skip
            filters: $filters
        ) {
            questions: data {
            titleSlug
            isPaidOnly
            }
        }
        }
        """

        filters = filters or {}
        page_size = min(50, max(1, page_size))

        collected: List[Dict[str, Any]] = []
        seen: set[str] = set()

        skip = 0
        pages = 0

        logger.info(
            "📡 Fetching problem list (target=%s, page_size=%s, filters=%s)",
            limit, page_size, filters
        )

        while len(collected) < limit and pages < max_skip_pages:
            variables = {
                "categorySlug": "",
                "limit": page_size,
                "skip": skip,
                "filters": filters
            }

            data = self._post_graphql(query=query, variables=variables, timeout=20)
            if not data:
                break
            if "errors" in data:
                logger.error("❌ GraphQL errors: %s", data["errors"])
                break

            questions = data.get("data", {}).get("problemsetQuestionList", {}).get("questions", []) or []
            if not questions:
                break

            # keep only free + dedupe
            for q in questions:
                if q.get("isPaidOnly", False):
                    continue
                slug = q.get("titleSlug")
                if not slug or slug in seen:
                    continue
                seen.add(slug)
                collected.append(q)
                if len(collected) >= limit:
                    break

            skip += page_size
            pages += 1

            # no more pages
            if len(questions) < page_size:
                break

        logger.info("✅ Collected %s free problems total (filters=%s)", len(collected), filters)
        return collected[:limit]


    # ----------------------------- Pattern extraction -----------------------------

    def _extract_pattern(self, q: Dict[str, Any]) -> Dict[str, Any]:
        tags = [t.get("slug") for t in (q.get("topicTags") or []) if t.get("slug")]
        difficulty = (q.get("difficulty") or "Medium").lower()
        title_slug = q.get("titleSlug", "")

        pattern, domain = self._classify(tags)

        return {
            "source": "leetcode",
            "source_id": title_slug,
            "source_url": f"{self.base_url}/problems/{title_slug}/",
            "difficulty": difficulty,
            "tags": tags[:8],
            "pattern": pattern,
            "domain": domain,
            "input_structure": self._infer_input_structure(tags),
            "constraints": self._infer_constraints(difficulty),
            "extracted_at": time.time(),
        }

    def _classify(self, tags: List[str]) -> tuple[str, str]:
        t = set(tags)

        if "dynamic-programming" in t:
            return "dynamic_programming", "optimization"
        if "graph" in t:
            return "graph_traversal", "graphs"
        if "two-pointers" in t:
            return "two_pointers", "arrays"
        if "binary-search" in t:
            return "binary_search", "arrays"
        if "greedy" in t:
            return "greedy", "optimization"
        if "hash-table" in t:
            return "hash_table", "data_structures"
        if "string" in t:
            return "string_processing", "strings"
        if "tree" in t or "binary-tree" in t:
            return "tree_traversal", "trees"
        if "stack" in t or "queue" in t:
            return "stack_queue", "data_structures"
        if "recursion" in t or "backtracking" in t:
            return "recursion", "recursion"
        if "sliding-window" in t:
            return "sliding_window", "arrays"
        if "heap" in t or "priority-queue" in t:
            return "heap_operations", "heaps"

        return "general_algorithm", "algorithms"

    def _infer_input_structure(self, tags: List[str]) -> Dict[str, str]:
        t = set(tags)

        if "string" in t:
            return {"type": "string", "format": "text"}
        if "matrix" in t or ("array" in t and "2d" in str(t)):
            return {"type": "matrix", "format": "2d_array"}
        if "tree" in t or "binary-tree" in t:
            return {"type": "tree", "format": "tree_node"}
        if "graph" in t:
            return {"type": "graph", "format": "adjacency_list"}
        if "linked-list" in t:
            return {"type": "linked_list", "format": "nodes"}

        return {"type": "array", "format": "list"}

    def _infer_constraints(self, difficulty: str) -> Dict[str, Any]:
        base = {
            "easy": {"n_max": 1000, "time_limit": "1s"},
            "medium": {"n_max": 100000, "time_limit": "2s"},
            "hard": {"n_max": 1000000, "time_limit": "5s"}
        }
        constraints = base.get(difficulty, base["medium"]).copy()
        constraints["difficulty"] = difficulty
        return constraints

    def _assert_safe(self, obj: Dict[str, Any]) -> None:
        forbidden = {
            "content", "problemStatement", "description",
            "exampleTestcases", "sampleTestCase", "codeSnippets",
            "hints", "testCases", "canonicalSolution"
        }
        bad = forbidden.intersection(obj.keys())
        if bad:
            raise RuntimeError(f"Unsafe LeetCode payload (forbidden keys present): {sorted(bad)}")

    def health_check(self) -> Dict[str, Any]:
        try:
            test = self._fetch_meta("two-sum")
            if test:
                return {"status": "healthy", "source": "leetcode", "message": "LeetCode GraphQL reachable"}
            return {"status": "unhealthy", "source": "leetcode", "message": "Cannot fetch test problem"}
        except Exception as e:
            return {"status": "error", "source": "leetcode", "error": str(e)}
