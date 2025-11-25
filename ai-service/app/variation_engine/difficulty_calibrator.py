import random
from typing import Dict
import logging

logger = logging.getLogger(__name__)

class DifficultyCalibrator:
    """
    Ensure variations maintain similar difficulty levels
    """
    
    def __init__(self):
        self.difficulty_factors = {
            'easy': {
                'max_complexity': 3,
                'input_size_range': (1, 20),
                'allowed_operations': ['sort', 'reverse', 'palindrome', 'factorial_small']
            },
            'medium': {
                'max_complexity': 7,
                'input_size_range': (10, 100),
                'allowed_operations': ['search', 'filter', 'anagram', 'prime', 'fibonacci']
            },
            'hard': {
                'max_complexity': 10,
                'input_size_range': (50, 1000),
                'allowed_operations': ['complex_sort', 'optimization', 'graph_traversal']
            }
        }
    
    def calibrate_difficulty(self, base_difficulty: str, parameters: Dict, variation_id: int) -> str:
        """Ensure variations maintain similar difficulty to base question"""
        difficulties = ['easy', 'medium', 'hard']
        
        # Small random adjustment (85% stay same, 15% change slightly)
        if random.random() > 0.85:
            current_index = difficulties.index(base_difficulty)
            # Move one step up or down, but not beyond boundaries
            new_index = max(0, min(2, current_index + random.choice([-1, 1])))
            new_difficulty = difficulties[new_index]
            
            logger.info(f"Adjusted difficulty from {base_difficulty} to {new_difficulty}")
            return new_difficulty
        
        logger.info(f"Maintained difficulty: {base_difficulty}")
        return base_difficulty
    
    def validate_difficulty_consistency(self, base_difficulty: str, parameters: Dict) -> bool:
        """Validate that parameters are consistent with the claimed difficulty"""
        factors = self.difficulty_factors.get(base_difficulty, self.difficulty_factors['medium'])
        
        # Check input size constraints
        input_size = parameters.get('input_size', 10)
        min_size, max_size = factors['input_size_range']
        
        if not (min_size <= input_size <= max_size):
            logger.warning(f"Input size {input_size} outside range for {base_difficulty}")
            return False
            
        return True