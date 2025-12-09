# ai-service/vector_engine/embeddings.py
import numpy as np
from sentence_transformers import SentenceTransformer
import torch
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

class EmbeddingGenerator:
    """
    Generate embeddings for questions and code snippets
    """
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None
        self.embedding_dim = 384  # Default for all-MiniLM-L6-v2
        
    def load_model(self):
        """Load the embedding model"""
        try:
            logger.info(f"Loading embedding model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            # Test the model
            test_embedding = self.model.encode(["test"])
            self.embedding_dim = len(test_embedding[0])
            logger.info(f"Model loaded successfully. Embedding dimension: {self.embedding_dim}")
        except Exception as e:
            logger.error(f"Failed to load model {self.model_name}: {e}")
            raise
    
    def generate_question_embedding(self, question_data: Dict[str, Any]) -> np.ndarray:
        """
        Generate embedding for a question by combining multiple text components
        """
        if self.model is None:
            self.load_model()
        
        # Combine different aspects of the question for better similarity detection
        text_components = []
        
        # 1. Title and problem statement (most important)
        if question_data.get('title'):
            text_components.append(question_data['title'])
        if question_data.get('problemStatement'):
            text_components.append(question_data['problemStatement'])
        
        # 2. Skill tags and concepts
        if question_data.get('skillTags'):
            tags_text = " ".join(question_data['skillTags'])
            text_components.append(tags_text)
        
        # 3. Code-specific elements (for coding questions)
        if question_data.get('type') == 'coding':
            if question_data.get('canonicalSolution'):
                # Extract key concepts from solution without implementation details
                solution_text = self._extract_concepts_from_code(question_data['canonicalSolution'])
                text_components.append(solution_text)
            
            if question_data.get('testCases'):
                test_cases_text = self._extract_test_case_patterns(question_data['testCases'])
                text_components.append(test_cases_text)
        
        # Combine all components
        combined_text = " ".join(text_components)
        
        # Generate embedding
        embedding = self.model.encode([combined_text])[0]
        return embedding.astype(np.float32)
    
    def generate_code_embedding(self, code_snippet: str) -> np.ndarray:
        """Generate embedding specifically for code snippets"""
        if self.model is None:
            self.load_model()
        
        # Preprocess code for better embedding
        processed_code = self._preprocess_code(code_snippet)
        embedding = self.model.encode([processed_code])[0]
        return embedding.astype(np.float32)
    
    def _extract_concepts_from_code(self, code: str) -> str:
        """Extract programming concepts from code (simplified version)"""
        # This would be enhanced with AST parsing in production
        concepts = []
        
        # Simple keyword-based concept extraction
        python_keywords = ['def ', 'class ', 'import ', 'from ', 'if ', 'for ', 'while ', 'return ']
        for keyword in python_keywords:
            if keyword in code:
                concepts.append(keyword.strip())
        
        # Common data structures
        data_structures = ['list', 'dict', 'set', 'tuple', 'array', 'string']
        for ds in data_structures:
            if ds in code.lower():
                concepts.append(ds)
        
        return " ".join(concepts)
    
    def _extract_test_case_patterns(self, test_cases: Any) -> str:
        """Extract patterns from test cases"""
        patterns = []
        
        if isinstance(test_cases, dict):
            if test_cases.get('examples'):
                for example in test_cases['examples']:
                    if example.get('input'):
                        patterns.append(f"input:{str(example['input'])[:50]}")
                    if example.get('expected_output'):
                        patterns.append(f"output:{str(example['expected_output'])[:50]}")
        
        return " ".join(patterns)
    
    def _preprocess_code(self, code: str) -> str:
        """Preprocess code for better embedding generation"""
        # Remove excessive whitespace
        code = ' '.join(code.split())
        # Limit length to avoid token limits
        return code[:1000]