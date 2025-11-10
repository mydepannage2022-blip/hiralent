import time
from typing import Dict, Optional, List
from .models import SubmissionSignal, RadarVector
from .aggregator import aggregate_skill_scores, normalize_scores

class SkillRadarService:
    def __init__(self):
        # In production, this would connect to Redis/DB
        self._storage: Dict[str, RadarVector] = {}
    
    def get_radar_vector(self, candidate_id: str) -> Optional[RadarVector]:
        """Get current radar vector for a candidate"""
        return self._storage.get(candidate_id)
    
    def update_radar_vector(self, signal: SubmissionSignal) -> RadarVector:
        """
        Update skill radar with new submission data.
        
        Args:
            signal: Submission signal containing skill observations
        
        Returns:
            Updated radar vector
        """
        current_time = time.time()
        
        # Get existing vector or create new one
        existing_vector = self.get_radar_vector(signal.candidate_id)
        
        if existing_vector:
            existing_scores = existing_vector.scores
        else:
            existing_scores = {}
        
        # Aggregate new scores with existing ones
        updated_scores = aggregate_skill_scores(
            existing_scores,
            signal.skills,
            current_time
        )
        
        # Normalize scores
        normalized_scores = normalize_scores(updated_scores)
        
        # Create updated vector
        updated_vector = RadarVector(
            candidate_id=signal.candidate_id,
            scores=normalized_scores,
            updated_at=current_time
        )
        
        # Store updated vector
        self._storage[signal.candidate_id] = updated_vector
        
        return updated_vector
    
    def get_candidate_skills(self, candidate_id: str, min_confidence: float = 0.3) -> Dict[str, float]:
        """Get candidate skills above minimum confidence threshold"""
        vector = self.get_radar_vector(candidate_id)
        if not vector:
            return {}
        
        return {
            skill: score
            for skill, score in vector.scores.items()
            if score >= min_confidence
        }
    
    def get_skill_gaps(self, candidate_id: str, required_skills: List[str]) -> Dict[str, float]:
        """Identify skill gaps for a candidate"""
        candidate_skills = self.get_candidate_skills(candidate_id)
        
        gaps = {}
        for skill in required_skills:
            current_score = candidate_skills.get(skill, 0.0)
            gaps[skill] = max(0.0, 0.7 - current_score)  # Gap to reach 0.7 proficiency
        
        return {k: v for k, v in gaps.items() if v > 0}

# Singleton instance
skill_radar_service = SkillRadarService()