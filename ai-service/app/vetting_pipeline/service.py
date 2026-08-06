import logging
from typing import Dict, List
from .validator import StaticValidator
from .sandbox_client import SandboxClient
from .quality_scorer import QualityScorer
from .redis_manager import VettingRedisManager

class VettingPipelineService:
    """Service principal qui orchestre tout le pipeline"""
    
    def __init__(self, redis_url: str, sandbox_url: str, sandbox_token: str = None):
        self.logger = logging.getLogger(__name__)
        self.redis_manager = VettingRedisManager(redis_url)
        # sandbox_url is the hardened runner-python HTTP base; sandbox_token is the shared X-Runner-Token.
        self.sandbox_client = SandboxClient(sandbox_url, sandbox_token)
        self.validator = StaticValidator()
        self.quality_scorer = QualityScorer(self.sandbox_client)
    
    def process_question(self, question: Dict) -> Dict:
        """Traite une question complète"""
        
        # 1. Vérifier le cache
        cached = self.redis_manager.get_cached_validation_result(question.get('id', ''))
        if cached:
            self.logger.info(f"Question {question.get('id')} trouvée en cache")
            return cached
        
        # 2. Ajouter à la queue
        self.redis_manager.add_to_vetting_queue(question.get('id', ''))
        
        try:
            # 3. Validation statique
            self.logger.info("Étape 1: Validation statique...")
            static_result = self.validator.validate_question_structure(question)
            
            if not static_result.is_valid:
                return {
                    'status': 'REJECTED',
                    'reason': 'Static validation failed',
                    'issues': static_result.issues,
                    'score': static_result.quality_score
                }
            
            # 4. Test sandbox (appelle Youssra)
            self.logger.info("Étape 2: Test sandbox...")
            sandbox_result = self.sandbox_client.validate_solution(question)
            
            # 5. Notation qualité
            self.logger.info("Étape 3: Notation qualité...")
            quality_result = self.quality_scorer.score_question(question)
            
            # 6. Préparer résultat final
            final_result = {
                'status': 'APPROVED' if quality_result['is_approved'] else 'REJECTED',
                'static_validation': static_result.dict(),
                'sandbox_result': sandbox_result,
                'quality_score': quality_result['final_score'],
                'recommendation': quality_result['recommendation'],
                'difficulty': static_result.difficulty_level,
                'processed_at': self._get_timestamp(),
                'metadata': {
                    'cached': False,
                    'sandbox_tested': True,
                    'has_errors': sandbox_result.get('error') is not None
                }
            }
            
            # 7. Sauvegarder dans Redis
            self.redis_manager.cache_validation_result(
                question.get('id', ''), 
                final_result
            )
            self.redis_manager.mark_as_processed(question.get('id', ''))
            
            return final_result
            
        except Exception as e:
            self.logger.error(f"Erreur dans le pipeline: {e}")
            return {
                'status': 'ERROR',
                'error': str(e),
                'processed_at': self._get_timestamp()
            }
    
    def batch_process(self, questions: List[Dict]) -> Dict:
        """Traite plusieurs questions"""
        results = []
        for question in questions:
            result = self.process_question(question)
            results.append(result)
        
        stats = {
            'total': len(results),
            'approved': sum(1 for r in results if r.get('status') == 'APPROVED'),
            'rejected': sum(1 for r in results if r.get('status') == 'REJECTED'),
            'errors': sum(1 for r in results if r.get('status') == 'ERROR'),
        }
        
        return {
            'results': results,
            'stats': stats
        }
    
    def get_pipeline_stats(self) -> Dict:
        """Récupère les statistiques du pipeline"""
        queue_stats = self.redis_manager.get_queue_stats()
        return {
            'queue': queue_stats,
            'service_status': 'RUNNING',
            'sandbox_connected': self.sandbox_client is not None,
            'redis_connected': self.redis_manager is not None
        }
    
    def _get_timestamp(self):
        from datetime import datetime
        return datetime.now().isoformat()