import logging
from typing import Dict, List, Optional
from pydantic import BaseModel

class ValidationResult(BaseModel):
    is_valid: bool
    issues: List[str]
    quality_score: float
    difficulty_level: str

class StaticValidator:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def validate_question_structure(self, question: Dict) -> ValidationResult:
        """Static validation of question structure and clarity"""
        issues: List[str] = []
        blocking_issues: List[str] = []
        
        # 1) Check required fields  BLOQUANT
        required_fields = ['problem_statement', 'test_cases', 'language', 'canonical_solution']
        for field in required_fields:
            if not question.get(field):
                msg = f"Missing required field: {field}"
                issues.append(msg)
                blocking_issues.append(msg)
        
        # 2) Validate problem statement clarity   WARNING (non bloquant)
        problem_stmt = question.get('problem_statement', '')
        if len(problem_stmt.split()) < 20:
            msg = "Problem statement too short - may lack clarity"
            issues.append(msg)
            #  volontairement PAS dans blocking_issues
        
        # 3) Check test cases  👉 BLOQUANT
        test_cases = question.get('test_cases', [])
        if len(test_cases) < 3:
            msg = "Insufficient test cases (minimum 3 required)"
            issues.append(msg)
            blocking_issues.append(msg)
        
        # 4) Validate canonical solution  👉 BLOQUANT
        canonical_solution = question.get('canonical_solution', '')
        if len(canonical_solution.strip()) < 10:
            msg = "Canonical solution appears incomplete"
            issues.append(msg)
            blocking_issues.append(msg)
        
        # Calculate quality score
        quality_score = self._calculate_quality_score(issues, blocking_issues, question)
        difficulty = self._estimate_difficulty(question)
        
        return ValidationResult(
            is_valid=len(blocking_issues) == 0,  #  seuls les blocking_issues comptent
            issues=issues,                        # on retourne tout (warnings + bloquants)
            quality_score=quality_score,
            difficulty_level=difficulty
        )
    
    def _calculate_quality_score(
        self, 
        issues: List[str], 
        blocking_issues: List[str], 
        question: Dict
    ) -> float:
        """
        Calculate a quality score from 0-1.
        - Bloquant  : pénalité forte
        - Warning   : pénalité légère
        """
        base_score = 0.9
        
        nb_blocking = len(blocking_issues)
        nb_warnings = max(0, len(issues) - nb_blocking)
        
        penalty = nb_blocking * 0.15 + nb_warnings * 0.05
        return max(0.0, min(1.0, base_score - penalty))
    
    def _estimate_difficulty(self, question: Dict) -> str:
        """Estimate question difficulty"""
        solution_length = len(question.get('canonical_solution', ''))
        test_case_count = len(question.get('test_cases', []))
        
        if solution_length > 200 or test_case_count > 8:
            return "hard"
        elif solution_length > 100 or test_case_count > 5:
            return "medium"
        else:
            return "easy"
