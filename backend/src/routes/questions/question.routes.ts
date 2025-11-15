import express from 'express';
import { QuestionController } from '../../controller/question/question.controller';
import { checkAuth } from '../../middlewares/checkAuth.middleware';
import { checkAIServiceAvailable } from '../../middlewares/ai-service-check.middleware';
import { validateBatchGeneration } from '../../middlewares/question.validation.middleware';

const router = express.Router();
const controller = new QuestionController();

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

// 404 handler
router.use((req, res) => {
  console.log('❌ ROUTER 404 - No route matched:', req.method, req.url);
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} /api/questions${req.url}`
  });
});

console.log('✅ Question routes loaded successfully');

export default router; // ✅ IMPORTANT: Export par défaut!
