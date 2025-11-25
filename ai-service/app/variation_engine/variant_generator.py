import uuid
import random
from typing import List, Dict, Any
import logging

from .parametrizer import QuestionParametrizer
from .template_engine import ProblemTemplateEngine
from .test_case_variator import TestCaseVariator
from .difficulty_calibrator import DifficultyCalibrator

logger = logging.getLogger(__name__)

class VariationGenerator:
    """
    Main engine that orchestrates question variation generation
    """
    
    def __init__(self):
        self.parametrizer = QuestionParametrizer()
        self.template_engine = ProblemTemplateEngine()
        self.test_variator = TestCaseVariator()
        self.difficulty_calibrator = DifficultyCalibrator()
        
        logger.info("VariationGenerator initialized successfully")
    
    async def generate_variations(self, base_question: Dict, num_variations: int = 10) -> List[Dict]:
        """Generate multiple variations of a base question"""
        variations = []
        
        # Validate base question
        if not self._validate_base_question(base_question):
            logger.error("Invalid base question provided")
            return variations
        
        # Analyze base question to understand its structure
        question_type = self.template_engine._classify_question(base_question.get('problemStatement', ''))
        base_difficulty = base_question.get('difficulty', 'medium')
        
        logger.info(f"Generating {num_variations} variations for {question_type} question (difficulty: {base_difficulty})")
        
        for i in range(num_variations):
            try:
                variation = await self._generate_single_variation(
                    base_question, question_type, base_difficulty, variation_id=i+1
                )
                variations.append(variation)
                logger.debug(f"Generated variation {i+1}/{num_variations}")
            except Exception as e:
                logger.error(f"Failed to generate variation {i+1}: {e}")
                continue
        
        logger.info(f"Successfully generated {len(variations)} variations")
        return variations
    
    async def _generate_single_variation(self, base_question: Dict, question_type: str, 
                                      base_difficulty: str, variation_id: int) -> Dict:
        """Generate a single question variation"""
        
        # Generate new parameters
        base_params = base_question.get('parameters', {})
        new_parameters = self.parametrizer.generate_parameters(question_type, base_params)
        
        # Generate varied problem statement
        varied_statement = self.template_engine.generate_varied_statement(
            base_question.get('problemStatement', ''), new_parameters
        )
        
        # Generate new test cases
        base_test_cases = base_question.get('testCases', {}).get('examples', [])
        varied_test_cases = self.test_variator.generate_varied_test_cases(
            question_type, base_test_cases, new_parameters, count=5
        )
        
        # Calibrate difficulty
        calibrated_difficulty = self.difficulty_calibrator.calibrate_difficulty(
            base_difficulty, new_parameters, variation_id
        )
        
        # Create variation object
        variation = {
            'id': str(uuid.uuid4()),
            'base_question_id': base_question.get('id', 'unknown'),
            'variation_number': variation_id,
            'title': f"{base_question.get('title', 'Question')} (Variant {variation_id})",
            'problemStatement': varied_statement,
            'difficulty': calibrated_difficulty,
            'parameters': new_parameters,
            'testCases': {
                'examples': varied_test_cases,
                'inputs': [tc['input'] for tc in varied_test_cases],
                'outputs': [tc['expected_output'] for tc in varied_test_cases]
            },
            'skillTags': base_question.get('skillTags', []).copy(),
            'type': base_question.get('type', 'coding'),
            'is_variation': True,
            'parent_version': base_question.get('version', '1.0'),
            'canonicalSolution': base_question.get('canonicalSolution', ''),
            'explanation': base_question.get('explanation', ''),
            'status': 'pending_review',
            'aiGenerated': base_question.get('aiGenerated', False),
            'source': base_question.get('source', 'variation_engine'),
            'metadata': {
                'generated_by': 'variation_engine',
                'question_type': question_type,
                'variation_engine_version': '1.0.0',
                'generated_at': self._get_current_timestamp()
            }
        }
        
        return variation
    
    def _validate_base_question(self, base_question: Dict) -> bool:
        """Validate that the base question has required fields"""
        required_fields = ['title', 'problemStatement', 'type']
        
        for field in required_fields:
            if field not in base_question or not base_question[field]:
                logger.error(f"Base question missing required field: {field}")
                return False
        
        if base_question.get('type') not in ['coding', 'mcq']:
            logger.error(f"Unsupported question type: {base_question.get('type')}")
            return False
            
        return True
    
    def _get_current_timestamp(self) -> str:
        """Get current timestamp in ISO format"""
        from datetime import datetime
        return datetime.now().isoformat()
    
    def get_engine_info(self) -> Dict[str, Any]:
        """Get information about the variation engine"""
        return {
            'version': '1.0.0',
            'supported_question_types': self.parametrizer.get_supported_question_types(),
            'components': {
                'parametrizer': 'active',
                'template_engine': 'active',
                'test_variator': 'active',
                'difficulty_calibrator': 'active'
            }
        }