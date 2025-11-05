# ai-service/app/crawler/stackoverflow_spider.py
import re
import logging
import sys
import os
from typing import List, Dict, Optional
from bs4 import BeautifulSoup

# Ajouter le chemin parent pour les imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import direct depuis le même dossier
try:
    from .base_spider import BaseSpider
except ImportError:
    # Fallback: essayer un import absolu
    import importlib.util
    spec = importlib.util.spec_from_file_location("base_spider", "base_spider.py")
    base_spider = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(base_spider)
    BaseSpider = base_spider.BaseSpider

logger = logging.getLogger(__name__)

class StackOverflowSpider(BaseSpider):
    """
    Spider pour extraire des problèmes de programmation de Stack Overflow.
    Se concentre sur les questions avec beaucoup de votes (meilleure qualité).
    """
    
    def __init__(self):
        super().__init__("stackoverflow", "https://stackoverflow.com")
        self.start_urls = [
            "https://stackoverflow.com/questions/tagged/python?sort=votes&pagesize=50",
            "https://stackoverflow.com/questions/tagged/javascript?sort=votes&pagesize=50", 
        ]
    
    def extract_problems(self, html: str) -> List[Dict]:
        """
        Extrait les problèmes de programmation de la page HTML de Stack Overflow
        """
        soup = BeautifulSoup(html, 'html.parser')
        problems = []
        
        # Méthode plus simple pour trouver les questions
        question_links = soup.find_all('a', class_='s-link')
        
        logger.info(f"🔍 Found {len(question_links)} question links on page")
        
        for link in question_links[:10]:  # Limiter aux 10 premiers pour le test
            try:
                href = link.get('href', '')
                title = link.get_text().strip()
                
                # Vérifier que c'est bien un lien de question
                if href and '/questions/' in href and title:
                    problem_data = {
                        'source': 'stackoverflow',
                        'title': title,
                        'content': f"Question from Stack Overflow: {title}",
                        'full_question_url': self.base_url + href,
                        'tags': ['stackoverflow', 'programming'],
                        'votes': 1,  # Valeur par défaut
                        'answers': 0,
                        'language': 'python',  # À détecter plus tard
                        'difficulty': 'medium',
                        'problem_type': 'general'
                    }
                    
                    problems.append(problem_data)
                    logger.debug(f"📝 Extracted: {title[:50]}...")
                
            except Exception as e:
                logger.warning(f"⚠️ Error extracting question: {e}")
                continue
        
        logger.info(f"✅ Successfully extracted {len(problems)} problems from StackOverflow")
        return problems
    
    def _detect_language(self, tags: List[str]) -> str:
        """Détecte le langage de programmation basé sur les tags"""
        language_map = {
            'python': 'python',
            'javascript': 'javascript', 
            'js': 'javascript',
            'java': 'java',
            'c#': 'csharp',
            'csharp': 'csharp',
            'sql': 'sql'
        }
        
        for tag in tags:
            tag_lower = tag.lower()
            if tag_lower in language_map:
                return language_map[tag_lower]
        
        return 'unknown'
    
    def _estimate_difficulty(self, votes: int, answers: int) -> str:
        """Estime la difficulté basée sur les votes et réponses"""
        return 'medium'  # Simplifié pour le test
    
    def _classify_problem_type(self, title: str, content: str, tags: List[str]) -> str:
        """Classifie le type de problème"""
        return 'general'  # Simplifié pour le test
    
    def get_next_page(self, soup: BeautifulSoup) -> Optional[str]:
        """Trouve le lien vers la page suivante"""
        return None  # Une seule page pour le test

# Test simple du spider
if __name__ == "__main__":
    print("🧪 Testing StackOverflow Spider (SIMPLIFIED)...")
    
    spider = StackOverflowSpider()
    health = spider.health_check()
    print("🔍 Health check:", health)
    
    if health["status"] == "healthy":
        # Tester avec seulement 1 page pour commencer
        problems = spider.crawl(max_pages=1)
        print(f"📊 Found {len(problems)} problems from StackOverflow")
        
        if problems:
            for i, problem in enumerate(problems[:3], 1):  # Montrer les 3 premiers
                print(f"\n--- Problem {i} ---")
                print(f"Title: {problem['title']}")
                print(f"URL: {problem['full_question_url']}")
                print(f"Language: {problem['language']}")
        else:
            print("❌ No problems extracted.")
            print("💡 This might be normal - Stack Overflow's HTML structure might have changed")
            print("   We'll implement more robust parsing in the next step")
        
        print(f"\n✅ StackOverflow spider test completed!")
    else:
        print("❌ Health check failed:", health.get("error", "Unknown error"))