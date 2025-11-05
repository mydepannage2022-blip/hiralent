# ai-service/app/crawler/base_spider.py
import abc
import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
import time
import logging
from urllib.robotparser import RobotFileParser

# Configuration du logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class BaseSpider(abc.ABC):
    """
    Classe de base pour tous les spiders de web scraping.
    Gère le respect de robots.txt, rate limiting, et structure commune.
    """
    
    def __init__(self, name: str, base_url: str):
        self.name = name
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        self.robots_parser = RobotFileParser()
        self.robots_parser.set_url(f"{base_url}/robots.txt")
        try:
            self.robots_parser.read()
            logger.info(f"✅ Robots.txt loaded for {base_url}")
        except Exception as e:
            logger.warning(f"⚠️ Could not read robots.txt for {base_url}: {e}")
    
    def can_fetch(self, url: str) -> bool:
        """Vérifie si le scraping est autorisé par robots.txt"""
        try:
            return self.robots_parser.can_fetch('*', url)
        except Exception as e:
            logger.warning(f"⚠️ Robots check failed for {url}: {e}")
            return True  # Continue si robots.txt inaccessible
    
    @abc.abstractmethod
    def extract_problems(self, html: str) -> List[Dict]:
        """
        Extrait les problèmes du HTML - À IMPLÉMENTER par chaque spider
        Retourne: Liste de dictionnaires avec les problèmes
        """
        pass
    
    @abc.abstractmethod
    def get_next_page(self, soup: BeautifulSoup) -> Optional[str]:
        """
        Trouve la page suivante - À IMPLÉMENTER par chaque spider
        Retourne: URL de la page suivante ou None
        """
        pass
    
    def crawl(self, max_pages: int = 3) -> List[Dict]:
        """
        Exécute le crawling avec pagination et respect des limites
        """
        problems = []
        
        # Vérifier si start_urls existe
        if not hasattr(self, 'start_urls') or not self.start_urls:
            logger.error(f"❌ No start_urls defined for {self.name}")
            return problems
            
        current_url = self.start_urls[0]
        pages_crawled = 0
        
        logger.info(f"🚀 Starting {self.name} spider with max {max_pages} pages")
        
        while current_url and pages_crawled < max_pages:
            if not self.can_fetch(current_url):
                logger.warning(f"⛔ Skipping {current_url} - disallowed by robots.txt")
                break
            
            try:
                logger.info(f"📥 Crawling page {pages_crawled + 1}: {current_url}")
                response = self.session.get(current_url, timeout=15)
                response.raise_for_status()
                
                # Extraire les problèmes de cette page
                soup = BeautifulSoup(response.text, 'html.parser')
                page_problems = self.extract_problems(response.text)
                problems.extend(page_problems)
                
                logger.info(f"✅ Extracted {len(page_problems)} problems from {current_url}")
                
                # Passer à la page suivante
                current_url = self.get_next_page(soup)
                pages_crawled += 1
                
                # Respecter le rate limiting
                time.sleep(2)  # 2 secondes entre les requêtes
                
            except requests.RequestException as e:
                logger.error(f"❌ Network error crawling {current_url}: {e}")
                break
            except Exception as e:
                logger.error(f"❌ Error processing {current_url}: {e}")
                break
        
        logger.info(f"🎉 {self.name} spider finished: {len(problems)} problems collected")
        return problems
    
    def health_check(self) -> Dict[str, any]:
        """Vérifie que le spider peut accéder à sa source"""
        try:
            if not hasattr(self, 'start_urls') or not self.start_urls:
                return {"status": "error", "error": "No start_urls defined"}
                
            test_url = self.start_urls[0]
            response = self.session.get(test_url, timeout=10)
            return {
                "status": "healthy" if response.status_code == 200 else "unhealthy",
                "status_code": response.status_code,
                "base_url": self.base_url
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "base_url": self.base_url
            }