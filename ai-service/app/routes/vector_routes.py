from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
import logging
from datetime import datetime

from ..vector_engine.similarity_search import SimilaritySearchEngine

router = APIRouter(prefix="/vector-search", tags=["Vector Similarity Search"])
similarity_engine = SimilaritySearchEngine()

logger = logging.getLogger(__name__)

@router.post("/analyze-similarity")
async def analyze_question_similarity(question_data: Dict[str, Any]):
    """
    Analyze similarity of a new question against existing questions
    """
    try:
        logger.info(f"Analyzing similarity for question: {question_data.get('title', 'Unknown')}")
        
        result = similarity_engine.analyze_question_similarity(question_data)
        
        return {
            "success": True,
            "analysis_id": f"sim_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "result": result,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Similarity analysis API error: {e}")
        raise HTTPException(status_code=500, detail=f"Similarity analysis failed: {str(e)}")

@router.post("/check-code-similarity")
async def check_code_similarity(request: Dict[str, Any]):
    """
    Check if a code snippet is similar to existing solutions
    """
    try:
        code_snippet = request.get("code_snippet")
        question_id = request.get("question_id")
        
        if not code_snippet:
            raise HTTPException(status_code=400, detail="code_snippet is required")
        
        result = similarity_engine.check_code_similarity(code_snippet, question_id)
        
        return {
            "success": True,
            "code_similarity_check": result,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Code similarity check API error: {e}")
        raise HTTPException(status_code=500, detail=f"Code similarity check failed: {str(e)}")

@router.post("/bulk-similarity-check")
async def bulk_similarity_check(request: Dict[str, Any]):
    """
    Perform similarity check on multiple questions
    """
    try:
        questions = request.get("questions", [])
        
        if not questions or len(questions) == 0:
            raise HTTPException(status_code=400, detail="questions array is required")
        
        if len(questions) > 100:
            raise HTTPException(status_code=400, detail="Maximum 100 questions allowed per batch")
        
        result = similarity_engine.bulk_similarity_check(questions)
        
        return {
            "success": True,
            "bulk_analysis": result,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Bulk similarity check API error: {e}")
        raise HTTPException(status_code=500, detail=f"Bulk similarity check failed: {str(e)}")

@router.post("/store-question")
async def store_question_for_similarity(question_data: Dict[str, Any]):
    """
    Store a question in vector database for future similarity checks
    """
    try:
        success = similarity_engine.store_question_for_future_comparison(question_data)
        
        return {
            "success": success,
            "message": "Question stored in vector database" if success else "Failed to store question",
            "question_id": question_data.get("id", "unknown"),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Question storage API error: {e}")
        raise HTTPException(status_code=500, detail=f"Question storage failed: {str(e)}")

@router.get("/database-stats")
async def get_vector_database_stats():
    """
    Get statistics about the vector database
    """
    try:
        question_count = similarity_engine.vector_store.get_question_count()
        
        return {
            "success": True,
            "database_stats": {
                "total_questions": question_count,
                "collection_name": "question_embeddings",
                "embedding_dimension": similarity_engine.embedding_generator.embedding_dim,
                "similarity_thresholds": similarity_engine.similarity_thresholds
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Database stats API error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get database stats: {str(e)}")

@router.delete("/question/{question_id}")
async def delete_question_embedding(question_id: str):
    """
    Delete a question embedding from vector database
    """
    try:
        success = similarity_engine.vector_store.delete_question_embedding(question_id)
        
        return {
            "success": success,
            "message": f"Question {question_id} deleted" if success else f"Failed to delete question {question_id}",
            "question_id": question_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Question deletion API error: {e}")
        raise HTTPException(status_code=500, detail=f"Question deletion failed: {str(e)}")