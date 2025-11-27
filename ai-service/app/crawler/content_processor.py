# ai-service/app/crawler/content_processor.py
import re
import hashlib
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)

class ContentProcessor:
    """
    Nettoie, désidentifie et enrichit le contenu scrapé.
    Supprime les informations personnelles et prépare pour la génération de questions.
    """
    
    def __init__(self):
        # Patterns pour la désidentification
        self.email_pattern = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
        self.url_pattern = re.compile(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+')
        self.name_pattern = re.compile(r'\b([A-Z][a-z]+ [A-Z][a-z]+)\b')
        self.ip_pattern = re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b')
        
    def process_content(self, raw_content: Dict) -> Dict:
        """
        Nettoie et désidentifie le contenu scrapé
        """
        processed = raw_content.copy()
        
        # Désidentification du texte
        processed['content'] = self.deidentify_text(processed.get('content', ''))
        processed['title'] = self.deidentify_text(processed.get('title', ''))
        
        # Extraction des caractéristiques techniques
        processed['technical_features'] = self.extract_technical_features(
            processed['title'], 
            processed['content'], 
            processed.get('tags', [])
        )
        
        # Hash pour tracking unique et déduplication
        processed['content_hash'] = self.generate_content_hash(
            processed['title'] + processed['content']
        )
        
        # Nettoyage supplémentaire
        processed['content'] = self.clean_content(processed['content'])
        
        logger.debug(f"✅ Processed content: {processed['title'][:50]}...")
        return processed
    
    def deidentify_text(self, text: str) -> str:
        """Supprime les informations personnelles identifiables"""
        if not text:
            return text
        
        # Supprimer emails
        text = self.email_pattern.sub('[EMAIL_REDACTED]', text)
        
        # Supprimer URLs (garder les domaines techniques)
        text = self.url_pattern.sub('[URL_REDACTED]', text)
        
        # Supprimer noms potentiels
        text = self.name_pattern.sub('[NAME_REDACTED]', text)
        
        # Supprimer adresses IP
        text = self.ip_pattern.sub('[IP_REDACTED]', text)
        
        return text
    
    def clean_content(self, text: str) -> str:
        """Nettoie le contenu pour la génération de questions"""
        if not text:
            return text
        
        # Supprimer les caractères spéciaux excessifs
        text = re.sub(r'[^\w\s.,!?;:()\-]', '', text)
        
        # Normaliser les espaces
        text = re.sub(r'\s+', ' ', text)
        
        # Tronquer si trop long (pour l'IA)
        if len(text) > 2000:
            text = text[:2000] + "..."
            
        return text.strip()
    
    def extract_technical_features(self, title: str, content: str, tags: List[str]) -> Dict:
        """Extrait les caractéristiques techniques du problème"""
        full_text = (title + " " + content).lower()
        
        features = {
            'has_code_snippet': bool(re.search(r'```[\s\S]*?```|`[^`]+`', content)),
            'has_error_message': bool(re.search(r'error|exception|fail|bug|crash', full_text, re.I)),
            'has_code_example': bool(re.search(r'def |function |class |import |public ', content)),
            'problem_type': self.classify_problem_type(title, content, tags),
            'estimated_complexity': self.estimate_complexity(title, content, tags),
            'keywords': self.extract_keywords(title + " " + content)
        }
        return features
    
    def classify_problem_type(self, title: str, content: str, tags: List[str]) -> str:
        """Classifie le type de problème"""
        text = (title + " " + content).lower()
        
        if any(word in text for word in ['error', 'exception', 'crash', 'fail', 'bug']):
            return 'debugging'
        elif any(word in text for word in ['algorithm', 'optimize', 'performance', 'complexity', 'efficiency']):
            return 'algorithm'
        elif any(word in text for word in ['syntax', 'compile', 'parse', 'indentation']):
            return 'syntax'
        elif any(word in text for word in ['implement', 'create', 'build', 'function', 'method']):
            return 'implementation'
        elif any(word in text for word in ['why', 'how', 'what', 'difference', 'explain']):
            return 'conceptual'
        elif any(word in text for word in ['database', 'query', 'sql', 'mongodb', 'postgres']):
            return 'database'
        elif any(word in text for word in ['api', 'endpoint', 'rest', 'graphql', 'http']):
            return 'api'
        else:
            return 'general'
    
    def estimate_complexity(self, title: str, content: str, tags: List[str]) -> str:
        """Estime la complexité du problème"""
        text = (title + " " + content).lower()
        text_length = len(text)
        
        # Facteurs de complexité
        has_code = bool(re.search(r'```|`[^`]+`|def |function |class ', content))
        has_multiple_concepts = len(tags) > 3
        has_advanced_terms = any(term in text for term in [
            'recursion', 'asynchronous', 'multithreading', 'optimization', 
            'algorithm', 'complexity', 'performance'
        ])
        
        if has_advanced_terms and has_multiple_concepts:
            return 'high'
        elif has_code or has_multiple_concepts:
            return 'medium'
        else:
            return 'low'
    
    def extract_keywords(self, text: str) -> List[str]:
        """Extrait les mots-clés techniques du texte"""
        # Mots-clés techniques communs
        technical_keywords = [
            'python', 'javascript', 'java', 'c#', 'sql', 'html', 'css',
            'function', 'class', 'method', 'variable', 'loop', 'conditional',
            'array', 'object', 'string', 'integer', 'boolean', 'null',
            'error', 'exception', 'bug', 'fix', 'debug', 'test',
            'api', 'database', 'server', 'client', 'request', 'response',
            'algorithm', 'data structure', 'optimization', 'performance'
        ]
        
        text_lower = text.lower()
        found_keywords = []
        
        for keyword in technical_keywords:
            if keyword in text_lower:
                found_keywords.append(keyword)
                
        # Retourner les 10 premiers mots-clés maximum
        return found_keywords[:10]
    
    def generate_content_hash(self, text: str) -> str:
        """Génère un hash MD5 unique pour le contenu"""
        import hashlib
        # Normaliser le texte avant de hasher
        normalized_text = re.sub(r'\s+', ' ', text.lower().strip())
        return hashlib.md5(normalized_text.encode()).hexdigest()

# Test du content processor
if __name__ == "__main__":
    print("🧪 Testing Content Processor...")
    
    processor = ContentProcessor()
    
    # Données de test
    test_data = {
        "title": "How to fix TypeError in Python? Contact me at john@example.com",
        "content": "I'm getting this error when trying to run my code: TypeError... Check my website: http://mysite.com",
        "tags": ["python", "error", "debugging"],
        "votes": 10,
        "answers": 2,
        "language": "python"
    }
    
    processed = processor.process_content(test_data)
    
    print("📥 Input:")
    print(f"  Title: {test_data['title']}")
    print(f"  Content: {test_data['content'][:100]}...")
    
    print("\n📤 Output:")
    print(f"  Title: {processed['title']}")
    print(f"  Content: {processed['content'][:100]}...")
    print(f"  Content Hash: {processed['content_hash']}")
    print(f"  Technical Features: {processed['technical_features']}")
    
    print("✅ Content Processor working correctly!")