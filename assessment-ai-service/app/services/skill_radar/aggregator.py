from typing import Dict, List
from collections import defaultdict
from .models import SkillObservation
from .calculator import calculate_skill_score, combine_scores

def aggregate_skill_scores(
    existing_scores: Dict[str, float],
    new_observations: List[SkillObservation],
    current_timestamp: float
) -> Dict[str, float]:
    """
    Aggregate multiple skill observations into updated skill scores.
    
    Args:
        existing_scores: Current skill scores {skill: score}
        new_observations: List of new skill observations
        current_timestamp: Current time for decay calculations
    
    Returns:
        Updated skill scores dictionary
    """
    # Group observations by skill
    skill_observations = defaultdict(list)
    for observation in new_observations:
        skill_observations[observation.skill].append(observation)
    
    updated_scores = existing_scores.copy()
    
    for skill, observations in skill_observations.items():
        # Calculate average score for this skill from new observations
        new_scores = [
            calculate_skill_score(obs, current_timestamp)
            for obs in observations
        ]
        avg_new_score = sum(new_scores) / len(new_scores) if new_scores else 0.0
        
        # Get existing score or default to 0
        existing_score = updated_scores.get(skill, 0.0)
        
        # Combine with existing score
        if existing_score > 0:
            # Use EMA to combine with existing score
            updated_scores[skill] = combine_scores(existing_score, avg_new_score)
        else:
            # First observation for this skill
            updated_scores[skill] = avg_new_score
    
    return updated_scores

def normalize_scores(scores: Dict[str, float], max_score: float = 1.0) -> Dict[str, float]:
    """
    Normalize skill scores to ensure they're within reasonable bounds.
    
    Args:
        scores: Raw skill scores
        max_score: Maximum allowed score
    
    Returns:
        Normalized scores
    """
    return {
        skill: min(max_score, score)
        for skill, score in scores.items()
    }