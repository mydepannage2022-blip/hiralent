import { QuestionController } from '../../controller/question/question.controller';
import { checkAuth } from '../../middlewares/checkAuth.middleware';
import { checkAIServiceAvailable } from '../../middlewares/ai-service-check.middleware';
import { validateBatchGeneration } from '../../middlewares/question.validation.middleware';
import { vectorEngineService } from '../../../src/services/question/vectorEngine.service';
import express, { Request, Response } from 'express'; 
import { vettingService } from '../../services/question/vetting.service';
import { PatternQuestionPipeline } from "../../services/question/pattern-question.pipeline";
import { requireScrapingAccess } from "../../middlewares/scrapingAuth.middleware";
import { PatternService } from "../../services/patterns/pattern.service"; //  ADD THIS LINE
import { PrismaClient } from '@prisma/client';
import { PatternExtractionResponse, PatternQuestionGenResponse } from "../../types/question.types";
import { secretsMatch } from '../../config/secretCompare';

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
  (req, res, next) => {
    const internalKey = process.env.INTERNAL_SERVICE_KEY;
    // Constant-time compare: this branch skips checkAuth entirely, so a timing oracle
    // here would let an attacker recover the key and self-grant the 'internal' role.
    if (internalKey && secretsMatch(req.headers['x-internal-key'] as string | undefined, internalKey)) {
      (req as any).user = { user_id: 'internal-service', role: 'internal', session_id: 'internal' };
      return next();
    }
    return checkAuth(req as any, res, next);
  },
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
// ========== PATTERN SCRAPING & GENERATION (COMBINED ENDPOINT) ==========
router.post(
  "/pattern-scrape-and-generate",
  checkAuth, // ✅ User token accepted
  async (req: any, res: Response) => { // Use 'any' type to access req.user
    try {
      const { urls, platform, difficulties, limit } = req.body;
      const userId = req.user?.userId || req.user?.id || req.user?.user_id;
      
      console.log("🎯 [PATTERN WORKFLOW] Starting pattern scrape & generate for user:", userId);
      console.log("📥 [STEP 1] URLs:", urls);
      console.log("🎯 [STEP 1] Platform:", platform);
      
      // Validate inputs
      if (!urls || urls.length === 0) {
        return res.status(400).json({
          success: false,
          error: "URLs are required"
        });
      }
      
      if (!platform) {
        return res.status(400).json({
          success: false,
          error: "Platform is required"
        });
      }
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User authentication required - unable to identify user"
        });
      }
      
      // ✅ Step 1: Call Python service to extract patterns
      console.log("📥 [STEP 1] Calling Python pattern extraction service...");
      
      const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
      
      const pythonResponse = await fetch(`${AI_SERVICE_URL}/extract-patterns-from-urls`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          urls,
          platform,
        }),
      });
      
      if (!pythonResponse.ok) {
        const errorText = await pythonResponse.text();
        throw new Error(`Python service error (${pythonResponse.status}): ${errorText}`);
      }
      
      const pythonData = await pythonResponse.json() as PatternExtractionResponse;

      console.log("📊 [STEP 1] Python response:", {
        success: pythonData.success,
        patterns: pythonData.patterns?.length || 0,
      });
      
      if (!pythonData.success) {
        throw new Error(pythonData.error || "Pattern extraction failed");
      }
      
      if (!pythonData.patterns || pythonData.patterns.length === 0) {
        return res.json({
          success: false,
          error: "No patterns could be extracted from the provided URLs",
          extraction: {
            total_urls: pythonData.total_urls || urls.length,
            patterns_extracted: 0,
          },
        });
      }
      
      // ✅ Step 2: Save patterns to database
      console.log("💾 [STEP 2] Saving patterns to database...");
      
      const patternService = new PatternService();
      
      const saveResult = await patternService.upsertMany(pythonData.patterns);
      
      console.log(`✅ [STEP 2] Saved ${saveResult.upserted} patterns to database`);
      
      // ✅ Step 3: Generate questions from patterns FOR USER (Using existing controller)
      console.log("🤖 [STEP 3] Generating questions from patterns for user:", userId);
      
      // Use the existing QuestionService from controller instead of creating new PrismaClient
      const userGenerateResult = await controller.generateQuestionsFromPatternsForUser({
        patterns: pythonData.patterns,
        userId,
        difficulties: difficulties || ["easy", "medium", "hard"],
        limit: limit || pythonData.patterns.length * 3,
      });
      
      console.log("✅ [STEP 3] Question generation complete:", userGenerateResult);
      
      return res.json({
        success: true,
        message: "Pattern scrape & generate workflow completed",
        extraction: {
          total_urls: pythonData.total_urls || urls.length,
          patterns_extracted: pythonData.patterns?.length || 0,
          successful_extractions: pythonData.successful_extractions || pythonData.patterns?.length || 0,
          failed_extractions: pythonData.failed_extractions || 0,
        },
        storage: {
          patterns_saved: saveResult.upserted,
        },
        generation: userGenerateResult,
        user: userId,
      });
      
    } catch (e: any) {
      console.error("❌ [PATTERN WORKFLOW] Error:", e);
      return res.status(500).json({ 
        success: false, 
        error: e?.message || "Pattern workflow failed",
        details: process.env.NODE_ENV === 'development' ? e?.stack : undefined,
      });
    }
  }
);

// Helper function to generate questions for a specific user
async function generateQuestionsForUser(params: {
  patterns: any[];
  userId: string;
  difficulties: ("easy" | "medium" | "hard")[];
  limit: number;
}) {
  const { patterns, userId, difficulties, limit } = params;
  const prisma = new PrismaClient();
  
  let created = 0;
  let skipped = 0;
  let failed = 0;
  const createdQuestionIds: string[] = [];
  
  // Limit the number of patterns to process
  const patternsToProcess = patterns.slice(0, Math.min(patterns.length, limit));
  
  console.log(`👤 [USER GENERATION] Creating questions for user ${userId} from ${patternsToProcess.length} patterns`);
  
  for (const pattern of patternsToProcess) {
    try {
      // Generate question variations for each difficulty
      for (const difficulty of difficulties) {
        try {
          // Call AI service to generate a question from this pattern
          const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
          
          const response = await fetch(`${AI_SERVICE_URL}/generate-question-from-pattern`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              pattern,
              difficulty,
              user_context: `Generate for user ${userId}`,
            }),
          });
          
          if (!response.ok) {
            console.error(`❌ [AI SERVICE] Failed to generate question for pattern: ${pattern.source_id}`);
            failed++;
            continue;
          }
          
          const aiData = await response.json() as PatternQuestionGenResponse;

          if (!aiData.success || !aiData.question) {
            console.error(`❌ [AI SERVICE] Invalid response for pattern: ${pattern.source_id}`);
            failed++;
            continue;
          }
          
          // Create question in database FOR THE USER
          const questionData = {
            title: aiData.question.title || `Pattern-based: ${pattern.pattern} (${difficulty})`,
            description: aiData.question.description || "Generated from pattern analysis",
            problemStatement: aiData.question.problem_statement || "",
            difficulty: difficulty,
            skillTags: pattern.tags || [],
            type: "coding",
            status: "pending_review", // User questions start as pending
            createdBy: userId, // Link to user
            aiGenerated: true,
            source: "pattern_generation_user",
            isLibraryQuestion: false, // NOT library question
            generatedFromPattern: true,
            patternKey: pattern.pattern,
            patternDifficultyVariant: difficulty,
            canonicalSolution: aiData.question.solution || "",
            testCases: aiData.question.test_cases || {},
            metadata: {
              pattern_source: pattern.source,
              pattern_id: pattern.source_id,
              generated_at: new Date().toISOString(),
              for_user: userId,
            },
          };
          
          // Check for duplicates before creating
          const existingQuestion = await prisma.question.findFirst({
            where: {
              title: {
                equals: questionData.title,
                mode: 'insensitive'
              },
              createdBy: userId // Only check user's questions
            }
          });
          
          if (existingQuestion) {
            console.log(`⚠️ [DUPLICATE] Skipping duplicate question for user ${userId}: ${questionData.title}`);
            skipped++;
            continue;
          }
          
          // Create the question
          const question = await prisma.question.create({
            data: questionData
          });
          
          created++;
          createdQuestionIds.push(question.id);
          
          console.log(`✅ [CREATED] Question "${questionData.title}" for user ${userId}`);
          
        } catch (patternError: any) {
          console.error(`❌ [PATTERN PROCESSING] Error for pattern ${pattern.source_id}:`, patternError.message);
          failed++;
        }
      }
    } catch (error: any) {
      console.error(`❌ [GENERATION] Failed to process pattern:`, error.message);
      failed++;
    }
  }
  
  await prisma.$disconnect();
  
  return {
    created,
    skipped,
    failed,
    difficultyVariants: difficulties,
    userQuestions: created,
    questionIds: createdQuestionIds,
  };
}
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
