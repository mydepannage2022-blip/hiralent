"""
app/scraping/orchestrator.py

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
    
    Usage:
        orchestrator = ScrapingOrchestrator()
        result = await orchestrator.run_scraping("leetcode", max_items=50)
    """
    
    def __init__(self):
        """Initialize orchestrator with all spiders and pattern extractor"""
        logger.info("🔧 Initializing Scraping Orchestrator...")
        
        # Initialize spiders
        self.spiders = {
            "leetcode": LeetCodePatternSpider(),
            "github": GitHubSpider(),
            "stackoverflow": StackOverflowAPISpider(tags=None),  # ALL topics
            "hackerrank": HackerRankSpider()
        }
        
        # Initialize unified pattern extractor
        self.pattern_extractor = UnifiedPatternExtractor()
        
        logger.info(f"✅ Orchestrator initialized with {len(self.spiders)} spiders")
    
    # =========================================================================
    # MAIN SCRAPING METHOD
    # =========================================================================
    
    async def run_scraping(
        self,
        source: str,
        max_items: int = 50,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Universal scraping entry point for ALL sources.
        
        Args:
            source: 'leetcode' | 'github' | 'stackoverflow' | 'hackerrank'
            max_items: Maximum patterns to extract
            **kwargs: Additional source-specific parameters
        
        Returns:
            {
                "success": bool,
                "source": str,
                "patterns": List[Dict],
                "count": int,
                "duration_ms": int,
                "errors": List[str],
                "metadata": Dict
            }
        """
        start_time = time.time()
        
        try:
            logger.info(f"🚀 Starting scraping job: {source} (max_items={max_items})")
            
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
                    "duration_ms": 0
                }
            
            # 2. Get spider
            spider = self.spiders[source]
            
            # 3. Scrape raw data
            logger.info(f"🕷️ Scraping {source}...")
            raw_data = self._execute_spider(spider, source, max_items, **kwargs)
            
            if not raw_data:
                logger.warning(f"⚠️ No raw data returned from {source}")
                return {
                    "success": False,
                    "source": source,
                    "error": "No data returned from spider",
                    "patterns": [],
                    "count": 0,
                    "duration_ms": int((time.time() - start_time) * 1000)
                }
            
            logger.info(f"📥 Scraped {len(raw_data)} raw items from {source}")
            
            # 4. Extract patterns using UNIFIED extractor
            patterns, errors = self._extract_patterns(raw_data, source)
            
            # 5. Calculate duration
            duration_ms = int((time.time() - start_time) * 1000)
            
            # 6. Build result
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
                    "success_rate": round(len(patterns) / len(raw_data) * 100, 2) if raw_data else 0
                }
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
                "errors": [str(e)]
            }
    
    # =========================================================================
    # SPIDER EXECUTION
    # =========================================================================
    
    def _execute_spider(
        self,
        spider,
        source: str,
        max_items: int,
        **kwargs
    ) -> List[Dict]:
        """
        Execute spider and return raw data.
        Handles source-specific parameters.
        """
        try:
            if source == "leetcode":
                return spider.crawl(max_problems=max_items)
            
            elif source == "github":
                max_pages = kwargs.get("max_pages", 3)
                return spider.crawl(max_pages=max_pages)
            
            elif source == "stackoverflow":
                max_pages = kwargs.get("max_pages", 2)
                return spider.crawl(max_pages=max_pages)
            
            elif source == "hackerrank":
                max_pages = kwargs.get("max_pages", 3)
                return spider.crawl(max_pages=max_pages)
            
            else:
                # Fallback: try generic crawl
                return spider.crawl(max_problems=max_items)
                
        except Exception as e:
            logger.error(f"❌ Spider execution failed for {source}: {e}")
            return []
    
    # =========================================================================
    # PATTERN EXTRACTION
    # =========================================================================
    
    def _extract_patterns(
        self,
        raw_data: List[Dict],
        source: str
    ) -> tuple[List[Dict], List[str]]:
        """
        Extract patterns from raw scraped data using unified extractor.
        
        Returns:
            (patterns, errors): Tuple of successful patterns and error messages
        """
        patterns = []
        errors = []
        
        for i, item in enumerate(raw_data):
            try:
                # Extract pattern using UNIFIED extractor
                pattern = self.pattern_extractor.extract_pattern(item, source)
                
                # Validate pattern
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
    
    async def run_batch_scraping(
        self,
        sources: List[str],
        max_items: int = 50,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Run scraping for multiple sources in sequence.
        
        Args:
            sources: List of source names
            max_items: Maximum patterns per source
            **kwargs: Additional source-specific parameters
        
        Returns:
            {
                "success": bool,
                "results": List[Dict],
                "total_patterns": int,
                "total_duration_ms": int,
                "summary": Dict
            }
        """
        start_time = time.time()
        
        logger.info(f"🚀 Starting batch scraping for {len(sources)} sources")
        
        results = []
        total_patterns = 0
        
        for source in sources:
            logger.info(f"📋 Processing source: {source}")
            
            # Run scraping for this source
            result = await self.run_scraping(source, max_items, **kwargs)
            results.append(result)
            
            if result["success"]:
                total_patterns += result["count"]
        
        total_duration_ms = int((time.time() - start_time) * 1000)
        
        # Calculate summary
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
                "avg_patterns_per_source": round(total_patterns / len(sources), 2) if sources else 0
            }
        }
        
        logger.info(f"✅ Batch scraping completed: {total_patterns} total patterns in {total_duration_ms}ms")
        
        return summary
    
    # =========================================================================
    # HEALTH CHECK
    # =========================================================================
    
    def health_check(self) -> Dict[str, Any]:
        """
        Check health of all spiders.
        
        Returns:
            {
                "status": "healthy" | "degraded" | "unhealthy",
                "spiders": Dict[str, Dict]
            }
        """
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
                spider_statuses[source] = {
                    "status": "error",
                    "error": str(e)
                }
        
        # Overall status
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
            "total_count": len(self.spiders)
        }
    
    # =========================================================================
    # SCHEDULER INTERFACE
    # =========================================================================
    
    async def execute_scheduled_job(
        self,
        source: str,
        max_items: int
    ) -> Dict[str, Any]:
        """
        Entry point for Node-Cron scheduler.
        Returns standardized job result for logging.
        
        This method is called by the /scrape endpoint which
        the Node.js scheduler hits via HTTP.
        """
        result = await self.run_scraping(source, max_items)
        
        # Transform to job log format (matches Prisma ScrapingJobLog model)
        return {
            "job_name": f"{source}_scrape",
            "source": source,
            "status": "completed" if result["success"] else "failed",
            "patterns_scraped": result.get("count", 0),
            "questions_generated": 0,  # Will be filled by question generation pipeline
            "questions_vetted": 0,      # Will be filled by vetting pipeline
            "questions_saved": 0,       # Will be filled by save pipeline
            "duration_ms": result.get("duration_ms", 0),
            "error": result.get("error"),
            "executed_at": datetime.now().isoformat(),
            "metadata": result.get("metadata", {})
        }


# =========================================================================
# GLOBAL INSTANCE (Singleton)
# =========================================================================

_orchestrator_instance = None

def get_orchestrator() -> ScrapingOrchestrator:
    """
    Get or create global orchestrator instance (Singleton pattern).
    """
    global _orchestrator_instance
    
    if _orchestrator_instance is None:
        _orchestrator_instance = ScrapingOrchestrator()
    
    return _orchestrator_instance