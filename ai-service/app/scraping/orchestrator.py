# app/scraping/orchestrator.py

"""
Scraping Orchestrator - Single Entry Point for ALL Scraping Operations
Called by both API routes AND Node-Cron scheduler
"""

import time
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

# Import spiders
from app.crawler.leetcode_pattern_spider import LeetCodePatternSpider
from app.crawler.stackoverflow_spider import StackOverflowAPISpider
from app.crawler.github_spider import GitHubSpider
from app.crawler.hackerrank_spider import HackerRankSpider

# Import pattern extractor
from app.pattern_extraction.extractor import UnifiedPatternExtractor

logger = logging.getLogger(__name__)


class ScrapingOrchestrator:
    """
    Single entry point for ALL scraping operations.

    Features:
    - Unified interface for all sources
    - Centralized pattern extraction
    - Consistent error handling
    - Scheduler-ready (called by Node-Cron)
    - Manual testing friendly (called by routes)
    """

    def __init__(self):
        """Initialize orchestrator with all spiders and pattern extractor"""
        logger.info("🔧 Initializing Scraping Orchestrator...")

        self.spiders = {
            "leetcode": LeetCodePatternSpider(),
            "github": GitHubSpider(),
            "stackoverflow": StackOverflowAPISpider(tags=None),  # ALL topics
            "hackerrank": HackerRankSpider(),
        }

        self.pattern_extractor = UnifiedPatternExtractor()
        logger.info(f"✅ Orchestrator initialized with {len(self.spiders)} spiders")

    # =========================================================================
    # MAIN SCRAPING METHOD
    # =========================================================================

    async def run_scraping(
        self,
        source: str,
        max_items: int = 50,
        auto: bool = True,
        hard_cap: int = 5000,
        stop_after_empty_pages: int = 3,
        **kwargs,
    ) -> Dict[str, Any]:
        """
        Universal scraping entry point for ALL sources.

        auto=True:
            keeps calling the spider in chunks until it stops returning new items
            (or until hard_cap/stop_after_empty_pages triggers).
        """
        start_time = time.time()

        try:
            logger.info(f"🚀 Starting scraping job: {source} (max_items={max_items}, auto={auto})")

            # 1. Validate source
            if source not in self.spiders:
                error_msg = f"Unknown source: {source}. Available: {list(self.spiders.keys())}"
                logger.error(f"❌ {error_msg}")
                return {
                    "success": False,
                    "source": source,
                    "error": error_msg,
                    "patterns": [],
                    "count": 0,
                    "duration_ms": 0,
                }

            spider = self.spiders[source]
            logger.info("🧩 Using spider: %s.%s", spider.__class__.__module__, spider.__class__.__name__)
            logger.info("🧩 crawl signature vars: %s", spider.crawl.__code__.co_varnames)


            # 2. Scrape raw data (auto loop or single run)
            logger.info(f"🕷️ Scraping {source}...")

            if auto:
                raw_data = self._execute_spider_auto(
                    spider=spider,
                    source=source,
                    chunk_size=max_items,
                    hard_cap=hard_cap,
                    stop_after_empty_pages=stop_after_empty_pages,
                    **kwargs,
                )
            else:
                raw_data = self._execute_spider(spider, source, max_items, **kwargs)

            if not raw_data:
                logger.warning(f"⚠️ No raw data returned from {source}")
                return {
                    "success": False,
                    "source": source,
                    "error": "No data returned from spider",
                    "patterns": [],
                    "count": 0,
                    "duration_ms": int((time.time() - start_time) * 1000),
                }

            logger.info(f"📥 Scraped {len(raw_data)} raw items from {source}")

            # 3. Extract patterns
            patterns, errors = self._extract_patterns(raw_data, source)

            duration_ms = int((time.time() - start_time) * 1000)

            result = {
                "success": True,
                "source": source,
                "patterns": patterns,
                "count": len(patterns),
                "duration_ms": duration_ms,
                "errors": errors,
                "metadata": {
                    "scraped_at": datetime.now().isoformat(),
                    "raw_items": len(raw_data),
                    "extracted_patterns": len(patterns),
                    "failed_extractions": len(errors),
                    "success_rate": round(len(patterns) / len(raw_data) * 100, 2) if raw_data else 0,
                    "auto": auto,
                    "hard_cap": hard_cap,
                    "stop_after_empty_pages": stop_after_empty_pages,
                },
            }

            logger.info(f"✅ Scraping completed: {len(patterns)} patterns extracted in {duration_ms}ms")
            return result

        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            error_msg = f"Scraping failed for {source}: {str(e)}"
            logger.error(f"❌ {error_msg}")

            return {
                "success": False,
                "source": source,
                "error": error_msg,
                "patterns": [],
                "count": 0,
                "duration_ms": duration_ms,
                "errors": [str(e)],
            }

    # =========================================================================
    # AUTO MODE (keeps scraping until empty)
    # =========================================================================

    def _execute_spider_auto(
        self,
        spider,
        source: str,
        chunk_size: int,
        hard_cap: int,
        stop_after_empty_pages: int,
        **kwargs,
    ) -> List[Dict]:
        """
        Execute spider in a loop until it stops returning NEW items.

        Works best when spider pagination really progresses (leetcode skip / hackerrank offset).
        """
        all_items: List[Dict] = []
        seen_ids: set[str] = set()

        empty_rounds = 0
        round_idx = 0
        cursor_page = 1


        while len(all_items) < hard_cap:
            round_idx += 1
            logger.info(
                "🔁 Auto round %s (source=%s) chunk_size=%s total=%s",
                round_idx,
                source,
                chunk_size,
                len(all_items),
            )
            call_kwargs = dict(kwargs)
            if source == "stackoverflow":
                call_kwargs["start_page"] = cursor_page


            batch = self._execute_spider(spider, source, chunk_size, **call_kwargs) or []

            if not batch:
                empty_rounds += 1
                logger.info("⛔ Empty batch (empty_rounds=%s/%s)", empty_rounds, stop_after_empty_pages)
                if empty_rounds >= stop_after_empty_pages:
                    break
                continue

            # dedupe by source_id if present, else by title/url fallback
            new_items = []
            for it in batch:
                sid = it.get("source_id") or it.get("titleSlug") or it.get("slug") or it.get("source_url") or str(it)
                if sid in seen_ids:
                    continue
                seen_ids.add(sid)
                new_items.append(it)

            if not new_items:
                empty_rounds += 1
                logger.info("⛔ No NEW items in batch (empty_rounds=%s/%s)", empty_rounds, stop_after_empty_pages)
                if empty_rounds >= stop_after_empty_pages:
                    break
            else:
                empty_rounds = 0
                all_items.extend(new_items)
                if source == "stackoverflow":
                    # each round fetches max_pages pages starting at cursor_page
                    # so we jump forward by that many pages
                    cursor_page += int(call_kwargs.get("max_pages", 2))

                logger.info("✅ +%s new items (total=%s)", len(new_items), len(all_items))

            # safety
            if len(all_items) >= hard_cap:
                logger.info("🛑 Reached hard_cap=%s, stopping", hard_cap)
                break

        return all_items[:hard_cap]

    # =========================================================================
    # SPIDER EXECUTION
    # =========================================================================

    def _execute_spider(self, spider, source: str, max_items: int, **kwargs) -> List[Dict]:
        """
        Execute spider and return raw data.
        Handles source-specific parameters.
        """
        try:
            if source == "leetcode":
                return spider.crawl(max_problems=max_items)

            elif source == "github":
                return spider.crawl(
                    max_repos=kwargs.get("max_pages", 5),          # reuse max_pages as max_repos (backward compatible)
                    per_repo_max_files=kwargs.get("per_repo_max_files", 60),
                    max_depth=kwargs.get("max_depth", 2),
                    use_search=kwargs.get("use_search", True),
                    search_pages=kwargs.get("search_pages", 2),
                    sleep_s=kwargs.get("sleep_s", 1.2),
                )

            elif source == "stackoverflow":
                max_pages = kwargs.get("max_pages", 2)
                start_page = kwargs.get("start_page", 1)

                # pagesize should match requested chunk size (max_items)
                pagesize = min(100, int(max_items))

                return spider.crawl(
                    max_pages=max_pages,
                    start_page=start_page,
                    pagesize=pagesize,
                )



            elif source == "hackerrank":
                max_pages = kwargs.get("max_pages", 3)
                return spider.crawl(max_pages=max_pages)

            else:
                return spider.crawl(max_problems=max_items)

        except Exception as e:
            logger.error(f"❌ Spider execution failed for {source}: {e}")
            return []

    # =========================================================================
    # PATTERN EXTRACTION
    # =========================================================================

    def _extract_patterns(self, raw_data: List[Dict], source: str) -> tuple[List[Dict], List[str]]:
        patterns = []
        errors = []

        for i, item in enumerate(raw_data):
            try:
                pattern = self.pattern_extractor.extract_pattern(item, source)

                if self.pattern_extractor.validate_pattern(pattern):
                    patterns.append(pattern)
                    logger.debug(f"✅ [{i+1}/{len(raw_data)}] Extracted: {pattern.get('source_id')}")
                else:
                    error_msg = f"Invalid pattern structure for item {i+1}"
                    logger.warning(f"⚠️ {error_msg}")
                    errors.append(error_msg)

            except Exception as e:
                error_msg = f"Pattern extraction failed for item {i+1}: {str(e)}"
                logger.error(f"❌ {error_msg}")
                errors.append(error_msg)

        logger.info(f"📊 Pattern extraction: {len(patterns)} success, {len(errors)} errors")
        return patterns, errors

    # =========================================================================
    # BATCH SCRAPING
    # =========================================================================

    async def run_batch_scraping(self, sources: List[str], max_items: int = 50, **kwargs) -> Dict[str, Any]:
        start_time = time.time()

        logger.info(f"🚀 Starting batch scraping for {len(sources)} sources")

        results = []
        total_patterns = 0

        for source in sources:
            logger.info(f"📋 Processing source: {source}")
            result = await self.run_scraping(source, max_items, **kwargs)
            results.append(result)

            if result["success"]:
                total_patterns += result["count"]

        total_duration_ms = int((time.time() - start_time) * 1000)

        successful_sources = sum(1 for r in results if r["success"])
        failed_sources = len(sources) - successful_sources

        summary = {
            "success": True,
            "results": results,
            "total_patterns": total_patterns,
            "total_duration_ms": total_duration_ms,
            "summary": {
                "total_sources": len(sources),
                "successful_sources": successful_sources,
                "failed_sources": failed_sources,
                "total_patterns": total_patterns,
                "avg_patterns_per_source": round(total_patterns / len(sources), 2) if sources else 0,
            },
        }

        logger.info(f"✅ Batch scraping completed: {total_patterns} total patterns in {total_duration_ms}ms")
        return summary

    # =========================================================================
    # HEALTH CHECK
    # =========================================================================

    def health_check(self) -> Dict[str, Any]:
        logger.info("🏥 Running health check...")

        spider_statuses = {}
        healthy_count = 0

        for source, spider in self.spiders.items():
            try:
                status = spider.health_check()
                spider_statuses[source] = status
                if status.get("status") == "healthy":
                    healthy_count += 1
            except Exception as e:
                spider_statuses[source] = {"status": "error", "error": str(e)}

        if healthy_count == len(self.spiders):
            overall_status = "healthy"
        elif healthy_count > 0:
            overall_status = "degraded"
        else:
            overall_status = "unhealthy"

        return {
            "status": overall_status,
            "spiders": spider_statuses,
            "healthy_count": healthy_count,
            "total_count": len(self.spiders),
        }

    # =========================================================================
    # SCHEDULER INTERFACE
    # =========================================================================

    async def execute_scheduled_job(self, source: str, max_items: int, **kwargs) -> Dict[str, Any]:
        """
        Entry point for Node-Cron scheduler.
        Now supports passing kwargs (e.g. max_pages, auto, hard_cap...)
        """
        result = await self.run_scraping(source, max_items, **kwargs)

        return {
            "job_name": f"{source}_scrape",
            "source": source,
            "status": "completed" if result["success"] else "failed",
            "patterns_scraped": result.get("count", 0),
            "questions_generated": 0,
            "questions_vetted": 0,
            "questions_saved": 0,
            "duration_ms": result.get("duration_ms", 0),
            "error": result.get("error"),
            "executed_at": datetime.now().isoformat(),
            "metadata": result.get("metadata", {}),
        }


_orchestrator_instance = None


def get_orchestrator() -> ScrapingOrchestrator:
    global _orchestrator_instance
    if _orchestrator_instance is None:
        _orchestrator_instance = ScrapingOrchestrator()
    return _orchestrator_instance
