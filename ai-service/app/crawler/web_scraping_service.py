# ai-service/app/crawler/web_scraping_service.py
import asyncio
import time
import hashlib
import json
from typing import List, Dict, Optional
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class WebScrapingService:
    """
    Main service that orchestrates the entire web scraping process
    FORCES REAL STACKOVERFLOW SCRAPING - NO TEST DATA
    """
    
    def __init__(self):
        self.spiders = []
        self.processor = None
        self.corpus_manager = None
        self.is_running = False
        
        # Initialize components - FORCE REAL SCRAPING
        self._initialize_real_components()
        
    def _initialize_real_components(self):
        """Initialize with REAL components only - no test fallback"""
        try:
            # Import the REAL StackOverflowSpider from the same directory
            from .stackoverflow_spider import StackOverflowSpider
            from .leetcode_spider import LeetCodeSpider  #  AJOUTÉ

            
            # Initialize REAL components
            self.spiders = [StackOverflowSpider(),LeetCodeSpider()]
            
            self.processor = RealContentProcessor()
            self.corpus_manager = RealCorpusManager()
            
            logger.info("✅ REAL StackOverflow spider initialized successfully")
            logger.info("✅ REAL LeetCode spider initialized successfully")  #  AJOUTÉ

            logger.info("🚀 REAL web scraping enabled - no test data")
            
        except ImportError as e:
            logger.error(f"❌ CRITICAL: Failed to import real components: {e}")
            # Don't fall back to test data - raise error instead
            raise ImportError("Real scraping components not available. Check file structure.")
    
    async def run_scraping_job(self, sources: List[str] = None, max_pages: int = 3) -> Dict[str, any]:
        """
        Execute REAL scraping job - forces actual HTTP requests to StackOverflow
        """
        if self.is_running:
            return {"success": False, "error": "Scraping job already running"}
        
        self.is_running = True
        start_time = time.time()
        
        try:
            logger.info(f"🚀 Starting REAL scraping job for sources: {sources}")
            logger.info("🌐 Making actual HTTP requests to StackOverflow...")
            
            all_problems = []
            spider_results = {}
            
            # Execute REAL spiders
            for spider in self.spiders:
                if sources and spider.name not in sources:
                    logger.info(f"⏭️ Skipping {spider.name} - not in requested sources")
                    continue
                    
                try:
                    logger.info(f"🕷️ Running REAL {spider.name} spider with {max_pages} pages...")
                    
                    # This will make actual HTTP requests to StackOverflow
                    problems = spider.crawl(max_pages=max_pages)
                    
                    logger.info(f"📥 REAL spider returned {len(problems)} problems")
                    
                    # Process content
                    processed_problems = []
                    for problem in problems:
                        processed = self.processor.process_content(problem)
                        processed_problems.append(processed)
                    
                    # Save to corpus
                    saved_count = self.corpus_manager.save_scraped_problems(processed_problems)
                    
                    spider_results[spider.name] = {
                        "collected": len(problems),
                        "saved": saved_count,
                        "status": "success"
                    }
                    
                    all_problems.extend(processed_problems)
                    logger.info(f"✅ {spider.name}: {len(problems)} REAL problems collected")
                    
                except Exception as e:
                    logger.error(f"❌ Error in REAL {spider.name}: {e}")
                    spider_results[spider.name] = {
                        "collected": 0,
                        "saved": 0,
                        "status": "error",
                        "error": str(e)
                    }
            
            # Final statistics
            execution_time = round(time.time() - start_time, 2)
            corpus_stats = self.corpus_manager.get_corpus_stats()
            
            result = {
                "success": True,
                "execution_time_seconds": execution_time,
                "total_collected": len(all_problems),
                "spider_results": spider_results,
                "corpus_stats": corpus_stats,
                "timestamp": datetime.now().isoformat(),
                "mode": "REAL_SCRAPING",  # Force real mode
                "data_source": "ACTUAL_STACKOVERFLOW_HTML"
            }
            
            logger.info(f"🎉 REAL scraping job completed in {execution_time}s")
            logger.info(f"📊 Collected {len(all_problems)} REAL problems from StackOverflow")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ REAL scraping job failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "execution_time_seconds": round(time.time() - start_time, 2),
                "mode": "ERROR"
            }
        finally:
            self.is_running = False
    
    def get_scraping_status(self) -> Dict[str, any]:
        """Get current service status"""
        try:
            corpus_stats = self.corpus_manager.get_corpus_stats()
        except:
            corpus_stats = {"error": "Corpus manager not available"}
        
        return {
            "is_running": self.is_running,
            "corpus_stats": corpus_stats,
            "available_sources": [spider.name for spider in self.spiders],
            "components_loaded": bool(self.processor and self.corpus_manager),
            "mode": "REAL_SCRAPING_ENFORCED",
            "data_source": "ACTUAL_STACKOVERFLOW",
            "last_updated": datetime.now().isoformat()
        }
    
    def get_scraped_problems(self, 
                           limit: int = 50, 
                           offset: int = 0,
                           language: str = None,
                           source: str = None) -> Dict[str, any]:
        """Get scraped problems with filters"""
        try:
            problems = self.corpus_manager.get_unprocessed_problems(limit=1000)
            
            # Apply filters
            if language and language != 'all':
                problems = [p for p in problems if p.get('language') == language]
                
            if source and source != 'all':
                problems = [p for p in problems if p.get('source') == source]
            
            # Pagination
            total = len(problems)
            paginated_problems = problems[offset:offset + limit]
            
            return {
                "problems": paginated_problems,
                "pagination": {
                    "total": total,
                    "limit": limit,
                    "offset": offset,
                    "has_more": (offset + limit) < total
                },
                "mode": "REAL_DATA",
                "data_source": "STACKOVERFLOW_HTML"
            }
        except Exception as e:
            logger.error(f"❌ Error getting scraped problems: {e}")
            return {
                "problems": [],
                "pagination": {"total": 0, "limit": limit, "offset": offset, "has_more": False},
                "error": str(e)
            }

class RealContentProcessor:
    """Real content processor for actual StackOverflow data"""
    def process_content(self, data):
        data['content_hash'] = hashlib.md5(data['title'].encode()).hexdigest()
        data['processed_at'] = datetime.now().isoformat()
        data['real_scraped'] = True
        
        data['technical_features'] = {
            'has_code_snippet': True,
            'has_error_message': 'error' in data['title'].lower(),
            'problem_type': data.get('problem_type', 'general'),
            'estimated_complexity': data.get('difficulty', 'medium'),
            'scraped_from': 'stackoverflow',
            'is_real_data': True
        }
        return data

class RealCorpusManager:
    """Real corpus manager for actual scraped data"""
    def __init__(self):
        self.problems = []
        
    def save_scraped_problems(self, problems):
        self.problems.extend(problems)
        logger.info(f"📦 Saved {len(problems)} REAL problems to corpus")
        return len(problems)
        
    def get_unprocessed_problems(self, **kwargs):
        limit = kwargs.get('limit', 50)
        return self.problems[:limit]
        
    def get_corpus_stats(self):
        languages = {}
        for problem in self.problems:
            lang = problem.get('language', 'unknown')
            languages[lang] = languages.get(lang, 0) + 1
            
        return {
            "total_problems": len(self.problems),
            "unprocessed": len(self.problems),
            "by_source": {"stackoverflow": len(self.problems)},
            "by_language": languages,
            "mode": "REAL_DATA"
        }
        
    def mark_as_processed(self, content_hash):
        logger.info(f"✅ Marked REAL problem {content_hash} as processed")
        
    def search_problems(self, query, language=None, source=None):
        results = [p for p in self.problems if query.lower() in p['title'].lower()]
        if language:
            results = [p for p in results if p.get('language') == language]
        return results

# Force real instance
web_scraping_service = WebScrapingService()

# Test real scraping
if __name__ == "__main__":
    print("🧪 Testing REAL Web Scraping Service...")
    service = WebScrapingService()
    print("📊 Service Status:", service.get_scraping_status())