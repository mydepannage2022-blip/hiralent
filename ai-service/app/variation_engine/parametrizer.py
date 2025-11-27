import random
import re
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)

class QuestionParametrizer:
    """
    Core parameter variation logic for different question types
    """
    
    def __init__(self):
        self.param_templates = {
            'array_operations': {
                'input_sizes': [10, 50, 100, 500, 1000],
                'value_ranges': [
                    {'min': 1, 'max': 100},
                    {'min': -100, 'max': 100},
                    {'min': 0, 'max': 1000}
                ],
                'operations': ['sort', 'search', 'filter', 'transform', 'aggregate']
            },
            'string_manipulation': {
                'string_lengths': [5, 10, 20, 50, 100],
                'character_sets': ['alphanumeric', 'lowercase', 'uppercase', 'mixed'],
                'operations': ['reverse', 'palindrome', 'anagram', 'substring', 'format']
            },
            'math_operations': {
                'number_ranges': [
                    {'min': 1, 'max': 100},
                    {'min': -100, 'max': 100},
                    {'min': 1, 'max': 1000}
                ],
                'operations': ['prime', 'fibonacci', 'factorial', 'gcd', 'lcm']
            },
            'data_structures': {
                'structure_sizes': [5, 10, 20, 50],
                'data_types': ['integers', 'strings', 'mixed'],
                'operations': ['insert', 'delete', 'search', 'traverse']
            }
        }
    
    def generate_parameters(self, question_type: str, base_params: Dict = None) -> Dict:
        """Generate new parameters for a question variation"""
        if question_type not in self.param_templates:
            question_type = self._detect_question_type_from_params(base_params)
        
        template = self.param_templates.get(question_type, self.param_templates['array_operations'])
        new_params = {}
        
        # Generate random parameters based on template
        for param_category, options in template.items():
            if isinstance(options, list):
                new_params[param_category] = random.choice(options)
            elif isinstance(options, dict) and 'min' in options and 'max' in options:
                # Handle numeric ranges
                new_params[param_category] = random.randint(options['min'], options['max'])
        
        # Merge with base parameters if provided
        if base_params:
            new_params = {**base_params, **new_params}
            
        logger.info(f"Generated parameters for {question_type}: {new_params}")
        return new_params
    
    def _detect_question_type_from_params(self, params: Dict) -> str:
        """Detect question type from existing parameters"""
        if not params:
            return 'array_operations'
        
        param_str = str(params).lower()
        
        # Check for array-related parameters
        if any(key in param_str for key in ['array', 'list', 'elements']):
            return 'array_operations'
        elif any(key in param_str for key in ['string', 'text', 'character']):
            return 'string_manipulation'
        elif any(key in param_str for key in ['number', 'integer', 'math']):
            return 'math_operations'
        elif any(key in param_str for key in ['tree', 'graph', 'linkedlist', 'stack', 'queue']):
            return 'data_structures'
        else:
            return 'array_operations'

    def get_supported_question_types(self) -> List[str]:
        """Return list of supported question types for variation"""
        return list(self.param_templates.keys())