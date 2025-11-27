import random
import re
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)

class ProblemTemplateEngine:
    """
    Generate varied problem statements while maintaining core concepts
    """
    
    def __init__(self):
        self.templates = {
            'array_operations': [
                "Given an array of {input_size} integers where values range from {min_value} to {max_value}, write a function to {operation} the elements.",
                "You have a list containing {input_size} numbers. Implement an algorithm to {operation} the list according to the specified constraints.",
                "Process an array of size {input_size} with values between {min_value} and {max_value}. Your task is to {operation} the array efficiently."
            ],
            'string_manipulation': [
                "Given a string of length {string_length} containing {character_set} characters, write a function to {operation} the string.",
                "You are provided with a string with approximately {string_length} characters. Implement a solution to {operation} the string.",
                "Process the input string (length: {string_length}) and {operation} it according to the requirements."
            ],
            'math_operations': [
                "Given a number in the range {min_value} to {max_value}, write a function to {operation} it.",
                "Implement an algorithm to {operation} numbers within the range {min_value} to {max_value}.",
                "Create a function that performs {operation} on numerical inputs between {min_value} and {max_value}."
            ],
            'data_structures': [
                "Implement a {data_structure} with approximately {structure_size} elements of type {data_type} and support {operation} operations.",
                "Design and implement a {data_structure} that can handle {structure_size} {data_type} elements and perform {operation} efficiently."
            ]
        }
        
        self.operation_descriptions = {
            'sort': 'sort in ascending order',
            'reverse': 'reverse the order of elements',
            'filter': 'filter out elements that meet specific criteria',
            'search': 'find a particular element or pattern',
            'palindrome': 'check if it is a palindrome',
            'anagram': 'determine if it is an anagram of another string',
            'prime': 'check if a number is prime',
            'fibonacci': 'calculate Fibonacci sequence',
            'factorial': 'compute factorial',
            'insert': 'insert new elements',
            'delete': 'remove existing elements'
        }
    
    def generate_varied_statement(self, original_statement: str, parameters: Dict) -> str:
        """Generate a varied problem statement using templates"""
        question_type = self._classify_question(original_statement)
        
        if question_type in self.templates:
            template = random.choice(self.templates[question_type])
            
            # Format the template with parameters
            formatted_params = self._prepare_parameters(parameters, question_type)
            varied_statement = template.format(**formatted_params)
            
            # Add constraints section
            constraints = self._generate_constraints(question_type, formatted_params)
            varied_statement += f"\n\nConstraints:\n{constraints}"
            
            logger.info(f"Generated varied statement for {question_type}")
            return varied_statement
        else:
            # Fallback: parameter substitution in original statement
            return self._parameterize_existing_statement(original_statement, parameters)
    
    def _classify_question(self, statement: str) -> str:
        """Classify question type for template selection"""
        if not statement:
            return 'array_operations'
            
        statement_lower = statement.lower()
        
        if any(word in statement_lower for word in ['array', 'list', 'elements']):
            return 'array_operations'
        elif any(word in statement_lower for word in ['string', 'text', 'character']):
            return 'string_manipulation'
        elif any(word in statement_lower for word in ['number', 'integer', 'math', 'prime', 'fibonacci']):
            return 'math_operations'
        elif any(word in statement_lower for word in ['tree', 'graph', 'linked list', 'stack', 'queue', 'hash']):
            return 'data_structures'
        else:
            return 'array_operations'
    
    def _prepare_parameters(self, params: Dict, question_type: str) -> Dict:
        """Prepare parameters for template formatting"""
        formatted = params.copy()
        
        # Ensure all required parameters exist based on question type
        if question_type == 'array_operations':
            formatted.setdefault('input_size', random.randint(5, 100))
            formatted.setdefault('min_value', 1)
            formatted.setdefault('max_value', 100)
            formatted.setdefault('operation', 'process')
        elif question_type == 'string_manipulation':
            formatted.setdefault('string_length', random.randint(5, 50))
            formatted.setdefault('character_set', 'alphanumeric')
            formatted.setdefault('operation', 'process')
        elif question_type == 'math_operations':
            formatted.setdefault('min_value', 1)
            formatted.setdefault('max_value', 100)
            formatted.setdefault('operation', 'calculate')
        elif question_type == 'data_structures':
            formatted.setdefault('structure_size', random.randint(5, 50))
            formatted.setdefault('data_type', 'integers')
            formatted.setdefault('data_structure', 'data structure')
            formatted.setdefault('operation', 'basic operations')
            
        return formatted
    
    def _generate_constraints(self, question_type: str, params: Dict) -> str:
        """Generate appropriate constraints based on question type and parameters"""
        constraints = []
        
        if question_type == 'array_operations':
            constraints.extend([
                f"- Array length: {params.get('input_size', 'N')}",
                f"- Values range: {params.get('min_value', 1)} to {params.get('max_value', 100)}",
                "- Time complexity: O(n log n) or better",
                "- Space complexity: O(1) if possible"
            ])
        elif question_type == 'string_manipulation':
            constraints.extend([
                f"- String length: {params.get('string_length', 'N')}",
                "- Consider edge cases (empty string, single character)",
                "- Preserve original character casing unless specified"
            ])
        elif question_type == 'math_operations':
            constraints.extend([
                f"- Input range: {params.get('min_value', 1)} to {params.get('max_value', 100)}",
                "- Handle edge cases (zero, negative numbers if applicable)",
                "- Optimize for large inputs"
            ])
        elif question_type == 'data_structures':
            constraints.extend([
                f"- Structure size: ~{params.get('structure_size', 'N')} elements",
                f"- Data type: {params.get('data_type', 'mixed')}",
                "- Maintain proper time/space complexity"
            ])
        
        return '\n'.join(constraints)
    
    def _parameterize_existing_statement(self, statement: str, params: Dict) -> str:
        """Replace numeric values and sizes in existing statement"""
        varied = statement
        
        for key, value in params.items():
            if isinstance(value, int):
                # Replace the first occurrence of a similar number
                varied = re.sub(r'\b\d+\b', str(value), varied, count=1)
        
        return varied