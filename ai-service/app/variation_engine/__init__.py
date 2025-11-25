
"""
Variation Engine - Anti-cheat question variant generation system
"""

from .parametrizer import QuestionParametrizer
from .template_engine import ProblemTemplateEngine
from .test_case_variator import TestCaseVariator
from .difficulty_calibrator import DifficultyCalibrator
from .variant_generator import VariationGenerator

__all__ = [
    "QuestionParametrizer",
    "ProblemTemplateEngine", 
    "TestCaseVariator",
    "DifficultyCalibrator",
    "VariationGenerator"
]
