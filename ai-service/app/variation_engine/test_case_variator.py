import random
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

class TestCaseVariator:
    """
    Generate varied test cases for anti-cheat protection
    """
    
    def generate_varied_test_cases(self, question_type: str, base_test_cases: List, 
                                 parameters: Dict, count: int = 5) -> List[Dict]:
        """Generate new test cases based on parameters"""
        if question_type == 'array_operations':
            return self._generate_array_test_cases(parameters, count)
        elif question_type == 'string_manipulation':
            return self._generate_string_test_cases(parameters, count)
        elif question_type == 'math_operations':
            return self._generate_math_test_cases(parameters, count)
        else:
            return self._generate_generic_test_cases(base_test_cases, parameters, count)
    
    def _generate_array_test_cases(self, params: Dict, count: int) -> List[Dict]:
        """Generate array manipulation test cases"""
        test_cases = []
        input_size = params.get('input_size', 10)
        min_val = params.get('min_value', 1)
        max_val = params.get('max_value', 100)
        operation = params.get('operation', 'sort')
        
        for i in range(count):
            # Vary the input size slightly for different test cases
            current_size = max(1, input_size + random.randint(-2, 2))
            input_array = [random.randint(min_val, max_val) for _ in range(current_size)]
            
            # Expected output depends on the operation
            expected_output = self._calculate_expected_array_output(input_array, operation)
            
            test_cases.append({
                "input": str(input_array),
                "expected_output": str(expected_output),
                "description": f'Test case {i+1} with array size {current_size}'
            })
        
        logger.info(f"Generated {len(test_cases)} array test cases")
        return test_cases
    
    def _calculate_expected_array_output(self, input_array: List, operation: str):
        """Calculate expected output for array operations"""
        if operation == 'sort':
            return sorted(input_array)
        elif operation == 'reverse':
            return list(reversed(input_array))
        elif operation == 'filter':
            # Filter even numbers as example
            return [x for x in input_array if x % 2 == 0]
        else:
            return sorted(input_array)  # Default fallback
    
    def _generate_string_test_cases(self, params: Dict, count: int) -> List[Dict]:
        """Generate string manipulation test cases"""
        test_cases = []
        string_length = params.get('string_length', 10)
        operation = params.get('operation', 'reverse')
        
        character_sets = {
            'alphanumeric': 'abcdefghijklmnopqrstuvwxyz0123456789',
            'lowercase': 'abcdefghijklmnopqrstuvwxyz',
            'uppercase': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            'mixed': 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
        }
        
        charset = character_sets.get(params.get('character_set', 'alphanumeric'))
        
        for i in range(count):
            current_length = max(1, string_length + random.randint(-3, 3))
            input_string = ''.join(random.choices(charset, k=current_length))
            
            expected_output = self._calculate_expected_string_output(input_string, operation)
            
            test_cases.append({
                "input": f'"{input_string}"',
                "expected_output": str(expected_output),
                "description": f'Test case {i+1} with string length {current_length}'
            })
        
        logger.info(f"Generated {len(test_cases)} string test cases")
        return test_cases
    
    def _calculate_expected_string_output(self, input_string: str, operation: str):
        """Calculate expected output for string operations"""
        if operation == 'reverse':
            return input_string[::-1]
        elif operation == 'palindrome':
            return input_string == input_string[::-1]
        elif operation == 'uppercase':
            return input_string.upper()
        elif operation == 'lowercase':
            return input_string.lower()
        else:
            return input_string  # Default fallback
    
    def _generate_math_test_cases(self, params: Dict, count: int) -> List[Dict]:
        """Generate math operation test cases"""
        test_cases = []
        min_val = params.get('min_value', 1)
        max_val = params.get('max_value', 100)
        operation = params.get('operation', 'prime')
        
        for i in range(count):
            input_number = random.randint(min_val, max_val)
            expected_output = self._calculate_expected_math_output(input_number, operation)
            
            test_cases.append({
                "input": str(input_number),
                "expected_output": str(expected_output),
                "description": f'Test case {i+1} for {operation}'
            })
        
        logger.info(f"Generated {len(test_cases)} math test cases")
        return test_cases
    
    def _calculate_expected_math_output(self, number: int, operation: str):
        """Calculate expected output for math operations"""
        if operation == 'prime':
            return self._is_prime(number)
        elif operation == 'fibonacci':
            # Return nth fibonacci number
            a, b = 0, 1
            for _ in range(number):
                a, b = b, a + b
            return a
        elif operation == 'factorial':
            result = 1
            for i in range(1, number + 1):
                result *= i
            return result
        else:
            return number
    
    def _is_prime(self, n: int) -> bool:
        """Check if a number is prime"""
        if n < 2:
            return False
        for i in range(2, int(n**0.5) + 1):
            if n % i == 0:
                return False
        return True
    
    def _generate_generic_test_cases(self, base_test_cases: List, params: Dict, count: int) -> List[Dict]:
        """Generate generic test cases when type is unknown"""
        if base_test_cases and len(base_test_cases) > 0:
            # Return a subset of base test cases with slight modifications
            selected = random.sample(base_test_cases, min(count, len(base_test_cases)))
            logger.info(f"Using {len(selected)} base test cases")
            return selected
        else:
            # Generate simple test cases
            test_cases = [{
                "input": f"test_input_{i}",
                "expected_output": f"expected_output_{i}",
                "description": f"Generated test case {i}"
            } for i in range(count)]
            
            logger.info(f"Generated {len(test_cases)} generic test cases")
            return test_cases