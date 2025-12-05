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
        issues = []
        
        # Check required fields
        required_fields = ['problem_statement', 'test_cases', 'language', 'canonical_solution']
        for field in required_fields:
            if not question.get(field):
                issues.append(f"Missing required field: {field}")
        
        # Validate problem statement clarity
        problem_stmt = question.get('problem_statement', '')
        if len(problem_stmt.split()) < 20:
            issues.append("Problem statement too short - may lack clarity")
        
        # Check test cases
        test_cases = question.get('test_cases', [])
        if len(test_cases) < 3:
            issues.append("Insufficient test cases (minimum 3 required)")
        
        # Validate canonical solution
        canonical_solution = question.get('canonical_solution', '')
        if len(canonical_solution.strip()) < 10:
            issues.append("Canonical solution appears incomplete")
        
        # Calculate quality score
        quality_score = self._calculate_quality_score(issues, question)
        difficulty = self._estimate_difficulty(question)
        
        return ValidationResult(
            is_valid=len(issues) == 0,
            issues=issues,
            quality_score=quality_score,
            difficulty_level=difficulty
        )
    
    def _calculate_quality_score(self, issues: List[str], question: Dict) -> float:
        """Calculate a quality score from 0-1"""
        base_score = 0.8
        penalty = len(issues) * 0.1
        return max(0, base_score - penalty)
    
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