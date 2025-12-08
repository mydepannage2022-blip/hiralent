# ai-service/vector_engine/similarity_search.py
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
import logging
from .embeddings import EmbeddingGenerator
from .vector_store import VectorStore
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

class SimilaritySearchEngine:
    """
    Main engine for detecting similar questions and preventing duplication
    """
    
    def __init__(self):
        self.embedding_generator = EmbeddingGenerator()
        self.vector_store = VectorStore()
        self.similarity_thresholds = {
            "high_similarity": 0.85,
            "medium_similarity": 0.70,
            "low_similarity": 0.50
        }
    
    def analyze_question_similarity(self, new_question: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze similarity of a new question against existing questions
        """
        try:
            # Generate embedding for the new question
            new_embedding = self.embedding_generator.generate_question_embedding(new_question)
            
            # Find similar questions
            similar_questions = self.vector_store.find_similar_questions(
                new_embedding,
                max_results=20,
                similarity_threshold=self.similarity_thresholds["low_similarity"]
            )
            
            # Analyze similarity levels
            high_similarity = [q for q in similar_questions 
                             if q["similarity_score"] >= self.similarity_thresholds["high_similarity"]]
            medium_similarity = [q for q in similar_questions 
                               if self.similarity_thresholds["medium_similarity"] <= q["similarity_score"] < self.similarity_thresholds["high_similarity"]]
            
            # Determine duplication risk
            duplication_risk = "low"
            if high_similarity:
                duplication_risk = "high"
            elif medium_similarity:
                duplication_risk = "medium"
            
            # Generate similarity report
            similarity_report = {
                "duplication_risk": duplication_risk,
                "new_question_id": new_question.get("id", "unknown"),
                "similar_questions_found": len(similar_questions),
                "high_similarity_matches": len(high_similarity),
                "medium_similarity_matches": len(medium_similarity),
                "top_similar_questions": similar_questions[:5],  # Top 5 most similar
                "embedding_generated": True,
                "analysis_timestamp": datetime.now().isoformat()
            }
            
            logger.info(f"Similarity analysis completed. Risk: {duplication_risk}")
            return similarity_report
            
        except Exception as e:
            logger.error(f"Similarity analysis failed: {e}")
            return {
                "duplication_risk": "unknown",
                "error": str(e),
                "embedding_generated": False
            }
    
    def check_code_similarity(self, code_snippet: str, question_id: str = None) -> Dict[str, Any]:
        """
        Check if a code snippet is similar to existing solutions
        """
        try:
            # Generate code embedding
            code_embedding = self.embedding_generator.generate_code_embedding(code_snippet)
            
            # Find similar code snippets
            similar_code = self.vector_store.find_similar_questions(
                code_embedding,
                max_results=10,
                similarity_threshold=self.similarity_thresholds["medium_similarity"]
            )
            
            # Filter out the current question if provided
            if question_id:
                similar_code = [sc for sc in similar_code if sc["question_id"] != question_id]
            
            return {
                "code_similarity_detected": len(similar_code) > 0,
                "similar_solutions_found": len(similar_code),
                "similar_solutions": similar_code,
                "analysis_timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Code similarity check failed: {e}")
            return {
                "code_similarity_detected": False,
                "error": str(e)
            }
    
    def bulk_similarity_check(self, questions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Perform similarity check on multiple questions
        """
        results = []
        duplicate_pairs = []
        
        for question in questions:
            similarity_result = self.analyze_question_similarity(question)
            results.append({
                "question_id": question.get("id", "unknown"),
                "title": question.get("title", "Unknown"),
                "similarity_result": similarity_result
            })
            
            # Check for high similarity within the batch
            if similarity_result["duplication_risk"] == "high":
                for similar_q in similarity_result["top_similar_questions"]:
                    if similar_q["question_id"] in [q.get("id") for q in questions]:
                        duplicate_pairs.append({
                            "question_1": question.get("id"),
                            "question_2": similar_q["question_id"],
                            "similarity_score": similar_q["similarity_score"]
                        })
        
        return {
            "bulk_analysis_complete": True,
            "total_questions_analyzed": len(questions),
            "questions_with_high_risk": len([r for r in results if r["similarity_result"]["duplication_risk"] == "high"]),
            "questions_with_medium_risk": len([r for r in results if r["similarity_result"]["duplication_risk"] == "medium"]),
            "internal_duplicates_found": len(duplicate_pairs),
            "detailed_results": results,
            "duplicate_pairs": duplicate_pairs
        }
    
    def store_question_for_future_comparison(self, question: Dict[str, Any]) -> bool:
        """
        Store a question in the vector database for future similarity checks
        """
        try:
            # Generate embedding
            embedding = self.embedding_generator.generate_question_embedding(question)
            
            # Prepare metadata
            metadata = {
                "title": question.get("title", ""),
                "type": question.get("type", "unknown"),
                "difficulty": question.get("difficulty", "unknown"),
                "skill_tags": question.get("skillTags", []),
                "problem_statement_length": len(question.get("problemStatement", "")),
                "source": question.get("source", "unknown")
            }
            
            # Store in vector database
            success = self.vector_store.store_question_embedding(
                question_id=question.get("id", str(uuid.uuid4())),
                embedding=embedding,
                metadata=metadata
            )
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to store question for future comparison: {e}")
            return False
    def get_all_stored_questions(self) -> List[Dict[str, Any]]:
     """Get all questions stored in the vector database"""
     return self.vector_store.get_all_questions()

    def get_question_by_id(self, question_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific question by ID from vector database"""
        return self.vector_store.get_question_by_id(question_id)