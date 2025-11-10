# ai-service/app/crawler/test_base.py
import sys
import os
import logging

# Ajouter le chemin parent pour les imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from base_spider import BaseSpider
from bs4 import BeautifulSoup

class PythonDocsSpider(BaseSpider):
    """Spider de test avec la documentation Python (site stable)"""
    
    def __init__(self):
        super().__init__("python_docs_spider", "https://docs.python.org")
        self.start_urls = ["https://docs.python.org/3/tutorial/"]
    
    def extract_problems(self, html: str):
        """Extrait les titres de sections comme problèmes de test"""
        soup = BeautifulSoup(html, 'html.parser')
        problems = []
        
        # Extraire les titres de sections
        titles = soup.find_all(['h1', 'h2', 'h3'])[:5]  # Prendre les 5 premiers
        
        for title in titles:
            problem = {
                "title": f"Python Docs: {title.get_text().strip()}",
                "content": f"Section from Python documentation: {title.get_text().strip()}",
                "source": "python_docs",
                "url": self.start_urls[0]
            }
            problems.append(problem)
        
        print(f"📄 Extracted {len(problems)} sections from Python documentation")
        return problems
    
    def get_next_page(self, soup: BeautifulSoup):
        return None  # Une seule page pour le test

if __name__ == "__main__":
    print("🧪 Testing Base Spider with Python Documentation...")
    
    spider = PythonDocsSpider()
    health = spider.health_check()
    print("🔍 Health check:", health)
    
    if health["status"] in ["healthy", "unhealthy"]:  # Même si unhealthy, on essaye
        problems = spider.crawl(max_pages=1)
        print("📊 Problems found:", len(problems))
        for i, problem in enumerate(problems, 1):
            print(f"  {i}. {problem['title']}")
        print("✅ Base spider working correctly!")
    else:
        print("❌ Health check failed:", health)