# ai-service/vector_engine/vector_store.py
import chromadb
from chromadb.config import Settings
import numpy as np
from typing import List, Dict, Any, Optional
import logging
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)

class VectorStore:
    """
    Manage vector storage and retrieval using ChromaDB
    """
    
    def __init__(self, persist_directory: str = "./chroma_db"):
        self.persist_directory = persist_directory
        self.client = None
        self.collection = None
        self.initialize_database()
    
    def initialize_database(self):
        """Initialize ChromaDB client and collection"""
        try:
            self.client = chromadb.PersistentClient(path=self.persist_directory)
            
            # Create or get collection
            self.collection = self.client.get_or_create_collection(
                name="question_embeddings",
                metadata={"description": "Question and code embeddings for similarity search"}
            )
            
            logger.info("Vector database initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize vector database: {e}")
            raise
    
    def store_question_embedding(self, 
                            question_id: str,
                            embedding: np.ndarray,
                            metadata: Dict[str, Any]) -> bool:
        """
        Store a question embedding in the vector database
        """
        try:
            # Convert numpy array to list for ChromaDB
            embedding_list = embedding.tolist()
            
            # Prepare metadata - handle different types appropriately
            enhanced_metadata = {
                "question_id": question_id,
                "stored_at": datetime.now().isoformat(),
                "embedding_dim": len(embedding),
                "title": metadata.get("title", ""),
                "type": metadata.get("type", "unknown"),
                "difficulty": metadata.get("difficulty", "unknown"),
                "problem_statement_length": metadata.get("problem_statement_length", 0),
                "source": metadata.get("source", "unknown")
            }
            
            # Handle skill_tags list by converting to string
            skill_tags = metadata.get("skill_tags", [])
            if skill_tags:
                enhanced_metadata["skill_tags"] = ", ".join(str(tag) for tag in skill_tags)
                enhanced_metadata["skill_count"] = len(skill_tags)  # Add count as separate field
            else:
                enhanced_metadata["skill_tags"] = ""
                enhanced_metadata["skill_count"] = 0
            
            # Store in ChromaDB
            self.collection.add(
                embeddings=[embedding_list],
                metadatas=[enhanced_metadata],
                ids=[question_id]
            )
            
            logger.info(f"Stored embedding for question: {question_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to store embedding for question {question_id}: {e}")
            return False
        
    def find_similar_questions(self, 
                            query_embedding: np.ndarray,
                            max_results: int = 10,
                            similarity_threshold: float = 0.7) -> List[Dict[str, Any]]:
        """
        Find similar questions based on embedding similarity
        """
        try:
            query_embedding_list = query_embedding.tolist()
            
            # Query the vector database
            results = self.collection.query(
                query_embeddings=[query_embedding_list],
                n_results=max_results,
                include=["metadatas", "distances"]
            )
            
            # Process results
            similar_questions = []
            if results['metadatas'] and results['distances']:
                for metadata, distance in zip(results['metadatas'][0], results['distances'][0]):
                    # Convert distance to similarity score (ChromaDB uses cosine distance)
                    similarity_score = 1 - distance
                    
                    if similarity_score >= similarity_threshold:
                        # Convert skill_tags string back to list for the response
                        processed_metadata = metadata.copy()
                        if "skill_tags" in processed_metadata and processed_metadata["skill_tags"]:
                            processed_metadata["skill_tags"] = [tag.strip() for tag in processed_metadata["skill_tags"].split(",")]
                        
                        similar_questions.append({
                            "question_id": metadata.get("question_id"),
                            "similarity_score": round(similarity_score, 4),
                            "metadata": processed_metadata,
                            "distance": distance
                        })
            
            # Sort by similarity score (descending)
            similar_questions.sort(key=lambda x: x["similarity_score"], reverse=True)
            
            logger.info(f"Found {len(similar_questions)} similar questions above threshold {similarity_threshold}")
            return similar_questions
            
        except Exception as e:
            logger.error(f"Failed to find similar questions: {e}")
            return []
    
    def batch_store_embeddings(self, embeddings_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Store multiple embeddings in batch
        """
        try:
            embeddings = []
            metadatas = []
            ids = []
            
            for data in embeddings_data:
                embeddings.append(data["embedding"].tolist())
                metadatas.append(data["metadata"])
                ids.append(data["question_id"])
            
            self.collection.add(
                embeddings=embeddings,
                metadatas=metadatas,
                ids=ids
            )
            
            logger.info(f"Batch stored {len(embeddings_data)} embeddings")
            return {"success": True, "count": len(embeddings_data)}
            
        except Exception as e:
            logger.error(f"Batch storage failed: {e}")
            return {"success": False, "error": str(e)}
    
    def get_question_count(self) -> int:
        """Get total number of questions in vector store"""
        try:
            return self.collection.count()
        except Exception as e:
            logger.error(f"Failed to get question count: {e}")
            return 0
    
    def delete_question_embedding(self, question_id: str) -> bool:
        """Delete a question embedding from the vector store"""
        try:
            self.collection.delete(ids=[question_id])
            logger.info(f"Deleted embedding for question: {question_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete embedding for question {question_id}: {e}")
            return False

    def get_all_questions(self) -> List[Dict[str, Any]]:
        """Get all questions stored in the vector database"""
        try:
            # Get all data from the collection
            results = self.collection.get(
                include=["metadatas", "embeddings"]
            )
            
            logger.info(f"Raw ChromaDB results - IDs: {results.get('ids', [])}, Metadatas count: {len(results.get('metadatas', []))}")
            
            questions = []
            if results.get('ids'):
                for i, question_id in enumerate(results['ids']):
                    # Safely get metadata
                    metadata = {}
                    if results.get('metadatas') and i < len(results['metadatas']):
                        metadata = results['metadatas'][i] or {}
                    
                    # Convert skill_tags string back to list for the response
                    processed_metadata = metadata.copy()
                    if "skill_tags" in processed_metadata and processed_metadata["skill_tags"]:
                        processed_metadata["skill_tags"] = [tag.strip() for tag in processed_metadata["skill_tags"].split(",") if tag.strip()]
                    
                    # Safely get embedding length
                    embedding_length = 0
                    if results.get('embeddings') and i < len(results['embeddings']) and results['embeddings'][i]:
                        embedding_length = len(results['embeddings'][i])
                    
                    questions.append({
                        "id": question_id,
                        "metadata": processed_metadata,
                        "embedding_length": embedding_length
                    })
            
            logger.info(f"Retrieved {len(questions)} questions from vector database")
            return questions
            
        except Exception as e:
            logger.error(f"Failed to get all questions: {e}")
            return []

    def get_question_by_id(self, question_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific question by ID"""
        try:
            results = self.collection.get(
                ids=[question_id],
                include=["embeddings", "metadatas"]
            )
            
            if not results['ids']:
                return None
                
            # Convert skill_tags string back to list for the response
            metadata = results['metadatas'][0] if results['metadatas'] else {}
            processed_metadata = metadata.copy()
            if "skill_tags" in processed_metadata and processed_metadata["skill_tags"]:
                processed_metadata["skill_tags"] = [tag.strip() for tag in processed_metadata["skill_tags"].split(",")]
            
            return {
                "id": results['ids'][0],
                "metadata": processed_metadata,
                "embedding_length": len(results['embeddings'][0]) if results['embeddings'] else 0
            }
            
        except Exception as e:
            logger.error(f"Failed to get question {question_id}: {e}")
            return None