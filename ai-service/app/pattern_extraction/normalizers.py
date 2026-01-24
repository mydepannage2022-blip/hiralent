"""
app/pattern_extraction/normalizers.py

Additional normalization utilities
"""

from typing import Dict, List, Any


class DifficultyNormalizer:
    """Normalize difficulty across different platforms"""
    
    @staticmethod
    def normalize(difficulty: str, source: str) -> str:
        """
        Normalize difficulty to 'easy' | 'medium' | 'hard'
        """
        difficulty_lower = difficulty.lower()
        
        # Direct matches
        if difficulty_lower in ['easy', 'medium', 'hard']:
            return difficulty_lower
        
        # Synonyms
        easy_synonyms = ['simple', 'beginner', 'basic']
        medium_synonyms = ['moderate', 'intermediate', 'average']
        hard_synonyms = ['difficult', 'expert', 'advanced', 'challenging']
        
        if difficulty_lower in easy_synonyms:
            return 'easy'
        if difficulty_lower in medium_synonyms:
            return 'medium'
        if difficulty_lower in hard_synonyms:
            return 'hard'
        
        # Default
        return 'medium'


class TagNormalizer:
    """Normalize tags across different platforms"""
    
    @staticmethod
    def normalize_tag_list(tags: List[str]) -> List[str]:
        """
        Normalize a list of tags to consistent format
        - Lowercase
        - Hyphenated
        - No duplicates
        - Max 8 tags
        """
        normalized = []
        
        for tag in tags:
            if not isinstance(tag, str):
                continue
            
            # Normalize format
            normalized_tag = tag.lower().replace("_", "-").replace(" ", "-")
            
            # Remove duplicates
            if normalized_tag not in normalized:
                normalized.append(normalized_tag)
        
        return normalized[:8]  # Limit to 8 tags