# ai-service/app/crawler/stackoverflow_spider.py
import re
import logging
import sys
import os
import json
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
    Version améliorée avec parsing HTML réel et intégration Prisma.
    """
    
    def __init__(self):
        super().__init__("stackoverflow", "https://stackoverflow.com")
        self.start_urls = [
            "https://stackoverflow.com/questions/tagged/python?sort=votes&pagesize=50",
            "https://stackoverflow.com/questions/tagged/javascript?sort=votes&pagesize=50",
            "https://stackoverflow.com/questions/tagged/java?sort=votes&pagesize=50",
            "https://stackoverflow.com/questions/tagged/c%23?sort=votes&pagesize=50",
            "https://stackoverflow.com/questions/tagged/sql?sort=votes&pagesize=50"
        ]
    
    def extract_problems(self, html: str) -> List[Dict]:
        """
        Extrait les problèmes de programmation réels de Stack Overflow
        avec parsing HTML complet.
        """
        soup = BeautifulSoup(html, 'html.parser')
        problems = []
        
        # Trouver les conteneurs de questions - structure réelle de Stack Overflow
        question_summaries = soup.find_all('div', class_='s-post-summary')
        
        logger.info(f"🔍 Found {len(question_summaries)} question summaries on page")
        
        for summary in question_summaries:
            try:
                # Extraire le titre et l'URL
                title_elem = summary.find('a', class_='s-link')
                if not title_elem:
                    continue
                    
                title = title_elem.get_text().strip()
                href = title_elem.get('href', '')
                
                # Vérifier que c'est un lien de question valide
                if not href.startswith('/questions/'):
                    continue
                
                # Extraire le contenu/excerpt de la question
                excerpt_elem = summary.find('div', class_='s-post-summary--content-excerpt')
                content = excerpt_elem.get_text().strip() if excerpt_elem else f"StackOverflow question: {title}"
                
                # Extraire les statistiques (votes, réponses, vues)
                stats = summary.find_all('span', class_='s-post-summary--stats-item-number')
                votes = int(stats[0].get_text().strip()) if len(stats) > 0 else 0
                answers = int(stats[1].get_text().strip()) if len(stats) > 1 else 0
                views_text = stats[2].get_text().strip().replace(',', '') if len(stats) > 2 else '0'
                views = int(views_text) if views_text.isdigit() else 0
                
                # Extraire les tags
                tags = [tag.get_text() for tag in summary.find_all('a', class_='post-tag')]
                
                # Détecter le langage de programmation
                language = self._detect_language(tags)
                
                # Ignorer les questions non liées à la programmation
                if language == 'unknown' and not self._is_programming_question(tags, title):
                    continue
                
                # Estimer la difficulté
                difficulty = self._estimate_difficulty(votes, answers, views)
                
                # Classifier le type de problème
                problem_type = self._classify_problem_type(title, content, tags)
                
                # Générer les données du problème
                problem_data = {
                    'source': 'stackoverflow',
                    'title': title,
                    'content': content,
                    'full_question_url': self.base_url + href,
                    'tags': tags,
                    'votes': votes,
                    'answers': answers,
                    'views': views,
                    'language': language,
                    'difficulty': difficulty,
                    'problem_type': problem_type,
                    # Champs pour le modèle Prisma Question
                    'problemStatement': self._create_problem_statement(title, content, language),
                    'skillTags': self._filter_programming_tags(tags),
                    'type': 'coding',
                    'canonicalSolution': self._generate_solution_stub(language, title),
                    'testCases': self._generate_test_cases_stub(language),
                    'status': 'approved',
                    'aiGenerated': False,
                    'description': f"Programming question scraped from Stack Overflow about {language}"
                }
                
                problems.append(problem_data)
                logger.info(f"✅ Extracted: {title[:60]}... (Language: {language}, Difficulty: {difficulty})")
                
            except Exception as e:
                logger.warning(f"⚠️ Error parsing question: {e}")
                continue
        
        logger.info(f"🎉 Successfully extracted {len(problems)} real programming problems from StackOverflow")
        return problems
    
    def _is_programming_question(self, tags: List[str], title: str) -> bool:
        """Vérifie si c'est une question de programmation"""
        programming_keywords = [
            'python', 'javascript', 'java', 'c#', 'c++', 'php', 'ruby', 'go', 'rust',
            'html', 'css', 'react', 'angular', 'vue', 'node', 'django', 'flask',
            'sql', 'mysql', 'postgresql', 'mongodb', 'database',
            'algorithm', 'function', 'class', 'object', 'variable', 'array', 'string',
            'error', 'exception', 'debug', 'compile', 'syntax', 'code', 'programming',
            'function', 'method', 'loop', 'conditional', 'api', 'framework', 'library'
        ]
        
        title_lower = title.lower()
        for keyword in programming_keywords:
            if keyword in title_lower:
                return True
        
        # Vérifier les tags de langages de programmation
        programming_tags = ['python', 'javascript', 'java', 'c#', 'c++', 'php', 'ruby', 
                           'go', 'rust', 'swift', 'kotlin', 'typescript']
        for tag in tags:
            if tag.lower() in programming_tags:
                return True
        
        return False
    
    def _detect_language(self, tags: List[str]) -> str:
        """Détecte le langage de programmation basé sur les tags"""
        language_map = {
            'python': 'python', 'python-2.7': 'python', 'python-3.x': 'python', 'python-3': 'python',
            'javascript': 'javascript', 'node.js': 'javascript', 'reactjs': 'javascript', 
            'typescript': 'javascript', 'vue.js': 'javascript', 'angular': 'javascript',
            'java': 'java', 'spring': 'java', 'spring-boot': 'java', 'android': 'java',
            'c#': 'csharp', '.net': 'csharp', 'asp.net': 'csharp', 'unity': 'csharp',
            'c++': 'cpp', 'c': 'c',
            'php': 'php', 'laravel': 'php', 'wordpress': 'php',
            'ruby': 'ruby', 'ruby-on-rails': 'ruby',
            'go': 'go', 'golang': 'go',
            'rust': 'rust',
            'swift': 'swift', 'ios': 'swift',
            'kotlin': 'kotlin', 'android': 'kotlin',
            'sql': 'sql', 'mysql': 'sql', 'postgresql': 'sql', 'sql-server': 'sql', 'oracle': 'sql',
            'html': 'html', 'css': 'css', 'html5': 'html', 'css3': 'css'
        }
        
        for tag in tags:
            if tag in language_map:
                return language_map[tag]
        
        return 'unknown'
    
    def _estimate_difficulty(self, votes: int, answers: int, views: int) -> str:
        """Estime la difficulté basée sur les métriques d'engagement"""
        engagement_score = votes + (answers * 5) + (views / 100)
        
        if engagement_score > 1000:
            return 'hard'
        elif engagement_score > 200:
            return 'medium'
        else:
            return 'easy'
    
    def _classify_problem_type(self, title: str, content: str, tags: List[str]) -> str:
        """Classifie le type de problème de programmation"""
        title_lower = title.lower()
        content_lower = content.lower()
        
        # Debugging problems
        if any(word in title_lower for word in ['error', 'exception', 'debug', 'fix', 'why is', 'not working', 
                                               'doesn\'t work', 'crash', 'bug', 'issue']):
            return 'debugging'
        
        # Algorithm problems
        elif any(word in title_lower for word in ['algorithm', 'data structure', 'optimize', 'complexity', 
                                                 'big o', 'sort', 'search', 'recursion', 'dynamic programming']):
            return 'algorithm'
        
        # Database problems
        elif any(word in title_lower for word in ['database', 'query', 'sql', 'mongodb', 'postgresql', 
                                                 'mysql', 'join', 'index', 'transaction']):
            return 'database'
        
        # API problems
        elif any(word in title_lower for word in ['api', 'endpoint', 'rest', 'graphql', 'http', 'request', 
                                                 'response', 'authentication']):
            return 'api'
        
        # Implementation problems
        elif any(word in title_lower for word in ['function', 'method', 'class', 'object', 'interface', 
                                                 'implementation', 'design pattern', 'oop']):
            return 'implementation'
        
        # Performance problems
        elif any(word in title_lower for word in ['performance', 'speed', 'memory', 'efficiency', 'optimization']):
            return 'performance'
        
        else:
            return 'general'
    
    def _create_problem_statement(self, title: str, content: str, language: str) -> str:
        """Crée un énoncé de problème structuré"""
        return f"""
# {title}

## Problem Description
{content}

## Programming Language
{language.capitalize()}

## Requirements
Solve the programming problem described above. Your solution should be efficient, well-structured, and handle edge cases appropriately.

## Constraints
- Write clean, readable code
- Include proper error handling
- Consider time and space complexity
- Test with various inputs
"""
    
    def _filter_programming_tags(self, tags: List[str]) -> List[str]:
        """Filtre les tags pour ne garder que ceux liés à la programmation"""
        programming_tags = []
        non_programming_tags = ['stackoverflow', 'homework', 'beginner', 'interview', 'exercise']
        
        for tag in tags:
            if tag.lower() not in non_programming_tags:
                programming_tags.append(tag)
        
        return programming_tags if programming_tags else ['programming', 'coding']
    
    def _generate_solution_stub(self, language: str, title: str) -> str:
        """Génère un stub de solution basé sur le langage"""
        stubs = {
            'python': f'''# Solution for: {title}

def solution():
    """
    Implement your solution here.
    Return the appropriate result based on the problem requirements.
    """
    # TODO: Implement the solution
    pass

# Example usage and test cases
if __name__ == "__main__":
    # Test your solution here
    result = solution()
    print(f"Result: {{result}}")
''',
            
            'javascript': f'''// Solution for: {title}

function solution() {{
    /**
     * Implement your solution here.
     * Return the appropriate result based on the problem requirements.
     */
    // TODO: Implement the solution
}}

// Example usage and test cases
// const result = solution();
// console.log(`Result: ${{result}}`);
''',
            
            'java': f'''// Solution for: {title}

public class Solution {{
    public static Object solution() {{
        /**
         * Implement your solution here.
         * Return the appropriate result based on the problem requirements.
         */
        // TODO: Implement the solution
        return null;
    }}
    
    public static void main(String[] args) {{
        // Test your solution here
        Object result = solution();
        System.out.println("Result: " + result);
    }}
}}
''',
            
            'csharp': f'''// Solution for: {title}

using System;

public class Solution {{
    public static object SolutionMethod() {{
        /**
         * Implement your solution here.
         * Return the appropriate result based on the problem requirements.
         */
        // TODO: Implement the solution
        return null;
    }}
    
    public static void Main(string[] args) {{
        // Test your solution here
        object result = SolutionMethod();
        Console.WriteLine($"Result: {{result}}");
    }}
}}
''',
            
            'sql': f'''-- Solution for: {title}

/*
Implement your SQL solution here.
Write the appropriate queries based on the problem requirements.
*/

-- TODO: Implement the solution
SELECT * FROM your_table;
'''
        }
        
        return stubs.get(language, f'# Solution for: {title}\n\n# Implement your solution here')
    
    def _generate_test_cases_stub(self, language: str) -> Dict:
        """Génère une structure de tests basée sur le langage"""
        base_structure = {
            "inputs": ["test_input_1", "test_input_2", "test_input_3"],
            "outputs": ["expected_output_1", "expected_output_2", "expected_output_3"],
            "examples": [
                {
                    "input": "sample_input_1", 
                    "output": "sample_output_1", 
                    "explanation": "Basic test case with normal input"
                },
                {
                    "input": "sample_input_2", 
                    "output": "sample_output_2", 
                    "explanation": "Edge case with boundary values"
                },
                {
                    "input": "sample_input_3", 
                    "output": "sample_output_3", 
                    "explanation": "Error case or special scenario"
                }
            ]
        }
        
        # Adapt based on language
        if language == 'python':
            base_structure["inputs"] = ["input1", "input2", "input3"]
            base_structure["outputs"] = ["output1", "output2", "output3"]
        elif language == 'javascript':
            base_structure["inputs"] = ["'input1'", "'input2'", "'input3'"]
            base_structure["outputs"] = ["'output1'", "'output2'", "'output3'"]
        elif language == 'sql':
            base_structure["inputs"] = ["SELECT query input 1", "SELECT query input 2"]
            base_structure["outputs"] = ["Expected result set 1", "Expected result set 2"]
        
        return base_structure
    
    def get_next_page(self, soup: BeautifulSoup) -> Optional[str]:
        """Trouve le lien vers la page suivante"""
        next_link = soup.find('a', class_='s-pagination--item', string=re.compile(r'next', re.I))
        if next_link and next_link.get('href'):
            return self.base_url + next_link['href']
        return None

# Test amélioré du spider
if __name__ == "__main__":
    print("🧪 Testing Enhanced StackOverflow Spider...")
    
    spider = StackOverflowSpider()
    health = spider.health_check()
    print("🔍 Health check:", health)
    
    if health["status"] == "healthy":
        # Tester avec 1 page
        problems = spider.crawl(max_pages=1)
        print(f"📊 Found {len(problems)} real programming problems from StackOverflow")
        
        if problems:
            for i, problem in enumerate(problems[:3], 1):
                print(f"\n--- Problem {i} ---")
                print(f"Title: {problem['title']}")
                print(f"URL: {problem['full_question_url']}")
                print(f"Language: {problem['language']}")
                print(f"Difficulty: {problem['difficulty']}")
                print(f"Type: {problem['problem_type']}")
                print(f"Votes: {problem['votes']}, Answers: {problem['answers']}")
                print(f"Tags: {', '.join(problem['tags'][:5])}")
        else:
            print("❌ No problems extracted.")
            print("💡 This might be due to:")
            print("   - HTML structure changes on Stack Overflow")
            print("   - Network connectivity issues")
            print("   - Rate limiting by Stack Overflow")
        
        print(f"\n✅ Enhanced StackOverflow spider test completed!")
    else:
        print("❌ Health check failed:", health.get("error", "Unknown error"))