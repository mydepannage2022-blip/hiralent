# app/diagram_generator/diagram_detector.py
"""
Détecte si une question nécessite un diagramme basé sur:
- Les tags (sql, database, backend, oop, system-design)
- Le contenu de problemStatement
- Le type de question
"""

from typing import Optional, Dict
import re


class DiagramDetector:
    """Détecte automatiquement si une question nécessite un diagramme"""
    
    # Tags qui indiquent un besoin de diagramme
    SQL_TAGS = {'sql', 'database', 'postgresql', 'mysql', 'mongodb', 'schema', 'normalization'}
    BACKEND_TAGS = {'backend', 'api', 'rest', 'microservices', 'architecture', 'system-design'}
    OOP_TAGS = {'oop', 'class', 'inheritance', 'polymorphism', 'design-pattern', 'java', 'c++'}
    ALGORITHM_TAGS = {'tree', 'graph', 'binary-tree', 'linked-list', 'heap', 'bst'}
    
    # Mots-clés dans le problemStatement
    SQL_KEYWORDS = ['table', 'schema', 'foreign key', 'primary key', 'join', 'relationship', 'entity']
    BACKEND_KEYWORDS = ['class diagram', 'api flow', 'sequence', 'authentication', 'microservice']
    ALGORITHM_KEYWORDS = ['binary tree', 'graph', 'linked list', 'tree traversal', 'node']
    
    def detect_diagram_need(self, question_data: Dict) -> Optional[Dict]:
        """
        Détecte si un diagramme est nécessaire
        
        Args:
            question_data: {
                'title': str,
                'problemStatement': str,
                'skillTags': List[str],
                'difficulty': str,
                'type': str
            }
        
        Returns:
            {
                'needed': bool,
                'type': 'er' | 'class' | 'sequence' | 'tree' | 'flowchart' | 'architecture',
                'reason': str,
                'confidence': float (0.0-1.0)
            } or None
        """
        title = question_data.get('title', '').lower()
        problem_statement = question_data.get('problemStatement', '').lower()
        skill_tags = [tag.lower() for tag in question_data.get('skillTags', [])]
        
        # 1. Vérifier SQL/Database questions → ER Diagram
        if self._is_sql_question(skill_tags, problem_statement):
            return {
                'needed': True,
                'type': 'er',
                'reason': 'SQL/Database schema question detected',
                'confidence': self._calculate_confidence(skill_tags, problem_statement, self.SQL_TAGS, self.SQL_KEYWORDS)
            }
        
        # 2. Vérifier OOP/Backend questions → Class Diagram
        if self._is_oop_question(skill_tags, problem_statement):
            return {
                'needed': True,
                'type': 'class',
                'reason': 'OOP/Class design question detected',
                'confidence': self._calculate_confidence(skill_tags, problem_statement, self.OOP_TAGS, self.BACKEND_KEYWORDS)
            }
        
        # 3. Vérifier Backend/API questions → Sequence Diagram
        if self._is_api_flow_question(skill_tags, problem_statement):
            return {
                'needed': True,
                'type': 'sequence',
                'reason': 'API flow/sequence question detected',
                'confidence': self._calculate_confidence(skill_tags, problem_statement, self.BACKEND_TAGS, self.BACKEND_KEYWORDS)
            }
        
        # 4. Vérifier Algorithm questions → Tree/Graph Diagram
        if self._is_algorithm_visual_question(skill_tags, problem_statement):
            return {
                'needed': True,
                'type': 'tree',
                'reason': 'Data structure visualization needed',
                'confidence': self._calculate_confidence(skill_tags, problem_statement, self.ALGORITHM_TAGS, self.ALGORITHM_KEYWORDS)
            }
        
        # 5. Vérifier System Design → Architecture Diagram
        if self._is_system_design_question(skill_tags, problem_statement):
            return {
                'needed': True,
                'type': 'architecture',
                'reason': 'System design/architecture question',
                'confidence': self._calculate_confidence(skill_tags, problem_statement, self.BACKEND_TAGS, self.BACKEND_KEYWORDS)
            }
        
        return None
    
    def _is_sql_question(self, tags: list, problem: str) -> bool:
        """Détecte les questions SQL/Database"""
        has_sql_tag = any(tag in self.SQL_TAGS for tag in tags)
        has_sql_keyword = any(keyword in problem for keyword in self.SQL_KEYWORDS)
        return has_sql_tag or has_sql_keyword
    
    def _is_oop_question(self, tags: list, problem: str) -> bool:
        """Détecte les questions OOP"""
        has_oop_tag = any(tag in self.OOP_TAGS for tag in tags)
        has_class_mention = 'class' in problem or 'object' in problem or 'inheritance' in problem
        return has_oop_tag and has_class_mention
    
    def _is_api_flow_question(self, tags: list, problem: str) -> bool:
        """Détecte les questions de flux API"""
        has_backend_tag = any(tag in self.BACKEND_TAGS for tag in tags)
        has_flow_keyword = any(kw in problem for kw in ['authentication', 'api flow', 'request', 'response'])
        return has_backend_tag and has_flow_keyword
    
    def _is_algorithm_visual_question(self, tags: list, problem: str) -> bool:
        """Détecte les questions nécessitant visualisation d'algorithme"""
        has_algo_tag = any(tag in self.ALGORITHM_TAGS for tag in tags)
        has_visual_keyword = any(kw in problem for kw in self.ALGORITHM_KEYWORDS)
        return has_algo_tag or has_visual_keyword
    
    def _is_system_design_question(self, tags: list, problem: str) -> bool:
        """Détecte les questions de system design"""
        system_design_indicators = ['design a', 'scalable', 'distributed', 'microservice', 'load balance']
        return any(indicator in problem for indicator in system_design_indicators)
    
    def _calculate_confidence(self, tags: list, problem: str, relevant_tags: set, relevant_keywords: list) -> float:
        """Calcule un score de confiance (0.0-1.0)"""
        tag_score = len([t for t in tags if t in relevant_tags]) / max(len(tags), 1)
        keyword_score = len([k for k in relevant_keywords if k in problem]) / len(relevant_keywords)
        return min((tag_score * 0.6 + keyword_score * 0.4), 1.0)


# Singleton instance
diagram_detector = DiagramDetector()