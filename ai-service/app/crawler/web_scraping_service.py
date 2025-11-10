# ai-service/app/crawler/web_scraping_service.py
import asyncio
import time
from typing import List, Dict, Optional
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class WebScrapingService:
    """
    Main service that orchestrates the entire web scraping process
    """
    
    def __init__(self):
        self.spiders = []
        self.processor = None
        self.corpus_manager = None
        self.is_running = False
        
        # Initialize components
        self._initialize_components()
        
    def _initialize_components(self):
        """Initialize web scraping components with test mode"""
        try:
            # Try to import real components
            from stackoverflow_spider import StackOverflowSpider
            from content_processor import ContentProcessor
            from corpus_manager import CorpusManager
            
            # Initialize real components
            self.spiders = [StackOverflowSpider()]
            self.processor = ContentProcessor()
            self.corpus_manager = CorpusManager()
            
            logger.info("✅ All web scraping components initialized successfully")
            
        except ImportError as e:
            logger.error(f"❌ Failed to initialize web scraping components: {e}")
            logger.info("🔄 Using test data mode for web scraping")
            self._create_test_components()
    
    def _create_test_components(self):
        """Create test components when real ones are unavailable"""
        class TestSpider:
            def __init__(self): 
                self.name = "stackoverflow"
            def crawl(self, **kwargs): 
                # Return test data
                return [
                    {
                        'source': 'stackoverflow',
                        'title': 'Test: Python Debugging Issue',
                        'content': 'Test content for web scraping pipeline validation',
                        'full_question_url': 'https://stackoverflow.com/questions/test1',
                        'tags': ['python', 'debugging', 'test'],
                        'votes': 100,
                        'answers': 10,
                        'language': 'python',
                        'difficulty': 'medium'
                    },
                    {
                        'source': 'stackoverflow',
                        'title': 'Test: JavaScript Array Methods',
                        'content': 'Testing JavaScript array manipulation techniques',
                        'full_question_url': 'https://stackoverflow.com/questions/test2', 
                        'tags': ['javascript', 'arrays', 'methods'],
                        'votes': 75,
                        'answers': 8,
                        'language': 'javascript',
                        'difficulty': 'easy'
                    }
                ]
            def health_check(self): 
                return {"status": "healthy", "mode": "test"}
        
        class TestProcessor:
            def process_content(self, data): 
                # Add processing metadata
                import hashlib
                data['content_hash'] = hashlib.md5(data['title'].encode()).hexdigest()
                data['technical_features'] = {
                    'has_code_snippet': True,
                    'has_error_message': 'error' in data['title'].lower(),
                    'problem_type': 'debugging' if 'debug' in data['title'].lower() else 'implementation',
                    'estimated_complexity': 'medium'
                }
                return data
                
        class TestCorpusManager:
            def __init__(self):
                self.test_problems = []
                
            def save_scraped_problems(self, problems): 
                self.test_problems.extend(problems)
                logger.info(f"📦 Saved {len(problems)} test problems to corpus")
                return len(problems)
                
            def get_unprocessed_problems(self, **kwargs): 
                limit = kwargs.get('limit', 50)
                return self.test_problems[:limit]
                
            def get_corpus_stats(self): 
                return {
                    "total_problems": len(self.test_problems),
                    "unprocessed": len(self.test_problems),
                    "by_source": {"stackoverflow": len(self.test_problems)},
                    "by_language": {"python": 1, "javascript": 1},
                    "mode": "test"
                }
                
            def mark_as_processed(self, content_hash): 
                logger.info(f"✅ Marked problem {content_hash} as processed")
                
            def search_problems(self, query, language=None, source=None): 
                results = [p for p in self.test_problems if query.lower() in p['title'].lower()]
                if language:
                    results = [p for p in results if p.get('language') == language]
                return results
    
        self.spiders = [TestSpider()]
        self.processor = TestProcessor()
        self.corpus_manager = TestCorpusManager()
    
    async def run_scraping_job(self, sources: List[str] = None, max_pages: int = 3) -> Dict[str, any]:
        """
        Execute a complete scraping job
        """
        if self.is_running:
            return {"success": False, "error": "Scraping job already running"}
        
        self.is_running = True
        start_time = time.time()
        
        try:
            logger.info(f"🚀 Starting scraping job for sources: {sources}")
            
            all_problems = []
            spider_results = {}
            
            # Execute spiders
            for spider in self.spiders:
                if sources and spider.name not in sources:
                    logger.info(f"⏭️ Skipping {spider.name} - not in requested sources")
                    continue
                    
                try:
                    logger.info(f"🕷️ Running {spider.name} spider...")
                    problems = spider.crawl(max_pages=max_pages)
                    processed_problems = []
                    
                    # Process content
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
                    logger.info(f"✅ {spider.name}: {saved_count} problems saved")
                    
                except Exception as e:
                    logger.error(f"❌ Error in {spider.name}: {e}")
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
                "mode": "test"  # Indicate this is test data
            }
            
            logger.info(f"🎉 Scraping job completed in {execution_time}s")
            return result
            
        except Exception as e:
            logger.error(f"❌ Scraping job failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "execution_time_seconds": round(time.time() - start_time, 2)
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
            "mode": "test",  # Indicate test mode
            "last_updated": datetime.now().isoformat()
        }
    
    def get_scraped_problems(self, 
                           limit: int = 50, 
                           offset: int = 0,
                           language: str = None,
                           source: str = None,
                           status: str = None) -> Dict[str, any]:
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
                "mode": "test"
            }
        except Exception as e:
            logger.error(f"❌ Error getting scraped problems: {e}")
            return {
                "problems": [],
                "pagination": {"total": 0, "limit": limit, "offset": offset, "has_more": False},
                "error": str(e)
            }
    
    def get_detailed_stats(self) -> Dict[str, any]:
        """Get detailed statistics"""
        try:
            corpus_stats = self.corpus_manager.get_corpus_stats()
            return {
                **corpus_stats,
                "service_status": "operational",
                "components_loaded": True,
                "mode": "test"
            }
        except Exception as e:
            return {
                "error": f"Web scraping components not available: {str(e)}",
                "service_status": "degraded", 
                "components_loaded": False
            }
    
    def mark_problems_processed(self, content_hashes: List[str]):
        """Mark problems as processed"""
        try:
            for content_hash in content_hashes:
                self.corpus_manager.mark_as_processed(content_hash)
            logger.info(f"✅ Marked {len(content_hashes)} problems as processed")
        except Exception as e:
            logger.error(f"❌ Error marking problems as processed: {e}")
    
    def search_scraped_problems(self, query: str, language: str = None, source: str = None) -> List[Dict]:
        """Search in scraped problems"""
        try:
            return self.corpus_manager.search_problems(query, language, source)
        except Exception as e:
            logger.error(f"❌ Error searching problems: {e}")
            return []

# Singleton instance
web_scraping_service = WebScrapingService()

# Simple test when run directly
if __name__ == "__main__":
    print("🧪 Testing Web Scraping Service...")
    service = WebScrapingService()
    print("📊 Service Status:", service.get_scraping_status())
    print("✅ Web Scraping Service test completed!")