import time
import requests
from typing import Any, Dict, List, Optional, Tuple


class StackOverflowAPISpider:
    """
    StackOverflow spider using Stack Exchange API (no HTML scraping / no Cloudflare issues).

    Modes:
    - ALL topics: tags=None  -> fetches top questions across StackOverflow (by votes by default)
    - Tagged mode: tags=[...] -> fetches questions filtered by tag(s)
    """

    BASE_API = "https://api.stackexchange.com/2.3"
    SITE = "stackoverflow"

    def __init__(
        self,
        tags: Optional[List[str]] = None,   # None => ALL topics
        pagesize: int = 20,
        sort: str = "votes",
        order: str = "desc",
        throttle_sec: float = 0.5,
        api_key: Optional[str] = None,
    ):
        self.name = "stackoverflow"
        self.tags = tags  # ✅ None means ALL topics
        self.pagesize = max(1, min(pagesize, 100))
        self.sort = sort
        self.order = order
        self.throttle_sec = throttle_sec
        self.api_key = api_key
        self.session = requests.Session()

    # ------------------------------------------------------------------
    # PUBLIC
    # ------------------------------------------------------------------

    def crawl(self, max_pages: int = 1) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []

        # ✅ MODE A: ALL TOPICS
        if not self.tags:
            for page in range(1, max_pages + 1):
                data = self._fetch_questions(tag=None, page=page)
                items = data.get("items", [])

                for q in items:
                    out.append(self._to_pattern(q, primary_tag="all"))

                time.sleep(self.throttle_sec)

        # ✅ MODE B: TAGGED
        else:
            for tag in self.tags:
                page = 1
                has_more = True

                while has_more and page <= max_pages:
                    data = self._fetch_questions(tag=tag, page=page)
                    items = data.get("items", [])
                    has_more = bool(data.get("has_more"))

                    for q in items:
                        out.append(self._to_pattern(q, primary_tag=tag))

                    page += 1
                    time.sleep(self.throttle_sec)

        # de-dup by source_id
        uniq = {x["source_id"]: x for x in out}
        return list(uniq.values())

    def health_check(self) -> Dict[str, Any]:
        try:
            # fetch one page in ALL-topics mode or tagged mode
            tag = None if not self.tags else self.tags[0]
            data = self._fetch_questions(tag=tag, page=1)
            return {
                "status": "healthy",
                "source": "stackoverflow",
                "quota_remaining": data.get("quota_remaining"),
            }
        except Exception as e:
            return {"status": "error", "source": "stackoverflow", "error": str(e)}

    # ------------------------------------------------------------------
    # INTERNAL API CALL
    # ------------------------------------------------------------------

    def _fetch_questions(self, tag: Optional[str], page: int) -> Dict[str, Any]:
        """
        Fetch questions via Stack Exchange API.
        If tag is None -> ALL topics.
        """
        url = f"{self.BASE_API}/questions"
        params = {
            "site": self.SITE,
            "pagesize": self.pagesize,
            "page": page,
            "order": self.order,
            "sort": self.sort,
            # default filter includes title, link, tags, score, etc.
            "filter": "default",
        }

        # ✅ Only filter by tag when provided
        if tag:
            params["tagged"] = tag

        if self.api_key:
            params["key"] = self.api_key

        r = self.session.get(url, params=params, timeout=20)
        r.raise_for_status()
        return r.json()

    # ------------------------------------------------------------------
    # TRANSFORM -> PATTERN OBJECT
    # ------------------------------------------------------------------

    def _to_pattern(self, q: Dict[str, Any], primary_tag: str) -> Dict[str, Any]:
        title = (q.get("title") or "").strip()
        tags = q.get("tags") or []
        score = int(q.get("score", 0) or 0)
        link = q.get("link")
        qid = q.get("question_id")

        difficulty = self._difficulty_from_score(score)
        pattern, domain = self._classify(tags, title)

        return {
            "source": "stackoverflow",
            "source_id": str(qid),
            "source_url": link,
            "difficulty": difficulty,                 # heuristic
            "tags": tags[:8] if tags else [primary_tag],
            "pattern": pattern,
            "domain": domain,
            "input_structure": {"type": "n/a"},
            "constraints": {"score": score},
            "title": title,                           # safe to keep (not full body)
            "extracted_at": time.time(),
        }

    # ------------------------------------------------------------------
    # HEURISTICS
    # ------------------------------------------------------------------

    def _difficulty_from_score(self, score: int) -> str:
        # simple heuristic: high score = common / easier topic
        if score >= 2000:
            return "easy"
        if score >= 500:
            return "medium"
        return "hard"

    def _classify(self, tags: List[str], title: str) -> Tuple[str, str]:
        t = set([x.lower() for x in tags])
        txt = title.lower()

        # domain detection
        if "python" in t:
            domain = "python"
        elif "javascript" in t or "typescript" in t:
            domain = "javascript"
        elif "java" in t:
            domain = "java"
        elif "c#" in t or "c%23" in t:
            domain = "csharp"
        elif "c++" in t:
            domain = "cpp"
        elif "go" in t:
            domain = "golang"
        elif "rust" in t:
            domain = "rust"
        elif "kotlin" in t:
            domain = "kotlin"
        elif "swift" in t:
            domain = "swift"
        elif "sql" in t or "postgresql" in t or "mysql" in t:
            domain = "databases"
        else:
            domain = "software_engineering"

        # pattern detection (rough, extendable)
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
        if "multithreading" in t or "async-await" in t or "asyncio" in t or "concurrency" in t:
            return "concurrency", domain
        if "oop" in t or "metaclass" in txt:
            return "oop_metaprogramming", domain
        if "list" in txt or "dictionary" in txt or "set" in txt or "map" in txt:
            return "data_structures", domain
        if "yield" in txt or "generator" in txt or "iterator" in txt:
            return "generators_iterators", domain
        if "error" in txt or "exception" in txt or "traceback" in txt:
            return "debugging", domain

        return "general_programming", domain
