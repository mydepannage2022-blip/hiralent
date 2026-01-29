import { QuestionController } from '../../controller/question/question.controller';
import { checkAuth } from '../../middlewares/checkAuth.middleware';
import { checkAIServiceAvailable } from '../../middlewares/ai-service-check.middleware';
import { validateBatchGeneration } from '../../middlewares/question.validation.middleware';
import { vectorEngineService } from '../../../src/services/question/vectorEngine.service';
import express, { Request, Response } from 'express'; 
import { vettingService } from '../../services/question/vetting.service';
import { PatternQuestionPipeline } from "../../services/question/pattern-question.pipeline";
import { requireScrapingAccess } from "../../middlewares/scrapingAuth.middleware";

const router = express.Router();
const controller = new QuestionController();
const pipeline = new PatternQuestionPipeline();

console.log('📋 Loading question routes...');

// ========== AI QUESTION GENERATION ROUTES ==========
router.get('/ai-question-service/health', 
  controller.checkAIQuestionServiceHealth.bind(controller)
);

router.post('/generate', 
  checkAuth,
  checkAIServiceAvailable,
  controller.generateQuestion.bind(controller)
);

router.post('/generate-batch',
  checkAuth,
  validateBatchGeneration,
  checkAIServiceAvailable,
  controller.generateBatchQuestions.bind(controller)
);

// ========== CRUD ROUTES ==========

// POST /api/questions (Create manually)
router.post('/', 
  checkAuth,
  controller.createQuestion.bind(controller)
);

// GET /api/questions
router.get('/', 
  controller.getAllQuestions.bind(controller)
);

// GET /api/questions/stats/overview
router.get('/stats/overview', 
  checkAuth,
  controller.getStats.bind(controller)
);
// ========== MCQ GENERATION ROUTES (ADD THESE) ==========

router.post('/generate-mcq',
  checkAuth,
  checkAIServiceAvailable,
  controller.generateMCQQuestion.bind(controller)
);

router.post('/generate-mcq-batch',
  checkAuth,
  checkAIServiceAvailable,
  controller.generateMCQBatch.bind(controller)
);

// Clone a library question into "My Questions" Ihssane added this
router.post(
  "/clone-from-library",
  checkAuth,
  controller.cloneFromLibrary.bind(controller)
);
// ✅ List company user's own questions (My Questions)
router.get(
  "/my",
  checkAuth,
  controller.getMyQuestions.bind(controller)
);

// GET /api/questions/:id
router.get('/:id', 
  controller.getQuestionById.bind(controller)
);

// PUT /api/questions/:id
router.put('/:id', 
  checkAuth,
  controller.updateQuestion.bind(controller)
);

// PATCH /api/questions/:id/approve
router.patch('/:id/approve', 
  checkAuth,
  controller.approveQuestion.bind(controller)
);

// PATCH /api/questions/:id/reject
router.patch('/:id/reject', 
  checkAuth,
  controller.rejectQuestion.bind(controller)
);

// POST /api/questions/bulk/approve
router.post('/bulk/approve', 
  checkAuth,
  controller.bulkApprove.bind(controller)
);

// POST /api/questions/bulk/delete
router.post('/bulk/delete', 
  checkAuth,
  controller.bulkDelete.bind(controller)
);

// DELETE /api/questions/:id
router.delete('/:id', 
  checkAuth,
  controller.deleteQuestion.bind(controller)
);

// ========== DIAGRAM GENERATION ROUTES (NEW) ==========

// Generate question WITH automatic diagram
router.post('/generate-with-diagram',
  checkAuth,
  checkAIServiceAvailable,
  controller.generateQuestionWithDiagram.bind(controller)
);

// Check if diagram generation is available
router.get('/diagram-service/health',
  controller.checkDiagramServiceHealth.bind(controller)
);

// Get diagram for a specific question
router.get('/:id/diagram',
  controller.getQuestionDiagram.bind(controller)
);
// ========== WEB SCRAPING ROUTES ==========
router.post('/scrape',
  checkAuth,
  controller.scrapeQuestions.bind(controller)
);

router.get('/scrape-service/health',
  controller.checkScrapeServiceHealth.bind(controller)
);
//  NOUVELLE ROUTE: Import automatique depuis StackOverflow
router.post('/import-scraped',
  checkAuth,
  controller.importScrapedQuestions.bind(controller)
);
// ========== LEETCODE SCRAPING ROUTES (NEW) ==========
router.get('/scrape/leetcode/health',
  controller.checkLeetCodeScrapingHealth.bind(controller)
);

router.post('/scrape/leetcode/test',
  checkAuth,
  controller.testLeetCodeScraping.bind(controller)
);

router.post('/scrape/leetcode/url',
  checkAuth,
  controller.scrapeLeetCodeByUrl.bind(controller)
);

router.post('/scrape/leetcode/batch',
  checkAuth,
  controller.scrapeLeetCodeBatch.bind(controller)
);

/**
 * POST /api/questions/generate-from-patterns
 * body: { source?: "stackoverflow" | "leetcode" | "github" | "hackerrank", limit?: number }
 * Auth: requireScrapingAccess (system token, not user token)
 */
router.post(
  "/generate-from-patterns",
  requireScrapingAccess, //  system auth (no user token)
  async (req, res) => {
    try {
      const { source, limit } = req.body ?? {};
      const result = await pipeline.generateFromPatterns({ source, limit });
      return res.json(result);
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e?.message || "Failed" });
    }
  }
);

// ========== VARIATION ENGINE ROUTES ==========
router.get('/variation-engine/health',
  controller.checkVariationEngineHealth.bind(controller)
);

router.post('/:id/generate-variations',
  checkAuth,
  controller.generateVariations.bind(controller)
);

router.post('/:id/analyze-variability',
  checkAuth,
  controller.analyzeVariability.bind(controller)
);


router.post('/:id/analyze-variability',
  checkAuth,
  controller.analyzeVariability.bind(controller)
);


// ========== VECTOR ENGINE ROUTES ==========
// ========== VECTOR ENGINE ROUTES ==========

// Vector engine health check
router.get('/vector/health', 
  async (req: Request, res: Response) => {
    try {
      const health = await vectorEngineService.healthCheck();
      res.json({
        success: true,
        vectorEngine: health,
        config: {
          aiServiceUrl: process.env.AI_SERVICE_URL,
          enabled: process.env.VECTOR_ENGINE_ENABLED
        }
      });
    } catch (error: any) {
      res.status(503).json({
        success: false,
        error: 'Vector engine unavailable',
        details: error.message
      });
    }
  }
);
// Vector engine health check
router.get('/vector-engine/health', 
  async (req: Request, res: Response) => {
    try {
      const health = await vectorEngineService.healthCheck();
      res.json({
        success: true,
        vectorEngine: health,
        config: {
          aiServiceUrl: process.env.AI_SERVICE_URL,
          enabled: process.env.VECTOR_ENGINE_ENABLED
        }
      });
    } catch (error: any) {
      res.status(503).json({
        success: false,
        error: 'Vector engine unavailable',
        details: error.message
      });
    }
  }
);

// Check similarity for a question
router.post('/:id/check-similarity',
  checkAuth,
  async (req: Request, res: Response) => {
    try {
      const question = await controller.questionService.getQuestionById(req.params.id);
      if (!question) {
        return res.status(404).json({ 
          success: false, 
          error: 'Question not found' 
        });
      }

      const result = await vectorEngineService.checkSimilarity(question);
      res.json({ 
        success: true, 
        similarityCheck: result 
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
);

// Check code similarity
router.post('/:id/check-code-similarity',
  checkAuth,
  async (req: Request, res: Response) => {
    try {
      const { codeSnippet } = req.body;
      if (!codeSnippet) {
        return res.status(400).json({ 
          success: false, 
          error: 'codeSnippet is required' 
        });
      }

      const result = await vectorEngineService.checkCodeSimilarity(
        codeSnippet, 
        req.params.id
      );
      res.json({ 
        success: true, 
        codeSimilarityCheck: result 
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
);

// Get vector database stats
router.get('/vector-db/stats',
  checkAuth,
  async (req: Request, res: Response) => {
    try {
      const stats = await vectorEngineService.getDatabaseStats();
      res.json({ 
        success: true, 
        stats 
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
);

// Store question in vector database (manual trigger)
router.post('/:id/store-in-vector-db',
  checkAuth,
  async (req: Request, res: Response) => {
    try {
      const question = await controller.questionService.getQuestionById(req.params.id);
      if (!question) {
        return res.status(404).json({ 
          success: false, 
          error: 'Question not found' 
        });
      }

      const result = await vectorEngineService.storeQuestion(question);
      res.json({ 
        success: true, 
        storageResult: result 
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
);

// Delete question from vector database
router.delete('/:id/delete-from-vector-db',
  checkAuth,
  async (req: Request, res: Response) => {
    try {
      const result = await vectorEngineService.deleteQuestion(req.params.id);
      res.json({ 
        success: true, 
        deletionResult: result 
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

);
// ========== VETTING ENGINE ROUTES ==========

// Health check vetting
router.get('/vetting/health', async (req: Request, res: Response) => {
  try {
    const health = await vettingService.healthCheck();
    res.json({
      success: true,
      vetting: health,
      config: {
        vettingServiceUrl: process.env.AI_VETTING_URL,
      },
    });
  } catch (error: any) {
    res.status(503).json({
      success: false,
      error: 'Vetting service unavailable',
      details: error.message,
    });
  }
});

// Vetter une question par ID
router.post('/:id/vet',
  checkAuth,
  controller.vetQuestionById.bind(controller)
);

// Vetter un batch (liste d’IDs)
router.post('/vetting/batch',
  checkAuth,
  controller.vetBatchQuestions.bind(controller)
);

// 404 handler
router.use((req, res) => {
  console.log('❌ ROUTER 404 - No route matched:', req.method, req.url);
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} /api/questions${req.url}`
  });
});


console.log(' Question routes loaded successfully');

export default router; 
