# app/crawler/stackoverflow_spider.py
import os
import time
import logging
import requests
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


class StackOverflowAPISpider:
    """
    StackOverflow spider using Stack Exchange API.

    Orchestrator-compatible:
    - crawl(max_pages=..., start_page=..., pagesize=...) -> List[Dict]
    - Handles throttling + backoff
    - Never raises on 400/429 (retries then fails softly with {})
    """

    BASE_API = "https://api.stackexchange.com/2.3"
    SITE = "stackoverflow"

    def __init__(
        self,
        tags: Optional[List[str]] = None,       # None => defaults to ["python"]
        pagesize: int = 30,                     # <= 100
        order: str = "desc",
        sort: str = "votes",
        throttle_sec: float = 2.0,              # ✅ slower by default
        api_key: Optional[str] = None,
    ):
        self.name = "stackoverflow"
        self.tags = tags or ["python"]
        self.pagesize = max(1, min(int(pagesize), 100))
        self.order = order
        self.sort = sort
        self.throttle_sec = float(throttle_sec)

        # ✅ reads from .env: STACKEXCHANGE_KEY=...
        self.api_key = api_key or os.getenv("STACKEXCHANGE_KEY")

        self.session = requests.Session()
        self.session.headers.update(
            {"User-Agent": "Mozilla/5.0 (compatible; HiralentBot/1.0)"}
        )

    # ------------------------------------------------------------------
    # PUBLIC
    # ------------------------------------------------------------------

    def crawl(
        self,
        max_pages: int = 2,
        start_page: int = 1,
        pagesize: Optional[int] = None,
        **kwargs,
    ) -> List[Dict[str, Any]]:
        """
        Fetch questions for each tag for (start_page .. start_page+max_pages-1).
        Returns normalized dicts ready for UnifiedPatternExtractor.
        """
        if pagesize is not None:
            self.pagesize = max(1, min(int(pagesize), 100))

        results: List[Dict[str, Any]] = []

        logger.info(
            "[SO] crawl start start_page=%s max_pages=%s pagesize=%s tags=%s sort=%s key=%s",
            start_page,
            max_pages,
            self.pagesize,
            self.tags,
            self.sort,
            "YES" if self.api_key else "NO",
        )

        for tag in self.tags:
            for page in range(int(start_page), int(start_page) + int(max_pages)):
                data = self._fetch_questions(tag=tag, page=page)

                # stop on repeated failure
                if not data:
                    logger.warning("[SO] stop: empty data (tag=%s page=%s)", tag, page)
                    break

                items = data.get("items", []) or []
                logger.info("[SO] got items=%s tag=%s page=%s", len(items), tag, page)

                for q in items:
                    obj = self._to_pattern(q, tag)
                    if obj:
                        results.append(obj)

                if not data.get("has_more", False):
                    break

                # ✅ always sleep between successful pages
                time.sleep(self.throttle_sec)

        logger.info("[SO] crawl done results=%s", len(results))
        return results

    def health_check(self) -> Dict[str, Any]:
        try:
            tag = self.tags[0] if self.tags else "python"
            data = self._fetch_questions(tag=tag, page=1)
            return {
                "status": "healthy" if data else "unhealthy",
                "source": "stackoverflow",
                "quota_remaining": (data.get("quota_remaining") if data else None),
                "has_key": bool(self.api_key),
            }
        except Exception as e:
            return {"status": "error", "source": "stackoverflow", "error": str(e)}

    # ------------------------------------------------------------------
    # INTERNAL API CALL (robust)
    # ------------------------------------------------------------------

    def _fetch_questions(self, tag: str, page: int) -> Dict[str, Any]:
        url = f"{self.BASE_API}/questions"
        params = {
            "site": self.SITE,
            "tagged": tag,
            "pagesize": self.pagesize,
            "page": int(page),
            "order": self.order,
            "sort": self.sort,
            "filter": "default",
        }
        if self.api_key:
            params["key"] = self.api_key

        max_retries = 6
        wait = max(2.0, self.throttle_sec)  # ✅ base wait

        for attempt in range(1, max_retries + 1):
            try:
                r = self.session.get(url, params=params, timeout=20)

                # 429: Too many requests
                if r.status_code == 429:
                    logger.warning("[SO] 429 rate limit. attempt=%s wait=%ss url=%s", attempt, wait, r.url)
                    time.sleep(wait)
                    wait = min(wait * 2, 120)
                    continue

                # 400: often throttle_violation/backoff as JSON payload
                if r.status_code == 400:
                    try:
                        data = r.json()
                    except Exception:
                        logger.error("[SO] 400 non-json. body=%s", (r.text or "")[:300])
                        time.sleep(wait)
                        wait = min(wait * 2, 120)
                        continue

                    err_name = data.get("error_name")
                    err_msg = data.get("error_message")
                    backoff = data.get("backoff")

                    logger.warning("[SO] 400 error_name=%s error_message=%s backoff=%s", err_name, err_msg, backoff)

                    # respect explicit backoff if present
                    if backoff:
                        time.sleep(int(backoff) + 1)
                        continue

                    # common throttle errors (including your case)
                    if err_name in {"throttle_violation", "rate_limit", "temporarily_unavailable"}:
                        time.sleep(wait)
                        wait = min(wait * 2, 120)
                        continue

                    # unknown 400 -> stop softly
                    return {}

                # other non-200 -> retry
                if r.status_code != 200:
                    logger.warning("[SO] status=%s attempt=%s url=%s", r.status_code, attempt, r.url)
                    time.sleep(wait)
                    wait = min(wait * 2, 120)
                    continue

                data = r.json() if r.content else {}

                # StackExchange can send error payload even on 200
                if "error_id" in data:
                    logger.warning(
                        "[SO] 200 but error payload: %s - %s",
                        data.get("error_name"),
                        data.get("error_message"),
                    )
                    backoff = data.get("backoff")
                    time.sleep(int(backoff) + 1 if backoff else wait)
                    wait = min(wait * 2, 120)
                    continue

                # Respect backoff field on success responses
                backoff = data.get("backoff")
                if backoff:
                    time.sleep(int(backoff) + 1)

                return data

            except Exception as e:
                logger.warning("[SO] exception attempt=%s tag=%s page=%s err=%s", attempt, tag, page, e)
                time.sleep(wait)
                wait = min(wait * 2, 120)

        logger.error("[SO] FAILED after retries tag=%s page=%s", tag, page)
        return {}

    # ------------------------------------------------------------------
    # TRANSFORM
    # ------------------------------------------------------------------

    def _to_pattern(self, q: Dict[str, Any], primary_tag: str) -> Optional[Dict[str, Any]]:
        title = (q.get("title") or "").strip()
        link = q.get("link")
        qid = q.get("question_id")
        if not title or not link or not qid:
            return None

        tags = q.get("tags") or []
        score = int(q.get("score", 0) or 0)

        difficulty = self._difficulty_from_score(score)
        pattern, domain = self._classify(tags, title)

        return {
            "source": "stackoverflow",
            "source_id": f"stackoverflow:{qid}",
            "source_url": link,
            "difficulty": difficulty,
            "tags": tags[:8] if tags else [primary_tag],
            "pattern": pattern,
            "domain": domain,
            "input_structure": {"type": "n/a"},
            "constraints": {"score": score},
            "title": title,
            "extracted_at": time.time(),
        }

    # ------------------------------------------------------------------
    # HEURISTICS
    # ------------------------------------------------------------------

    def _difficulty_from_score(self, score: int) -> str:
        if score >= 2000:
            return "easy"
        if score >= 500:
            return "medium"
        return "hard"

    def _classify(self, tags: List[str], title: str) -> Tuple[str, str]:
        t = set([x.lower() for x in (tags or [])])
        txt = title.lower()

        # domain detection
        if "python" in t:
            domain = "python"
        elif "javascript" in t or "typescript" in t:
            domain = "javascript"
        elif "java" in t:
            domain = "java"
        elif "c++" in t:
            domain = "cpp"
        elif "c#" in t:
            domain = "csharp"
        elif "go" in t:
            domain = "golang"
        elif "rust" in t:
            domain = "rust"
        elif "sql" in t or "postgresql" in t or "mysql" in t:
            domain = "databases"
        else:
            domain = "software_engineering"

        # pattern detection
        if "regex" in t or "regular-expression" in t or "regex" in txt:
            return "regex", domain
        if "pandas" in t or "dataframe" in txt:
            return "data_processing", "data"
        if "django" in t or "flask" in t or "fastapi" in t:
            return "web_backend", domain
        if "reactjs" in t or "vue.js" in t or "angular" in t:
            return "frontend", "web"
        if "docker" in t or "kubernetes" in t:
            return "devops", "infrastructure"
        if "multithreading" in t or "asyncio" in t or "concurrency" in t or "async-await" in t:
            return "concurrency", domain
        if "oop" in t or "metaclass" in txt:
            return "oop_metaprogramming", domain
        if any(k in txt for k in ["list", "dictionary", "hashmap", "set", "map"]):
            return "data_structures", domain
        if any(k in txt for k in ["yield", "generator", "iterator"]):
            return "generators_iterators", domain
        if any(k in txt for k in ["error", "exception", "traceback"]):
            return "debugging", domain

        return "general_programming", domain
