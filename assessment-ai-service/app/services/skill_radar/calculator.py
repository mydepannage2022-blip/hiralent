from typing import List
from .models import SkillObservation
from .time_decay import exponential_decay

def calculate_skill_score(observation: SkillObservation, current_timestamp: float) -> float:
    """
    Calculate a single skill score from an observation with time decay.
    
    Args:
        observation: Skill observation data
        current_timestamp: Current time for decay calculation
    
    Returns:
        Normalized skill score between 0 and 1
    """
    # Apply time decay
    decay_factor = exponential_decay(current_timestamp, observation.timestamp)
    
    # Base score from correctness, adjusted by time penalty
    base_score = observation.correctness * (1.0 - observation.time_penalty)
    
    # Apply weight and decay
    weighted_score = base_score * observation.question_weight
    decayed_score = weighted_score * decay_factor
    
    return max(0.0, min(1.0, decayed_score))

def combine_scores(existing_score: float, new_score: float, alpha: float = 0.3) -> float:
    """
    Combine existing score with new score using exponential moving average.
    
    Args:
        existing_score: Current skill score (0-1)
        new_score: New observation score (0-1)
        alpha: Smoothing factor (0-1), higher = more weight to new observations
    
    Returns:
        Combined score between 0 and 1
    """
    return (1 - alpha) * existing_score + alpha * new_score