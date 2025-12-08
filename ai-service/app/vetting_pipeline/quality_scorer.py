# python-services/ai-service/app/vetting_pipeline/quality_scorer.py
from typing import Dict, List
import numpy as np
from .validator import StaticValidator
from .sandbox_client import SandboxClient

class QualityScorer:
    def __init__(self, sandbox_client: SandboxClient):
        self.static_validator = StaticValidator()
        self.sandbox_client = sandbox_client
        self.weights = {
            'static_validation': 0.3,
            'sandbox_validation': 0.4,
            'complexity': 0.2,
            'originality': 0.1
        }
    
    def score_question(self, question: Dict) -> Dict:
        """Comprehensive quality scoring for a question"""
        
        # Static validation
        static_result = self.static_validator.validate_question_structure(question)
        
        # Sandbox validation
        sandbox_result = self.sandbox_client.validate_solution(question)
        
        # Complexity analysis
        complexity_score = self._analyze_complexity(question)
        
        # Originality check (placeholder - would use vector DB)
        originality_score = self._check_originality(question)
        
        # Calculate weighted score
        final_score = (
            self.weights['static_validation'] * static_result.quality_score +
            self.weights['sandbox_validation'] * (1.0 if sandbox_result.get('all_passed', False) else 0.0) +
            self.weights['complexity'] * complexity_score +
            self.weights['originality'] * originality_score
        )
        
        return {
            'final_score': final_score,
            'static_validation': static_result.dict(),
            'sandbox_validation': sandbox_result,
            'complexity_score': complexity_score,
            'originality_score': originality_score,
            'is_approved': final_score >= 0.7 and sandbox_result.get('all_passed', False),
            'recommendation': self._get_recommendation(final_score, static_result.issues)
        }
    
    def _analyze_complexity(self, question: Dict) -> float:
        """Analyze question complexity"""
        solution = question.get('canonical_solution', '')
        lines = solution.split('\n')
        non_empty_lines = [line for line in lines if line.strip()]
        
        # Simple heuristic based on solution length and structure
        if len(non_empty_lines) > 30:
            return 0.9  # High complexity
        elif len(non_empty_lines) > 15:
            return 0.6  # Medium complexity
        else:
            return 0.3  # Low complexity
    
    def _check_originality(self, question: Dict) -> float:
        """Check question originality (placeholder)"""
        # TODO: Integrate with vector DB for similarity search
        return 0.8  # Default score
    
    def _get_recommendation(self, score: float, issues: List[str]) -> str:
        if score >= 0.8:
            return "APPROVE"
        elif score >= 0.6:
            return "REVIEW"
        else:
            return "REJECT"