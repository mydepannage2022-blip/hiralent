# ai-service/app/crawler/test_full_pipeline.py
import sys
import os
import logging

# Configuration du logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Ajouter le chemin parent
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from stackoverflow_spider import StackOverflowSpider
from content_processor import ContentProcessor
from corpus_manager import CorpusManager

def test_full_pipeline():
    """Test le pipeline complet: Scraping → Processing → Storage"""
    print("🚀 Testing Full Web Scraping Pipeline...")
    
    # 1. Initialiser les composants
    spider = StackOverflowSpider()
    processor = ContentProcessor()
    corpus_manager = CorpusManager()
    
    print("🔍 Step 1: Health check...")
    health = spider.health_check()
    print("   Health:", health)
    
    if health["status"] != "healthy":
        print("❌ Spider health check failed")
        return
    
    print("🕷️ Step 2: Scraping StackOverflow...")
    raw_problems = spider.crawl(max_pages=1)
    print(f"   Raw problems scraped: {len(raw_problems)}")
    
    if not raw_problems:
        print("❌ No problems scraped - might be HTML structure issues")
        return
    
    print("🧹 Step 3: Processing content...")
    processed_problems = []
    for raw_problem in raw_problems:
        processed = processor.process_content(raw_problem)
        processed_problems.append(processed)
    print(f"   Problems processed: {len(processed_problems)}")
    
    print("💾 Step 4: Saving to corpus...")
    saved_count = corpus_manager.save_scraped_problems(processed_problems)
    print(f"   Problems saved to corpus: {saved_count}")
    
    print("📊 Step 5: Checking corpus stats...")
    stats = corpus_manager.get_corpus_stats()
    print("   Final corpus stats:")
    for key, value in stats.items():
        print(f"     {key}: {value}")
    
    print("✅ Full pipeline test completed successfully!")
    
    # Afficher un échantillon
    if processed_problems:
        print("\n📋 Sample processed problem:")
        sample = processed_problems[0]
        print(f"   Title: {sample['title']}")
        print(f"   Language: {sample['language']}")
        print(f"   Source: {sample['source']}")
        print(f"   Content Hash: {sample['content_hash']}")
        print(f"   Technical Features: {sample['technical_features']}")

if __name__ == "__main__":
    test_full_pipeline()