# python-services/qgen-service/app/vetting_pipeline/redis_manager.py
import redis
import json
import pickle
from typing import Optional, Dict, Any
import logging

class VettingRedisManager:
    def __init__(self, redis_url: str):
        self.redis_client = redis.from_url(redis_url)
        self.logger = logging.getLogger(__name__)
        
        # Redis key patterns
        self.QUESTION_VETTING_KEY = "question:vetting:{question_id}"
        self.VALIDATION_RESULT_KEY = "validation:result:{question_id}"
        self.QUEUE_PENDING = "vetting:queue:pending"
        self.QUEUE_PROCESSED = "vetting:queue:processed"
    
    def cache_validation_result(self, question_id: str, result: Dict, expire_seconds: int = 3600):
        """Cache validation result for a question"""
        key = self.VALIDATION_RESULT_KEY.format(question_id=question_id)
        try:
            self.redis_client.setex(
                key,
                expire_seconds,
                json.dumps(result)
            )
            self.logger.info(f"Cached validation result for question {question_id}")
        except Exception as e:
            self.logger.error(f"Failed to cache validation result: {e}")
    
    def get_cached_validation_result(self, question_id: str) -> Optional[Dict]:
        """Get cached validation result"""
        key = self.VALIDATION_RESULT_KEY.format(question_id=question_id)
        try:
            cached = self.redis_client.get(key)
            if cached:
                return json.loads(cached)
        except Exception as e:
            self.logger.error(f"Failed to get cached validation result: {e}")
        return None
    
    def add_to_vetting_queue(self, question_id: str):
        """Add question to vetting queue"""
        try:
            self.redis_client.lpush(self.QUEUE_PENDING, question_id)
            self.logger.info(f"Added question {question_id} to vetting queue")
        except Exception as e:
            self.logger.error(f"Failed to add to vetting queue: {e}")
    
    def get_next_vetting_item(self) -> Optional[str]:
        """Get next question from vetting queue"""
        try:
            return self.redis_client.rpop(self.QUEUE_PENDING)
        except Exception as e:
            self.logger.error(f"Failed to get next vetting item: {e}")
            return None
    
    def mark_as_processed(self, question_id: str):
        """Mark question as processed"""
        try:
            self.redis_client.lpush(self.QUEUE_PROCESSED, question_id)
            self.logger.info(f"Marked question {question_id} as processed")
        except Exception as e:
            self.logger.error(f"Failed to mark as processed: {e}")
    
    def get_queue_stats(self) -> Dict[str, int]:
        """Get vetting queue statistics"""
        try:
            return {
                'pending': self.redis_client.llen(self.QUEUE_PENDING),
                'processed': self.redis_client.llen(self.QUEUE_PROCESSED)
            }
        except Exception as e:
            self.logger.error(f"Failed to get queue stats: {e}")
            return {'pending': 0, 'processed': 0}