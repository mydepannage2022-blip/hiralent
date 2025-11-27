import { Request, Response, NextFunction } from 'express';
import { aiQuestionGenerationService } from '../services/ai/ai-question-generation.service';

/**
 * Middleware qui vérifie si le AI service est disponible
 * Utilise ce middleware sur les routes qui dépendent du AI service
 */
export async function checkAIServiceAvailable(
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  try {
    console.log('🔍 [MIDDLEWARE] Checking AI service availability...');
    
    const health = await aiQuestionGenerationService.checkHealth();
    
    if (health.status !== 'healthy') {
      console.error('❌ [MIDDLEWARE] AI service is not healthy');
      return res.status(503).json({
        success: false,
        error: 'AI Question Generation service is currently unavailable',
        details: 'The Python AI service is not responding. Please ensure it is running on port 8000.',
        hint: 'Start the service: cd ai-service && python run.py'
      });
    }
    
    console.log('✅ [MIDDLEWARE] AI service is available');
    next();
  } catch (error: any) {
    console.error('❌ [MIDDLEWARE] AI service check failed:', error.message);
    return res.status(503).json({
      success: false,
      error: 'Cannot connect to AI service',
      details: error.message,
      hint: 'Make sure Python service is running: cd ai-service && python run.py'
    });
  }
}
