import { Request, Response } from 'express';
import { QuestionService } from '../../services/question/Question.service';
import { QuestionGeneratorService } from '../../services/question/QuestionGenerator.service';
import { aiQuestionGenerationService } from '../../services/ai/ai-question-generation.service'; 
import { 
  ScrapingServiceResponse, 
  ScrapingServiceHealth,
  ScrapedQuestionData,
  ScrapingJobResponse,      //  NOUVEAU
  ScrapedProblemsResponse,  //  NOUVEAU
  ScrapedProblem ,           //  NOUVEAU
  MCQGenerationResponse,        // ADD THIS
  MCQBatchGenerationResponse,   // ADD THIS
  LeetCodeTestResponse,
  LeetCodeScrapeResponse,
  LeetCodeBatchScrapeResponse,
   VariationGenerationRequest,
  VariationQuestionData,
  VariationGenerationResponse,
  VariabilityAnalysisResponse

} from '../../types/question.types';
import { vettingService, VettingQuestionPayload } from '../../services/question/vetting.service';
import { vectorEngineService } from '../../services/question/vectorEngine.service';
export class QuestionController {
  public questionService: QuestionService;
  private generatorService: QuestionGeneratorService;

  constructor() {
    this.questionService = new QuestionService();
    this.generatorService = new QuestionGeneratorService();
    console.log('🎯 QuestionController initialized');
  }

  // GET /api/questions
  async getAllQuestions(req: Request, res: Response) {
    console.log('🎯 [CONTROLLER] getAllQuestions called');
    try {
      const filters = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        difficulty: req.query.difficulty as string,
        status: req.query.status as string,
        search: req.query.search as string
      };

      const result = await this.questionService.getAllQuestions(filters);

      res.json({ 
        success: true, 
        questions: result.data,
        pagination: result.pagination
      });
    } catch (error: any) {
      console.error('Error fetching questions:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // GET /api/questions/:id
  async getQuestionById(req: Request, res: Response) {
    console.log('🎯 [CONTROLLER] getQuestionById called with id:', req.params.id);
    try {
      const question = await this.questionService.getQuestionById(req.params.id);
      
      if (!question) {
        console.log('🎯 [CONTROLLER] Question not found');
        return res.status(404).json({ 
          success: false, 
          error: 'Question not found' 
        });
      }

      console.log('🎯 [CONTROLLER] Returning question');
      res.json({ success: true, question });
    } catch (error: any) {
      console.error('🎯 [CONTROLLER] getQuestionById error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // POST /api/questions
async createQuestion(req: Request, res: Response) {
  console.log('📝 [CONTROLLER] createQuestion called');
  
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    //  STEP 1: Check for duplicates using vector engine
    console.log('🔍 [CONTROLLER] Checking similarity with vector engine...');
    const similarityCheck = await vectorEngineService.checkSimilarity(req.body);
    
    //  STEP 2: If high similarity risk, prevent creation or warn
    if (similarityCheck.duplication_risk === 'high' && similarityCheck.similar_questions_found > 0) {
      return res.status(400).json({
        success: false,
        error: 'Duplicate question detected',
        details: 'This question is very similar to existing questions',
        code: 'DUPLICATE_QUESTION',
        similarityCheck: similarityCheck
      });
    }

    //  STEP 3: Create the question in database
    const question = await this.questionService.createQuestion({
      ...req.body,
      createdBy: userId,
      aiGenerated: false,
      source: 'manual'
    });

    console.log('💾 [CONTROLLER] Question created:', question.id);

    // ✅ STEP 4: Store in vector database
    console.log('💾 [CONTROLLER] Storing question in vector database...');
    const vectorResult = await vectorEngineService.storeQuestion(question);
    
    if (vectorResult.success) {
      // ✅ STEP 5: Update question with vector storage status
      const updatedQuestion = await this.questionService.updateQuestion(question.id, {
        vectorStored: true,
        vectorId: vectorResult.question_id
      });
      
      console.log('✅ [CONTROLLER] Question stored in vector DB');

      res.json({ 
        success: true, 
        question: updatedQuestion,
        similarityCheck: similarityCheck,
        vectorStorage: vectorResult,
        message: 'Question created and stored in vector database'
      });
      
    } else {
      // If vector storage fails, still return success but with warning
      console.log('⚠️ [CONTROLLER] Vector storage failed:', vectorResult.message);
      
      res.json({ 
        success: true, 
        question: question,
        similarityCheck: similarityCheck,
        vectorStorage: vectorResult,
        message: 'Question created but vector storage failed'
      });
    }
    
  } catch (error: any) {
    console.error('❌ [CONTROLLER] createQuestion ERROR:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

  // PUT /api/questions/:id
  async updateQuestion(req: Request, res: Response) {
    try {
      const question = await this.questionService.updateQuestion(
        req.params.id, 
        req.body
      );
      res.json({ success: true, question });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // DELETE /api/questions/:id
  async deleteQuestion(req: Request, res: Response) {
    try {
      await this.questionService.deleteQuestion(req.params.id);
      res.json({ 
        success: true, 
        message: 'Question deleted successfully' 
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // PATCH /api/questions/:id/approve
  async approveQuestion(req: Request, res: Response) {
    console.log('🎯 [CONTROLLER] approveQuestion called with id:', req.params.id);
    try {
      const question = await this.questionService.approveQuestion(req.params.id);
      res.json({ success: true, question });
    } catch (error: any) {
      console.error('🎯 [CONTROLLER] approveQuestion error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // PATCH /api/questions/:id/reject - CORRIGÉ
  async rejectQuestion(req: Request, res: Response): Promise<void> {
    console.log('🎯 [CONTROLLER] rejectQuestion called with id:', req.params.id);
    try {
      const { id } = req.params;
      
      if (!id) {
        console.log('🎯 [CONTROLLER] Missing ID in reject');
        res.status(400).json({ 
          success: false, 
          error: 'Question ID is required' 
        });
        return;
      }

      console.log('🎯 [CONTROLLER] Calling service.rejectQuestion...');
      const question = await this.questionService.rejectQuestion(id);
      
      console.log('🎯 [CONTROLLER] Reject successful');
      res.json({
        success: true,
        question,
        message: 'Question rejected successfully'
      });
    } catch (error: any) {
      console.error('🎯 [CONTROLLER] rejectQuestion ERROR:', error);
      
      if (error.code === 'P2025') {
        res.status(404).json({ 
          success: false, 
          error: 'Question not found' 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    }
  } // ← ACCOLADE FERMANTE AJOUTÉE ICI !

  // POST /api/questions/generate
  /*
  async generateQuestion(req: Request, res: Response) {
    try {
      const { topic, difficulty = 'medium' } = req.body;
      
      if (!topic) {
        return res.status(400).json({ 
          success: false, 
          error: 'Topic is required' 
        });
      }

      // Generate question data using AI
      const questionData = await this.generatorService.generateCodingQuestion(
        topic, 
        difficulty
      );
      
      // Save to database
      const question = await this.questionService.createQuestion({
        ...questionData,
        status: 'pending_review',
        aiGenerated: true,
        source: 'ai_generated'
      });

      res.json({ success: true, question });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }*/

  // GET /api/questions/stats/overview
  async getStats(req: Request, res: Response) {
    try {
      const stats = await this.questionService.getQuestionStats();
      res.json({ success: true, stats });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // POST /api/questions/bulk/approve
  async bulkApprove(req: Request, res: Response) {
    try {
      const { ids } = req.body;
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Question IDs array required' 
        });
      }

      const count = await this.questionService.bulkApprove(ids);
      res.json({ 
        success: true, 
        message: `${count} questions approved` 
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // POST /api/questions/bulk/delete
  async bulkDelete(req: Request, res: Response) {
    try {
      const { ids } = req.body;
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Question IDs array required' 
        });
      }

      const count = await this.questionService.bulkDelete(ids);
      res.json({ 
        success: true, 
        message: `${count} questions deleted` 
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
  // ========================================
  //  NOUVELLES MÉTHODES AI
  // ========================================

  /**
   * Health check du AI service
   */
  async checkAIQuestionServiceHealth(req: Request, res: Response) {
    console.log('[CONTROLLER] checkAIQuestionServiceHealth called');
    
    try {
      const health = await aiQuestionGenerationService.checkHealth();
      res.json({
        success: true,
        service: 'AI Question Generation',
        status: health
      });
    } catch (error: any) {
      res.status(503).json({
        success: false,
        error: 'AI Question Generation service health check failed',
        details: error.message
      });
    }
  }

  /**
   * Génère une seule question via AI
   */
// Dans QuestionController - méthodes generateQuestion et generateBatchQuestions

/**
 * Génère une seule question via AI
 */
/**
 * Génère une seule question via AI
 */
async generateQuestion(req: Request, res: Response) {
  console.log('🤖 [CONTROLLER] generateQuestion called');
  console.log('👤 [CONTROLLER] req.user:', req.user);

  try {
    const { topic, difficulty } = req.body;
    const userId = req.user?.user_id;

    if (!userId) {
      console.log('❌ [CONTROLLER] User not authenticated for AI generation');
      return res.status(401).json({
        success: false,
        error: 'Authentication required for AI question generation',
        details: 'Please log in to generate AI questions'
      });
    }

    console.log('✅ [CONTROLLER] User authenticated:', userId);

    if (!topic) {
      return res.status(400).json({
        success: false,
        error: 'Topic is required'
      });
    }

    console.log('🤖 [CONTROLLER] Calling AI service...');

    const aiResponse = await aiQuestionGenerationService.generateQuestion({
      topic,
      difficulty: difficulty || 'medium'
    });

    if (!aiResponse.success || !aiResponse.question) {
      throw new Error('AI generation failed: ' + (aiResponse.error || 'Unknown error'));
    }

    console.log('✅ [CONTROLLER] AI generation successful');
    console.log('📝 [CONTROLLER] Question:', aiResponse.question.title);

    // ✅ VECTOR ENGINE: Check similarity for AI-generated question
    console.log('🔍 [CONTROLLER] Checking similarity with vector engine...');
    const similarityCheck = await vectorEngineService.checkSimilarity(aiResponse.question);
    
    // ✅ Prevent creation if high similarity risk
    if (similarityCheck.duplication_risk === 'high' && similarityCheck.similar_questions_found > 0) {
      return res.status(400).json({
        success: false,
        error: 'AI generated a duplicate question',
        details: 'The AI generated a question very similar to existing ones',
        similarityCheck: similarityCheck
      });
    }

    // Save to database
    const savedQuestion = await this.questionService.createQuestion({
      title: aiResponse.question.title,
      description: aiResponse.question.explanation,
      problemStatement: aiResponse.question.problemStatement,
      difficulty: aiResponse.question.difficulty as 'easy' | 'medium' | 'hard',
      skillTags: aiResponse.question.skillTags,
      type: 'coding',
      canonicalSolution: aiResponse.question.canonicalSolution,
      testCases: aiResponse.question.testCases,
      status: 'draft',
      aiGenerated: true,
      source: 'ai_gemini',
      createdBy: userId
    });

    console.log('💾 [CONTROLLER] Question saved:', savedQuestion.id);

    // ✅ VECTOR ENGINE: Store in vector database
    console.log('💾 [CONTROLLER] Storing question in vector database...');
    const vectorResult = await vectorEngineService.storeQuestion(savedQuestion);
    
    let finalQuestion = savedQuestion;
    
    if (vectorResult.success) {
      // Update question with vector storage status
      finalQuestion = await this.questionService.updateQuestion(savedQuestion.id, {
        vectorStored: true,
        vectorId: vectorResult.question_id
      });
      console.log('✅ [CONTROLLER] AI question stored in vector DB');
    } else {
      console.log('⚠️ [CONTROLLER] Vector storage failed:', vectorResult.message);
    }

    res.status(201).json({
      success: true,
      message: 'Question generated and saved successfully',
      question: finalQuestion,
      similarityCheck: similarityCheck,
      vectorStorage: vectorResult
    });

  } catch (error: any) {
    console.error('❌ [CONTROLLER] generateQuestion ERROR:', error.message);
    
    if (error.message.includes('AI service is not available')) {
      return res.status(503).json({
        success: false,
        error: 'AI Question Generation service is currently unavailable',
        details: 'Please ensure the Python service is running on port 8000'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to generate question',
      details: error.message
    });
  }
}
/**
 * Generate question WITH automatic diagram if needed
 * Route: POST /api/questions/generate-with-diagram
 */
async generateQuestionWithDiagram(req: Request, res: Response): Promise<void> {  //  ADD `: Promise<void>`
  console.log('🎨 [CONTROLLER] generateQuestionWithDiagram called');
  console.log('👤 [CONTROLLER] req.user:', req.user);

  try {
    const { topic, difficulty } = req.body;
    const userId = req.user?.user_id;

    if (!userId) {
      console.log('❌ [CONTROLLER] User not authenticated for diagram generation');
      return res.status(401).json({  // ✅ ADD `return`
        success: false,
        error: 'Authentication required for diagram question generation'
      });
    }

    if (!topic) {
      return res.status(400).json({  // ✅ ADD `return`
        success: false,
        error: 'Topic is required'
      });
    }

    console.log('🎨 [CONTROLLER] Calling Python diagram service...');
    console.log('📋 [CONTROLLER] Topic:', topic, 'Difficulty:', difficulty || 'medium');

    // Call Python AI service with diagram support
    const diagramResponse = await fetch('http://localhost:8000/generate-with-diagram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic,
        difficulty: difficulty || 'medium'
      })
    });

    if (!diagramResponse.ok) {
      throw new Error(`Diagram service returned ${diagramResponse.status}`);
    }

    const diagramData = await diagramResponse.json();
    console.log('✅ [CONTROLLER] Diagram generation response received');

    if (!diagramData.success || !diagramData.question) {
      throw new Error(diagramData.error || 'Question generation failed');
    }

    // ✅ VECTOR ENGINE: Check similarity
    console.log('🔍 [CONTROLLER] Checking similarity with vector engine...');
    const similarityCheck = await vectorEngineService.checkSimilarity(diagramData.question);
    
    if (similarityCheck.duplication_risk === 'high' && similarityCheck.similar_questions_found > 0) {
      return res.status(400).json({  //  ADD `return`
        success: false,
        error: 'Duplicate question detected',
        details: 'Generated question is very similar to existing ones',
        similarityCheck: similarityCheck
      });
    }

    // Prepare question data with diagram fields
    const questionData: any = {
      title: diagramData.question.title,
      description: diagramData.question.explanation,
      problemStatement: diagramData.question.problemStatement,
      difficulty: diagramData.question.difficulty as 'easy' | 'medium' | 'hard',
      skillTags: diagramData.question.skillTags,
      type: 'coding',
      canonicalSolution: diagramData.question.canonicalSolution,
      testCases: diagramData.question.testCases,
      status: 'draft',
      aiGenerated: true,
      source: 'ai_gemini_diagram',
      createdBy: userId,
      
      //  NEW: Diagram fields
      hasDiagram: diagramData.diagram?.needed || false,
      diagramType: diagramData.diagram?.type || null,
      diagramCode: diagramData.diagram?.code || null,
      diagramImageUrl: diagramData.diagram?.imageUrl || null,
      diagramMetadata: diagramData.diagram ? {
        confidence: diagramData.diagram.confidence,
        reason: diagramData.diagram.reason,
        generatedAt: new Date().toISOString()
      } : null
    };

    // Save to database
    const savedQuestion = await this.questionService.createQuestion(questionData);

    console.log(' [CONTROLLER] Question saved with diagram:', savedQuestion.id);
    console.log(' [CONTROLLER] Has diagram:', savedQuestion.hasDiagram);
    console.log(' [CONTROLLER] Diagram type:', savedQuestion.diagramType);

    //  VECTOR ENGINE: Store in vector database
    console.log('[CONTROLLER] Storing question in vector database...');
    const vectorResult = await vectorEngineService.storeQuestion(savedQuestion);
    
    let finalQuestion = savedQuestion;
    
    if (vectorResult.success) {
      finalQuestion = await this.questionService.updateQuestion(savedQuestion.id, {
        vectorStored: true,
        vectorId: vectorResult.question_id
      });
      console.log(' [CONTROLLER] Question stored in vector DB');
    } else {
      console.log(' [CONTROLLER] Vector storage failed:', vectorResult.message);
    }

    res.status(201).json({
      success: true,
      message: diagramData.diagram?.needed 
        ? `Question generated with ${diagramData.diagram.type} diagram`
        : 'Question generated (no diagram needed)',
      question: finalQuestion,
      diagram: diagramData.diagram || null,
      similarityCheck: similarityCheck,
      vectorStorage: vectorResult,
      metadata: diagramData.metadata
    });

  } catch (error: any) {
    console.error('❌ [CONTROLLER] generateQuestionWithDiagram ERROR:', error.message);
    
    if (error.message.includes('service returned')) {
      return res.status(503).json({  // ✅ ADD `return`
        success: false,
        error: 'Diagram Generation service is currently unavailable',
        details: 'Please ensure the Python service is running on port 8000'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to generate question with diagram',
      details: error.message
    });
  }
}

/**
 * Check diagram service health
 * Route: GET /api/questions/diagram-service/health
 */
async checkDiagramServiceHealth(req: Request, res: Response): Promise<void> {  //  ADD `: Promise<void>`
  console.log('🎨 [CONTROLLER] checkDiagramServiceHealth called');
  
  try {
    const healthResponse = await fetch('http://localhost:8000/health');
    
    if (!healthResponse.ok) {
      throw new Error(`Service returned ${healthResponse.status}`);
    }

    const healthData = await healthResponse.json();
    
    // Check if diagram generation is available
    const diagramAvailable = healthData.services?.diagram_generation_available || false;
    
    res.json({
      success: true,
      service: 'Diagram Generation Service',
      status: healthResponse.ok ? 'healthy' : 'unhealthy',
      diagram_generation_available: diagramAvailable,
      services: healthData.services
    });

  } catch (error: any) {
    console.error('❌ [CONTROLLER] Diagram service health check error:', error.message);
    res.status(503).json({
      success: false,
      service: 'Diagram Generation Service',
      status: 'unavailable',
      diagram_generation_available: false,
      error: error.message
    });
  }
}

/**
 * Get diagram details for a question
 * Route: GET /api/questions/:id/diagram
 */
async getQuestionDiagram(req: Request, res: Response): Promise<void> {  
  console.log('🎨 [CONTROLLER] getQuestionDiagram called for:', req.params.id);
  
  try {
    const question = await this.questionService.getQuestionById(req.params.id);
    
    if (!question) {
      return res.status(404).json({ 
        success: false,
        error: 'Question not found'
      });
    }

    if (!question.hasDiagram) {
      return res.status(404).json({ 
        success: false,
        error: 'No diagram available for this question'
      });
    }

    res.json({
      success: true,
      diagram: {
        type: question.diagramType,
        code: question.diagramCode,
        imageUrl: question.diagramImageUrl,
        metadata: question.diagramMetadata
      }
    });

  } catch (error: any) {
    console.error('❌ [CONTROLLER] getQuestionDiagram ERROR:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get diagram',
      details: error.message
    });
  }
}
/**
 * Génère plusieurs questions en batch
 */
/**
 * Génère plusieurs questions en batch
 */
async generateBatchQuestions(req: Request, res: Response) {
  console.log('🤖 [CONTROLLER] generateBatchQuestions called');
  console.log('👤 [CONTROLLER] req.user:', req.user);

  try {
    const { topics, difficulty, countPerTopic } = req.body;
    const userId = req.user?.user_id;

    if (!userId) {
      console.log('❌ [CONTROLLER] User not authenticated for batch AI generation');
      return res.status(401).json({
        success: false,
        error: 'Authentication required for AI batch question generation',
        details: 'Please log in to generate AI questions'
      });
    }

    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Topics array is required'
      });
    }

    console.log('✅ [CONTROLLER] User authenticated:', userId);
    console.log('🤖 [CONTROLLER] Generating batch for topics:', topics);

    const result = await aiQuestionGenerationService.generateBatchQuestions(
      topics,
      difficulty || 'medium',
      countPerTopic || 2
    );

    if (!result.success || !result.questions) {
      throw new Error('Batch generation failed: ' + (result.error || 'Unknown error'));
    }

    console.log('✅ [CONTROLLER] Batch generation successful');
    console.log('📝 [CONTROLLER] Generated', result.questions.length, 'questions');

    const savedQuestions = [];
    const vectorResults = [];
    const errors = [];

    for (const [index, question] of result.questions.entries()) {
      try {
        console.log(`🔍 [CONTROLLER] Checking similarity for question ${index + 1}...`);
        
        // ✅ VECTOR ENGINE: Check similarity for each question
        const similarityCheck = await vectorEngineService.checkSimilarity(question);
        
        // Skip if high similarity risk
        if (similarityCheck.duplication_risk === 'high' && similarityCheck.similar_questions_found > 0) {
          console.log(`⏭️ [CONTROLLER] Skipped duplicate question: ${question.title}`);
          errors.push({
            index,
            title: question.title,
            error: 'High similarity with existing questions'
          });
          continue;
        }

        const saved = await this.questionService.createQuestion({
          title: question.title,
          description: question.explanation,
          problemStatement: question.problemStatement,
          difficulty: question.difficulty as 'easy' | 'medium' | 'hard',
          skillTags: question.skillTags,
          type: 'coding',
          canonicalSolution: question.canonicalSolution,
          testCases: question.testCases,
          status: 'draft',
          aiGenerated: true,
          source: 'ai_gemini',
          createdBy: userId
        });

        // ✅ VECTOR ENGINE: Store in vector database
        console.log(`💾 [CONTROLLER] Storing question ${index + 1} in vector database...`);
        const vectorResult = await vectorEngineService.storeQuestion(saved);
        
        if (vectorResult.success) {
          const updatedQuestion = await this.questionService.updateQuestion(saved.id, {
            vectorStored: true,
            vectorId: vectorResult.question_id
          });
          savedQuestions.push(updatedQuestion);
          vectorResults.push({ ...vectorResult, questionId: saved.id });
          console.log(`✅ [CONTROLLER] Saved and vectorized: ${updatedQuestion.title}`);
        } else {
          savedQuestions.push(saved);
          vectorResults.push({ ...vectorResult, questionId: saved.id });
          console.log(`⚠️ [CONTROLLER] Saved but vector storage failed: ${saved.title}`);
        }

      } catch (error: any) {
        console.error(`❌ [CONTROLLER] Error processing question ${index}:`, error.message);
        errors.push({
          index,
          title: question.title,
          error: error.message
        });
      }
    }

    console.log('💾 [CONTROLLER] Batch processing completed');
    console.log(`✅ Saved: ${savedQuestions.length}, ❌ Errors: ${errors.length}`);

    const vectorSuccessCount = vectorResults.filter(r => r.success).length;

    res.status(201).json({
      success: true,
      message: `Generated ${result.questions.length} questions, saved ${savedQuestions.length} to database`,
      count: savedQuestions.length,
      vectorized_count: vectorSuccessCount,
      questions: savedQuestions,
      vector_results: vectorResults,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('❌ [CONTROLLER] generateBatchQuestions ERROR:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate batch questions',
      details: error.message
    });
  }
}
// Update the scraping methods in your controller

/**
 * Health check for scraping service
 */
async checkScrapeServiceHealth(req: Request, res: Response) {
  console.log('🌐 [CONTROLLER] checkScrapeServiceHealth called');
  
  try {
    const response = await fetch('http://localhost:8000/api/scrape-service/health');
    const health = await response.json() as ScrapingServiceHealth;
    
    res.json({
      success: true,
      service: 'Web Scraping Service',
      status: health.status
    });
  } catch (error: any) {
    res.status(503).json({
      success: false,
      error: 'Web Scraping service health check failed',
      details: error.message
    });
  }
}

/**
 * Scrape questions from coding platforms via AI service
 */
async scrapeQuestions(req: Request, res: Response) {
  console.log('🌐 [CONTROLLER] scrapeQuestions called');
  console.log('👤 [CONTROLLER] req.user:', req.user);

  try {
    const { urls, platform } = req.body;
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required for web scraping'
      });
    }

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'URLs array is required'
      });
    }

    console.log('🌐 [CONTROLLER] Calling Python scraping service...');
    console.log('📋 [CONTROLLER] URLs to scrape:', urls);

    // Call Python scraping service
    const scrapeResponse = await fetch('http://localhost:8000/api/scrape-questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        urls, 
        platform 
      })
    });

    console.log('📡 [CONTROLLER] Python service response status:', scrapeResponse.status);

    if (!scrapeResponse.ok) {
      throw new Error(`Scraping service returned ${scrapeResponse.status}`);
    }

    const scrapeData = await scrapeResponse.json() as ScrapingServiceResponse;
    console.log('📦 [CONTROLLER] Python service response:', scrapeData);

    if (!scrapeData.success) {
      throw new Error(scrapeData.error || 'Scraping service failed');
    }

    console.log('✅ [CONTROLLER] Scraping successful, saving questions...');
    console.log(`📝 [CONTROLLER] Scraped ${scrapeData.questions?.length || 0} questions`);

    // Save scraped questions to database
    const savedQuestions = [];
    const vectorResults = [];
    const errors = [];

    if (scrapeData.questions && Array.isArray(scrapeData.questions)) {
      for (const [index, questionData] of scrapeData.questions.entries()) {
        try {
          console.log(`💾 [CONTROLLER] Processing question ${index + 1}:`, questionData.title);

          // ✅ FIX: Convert ScrapedQuestionData to Question-compatible format for vector engine
          const vectorCompatibleData = {
            id: undefined, // Will be generated by database
            title: questionData.title,
            description: questionData.description,
            problemStatement: questionData.problemStatement,
            difficulty: questionData.difficulty || 'medium',
            skillTags: questionData.skillTags || [],
            type: questionData.type || 'coding',
            canonicalSolution: questionData.canonicalSolution,
            testCases: questionData.testCases,
            // ✅ FIX: Convert MCQOptions to plain object for vector engine
            options: questionData.options ? {
              A: questionData.options.A || '',
              B: questionData.options.B || '',
              C: questionData.options.C || '',
              D: questionData.options.D || ''
            } : undefined,
            correctAnswer: questionData.correctAnswer,
            explanation: questionData.explanation,
            source: questionData.platform || 'web_scraped'
          };

          // ✅ VECTOR ENGINE: Check similarity for scraped question
          console.log(`🔍 [CONTROLLER] Checking similarity for scraped question...`);
          const similarityCheck = await vectorEngineService.checkSimilarity(vectorCompatibleData);
          
          // Skip if high similarity risk
          if (similarityCheck.duplication_risk === 'high' && similarityCheck.similar_questions_found > 0) {
            console.log(`⏭️ [CONTROLLER] Skipped duplicate scraped question: ${questionData.title}`);
            errors.push({
              index,
              title: questionData.title,
              error: 'High similarity with existing questions'
            });
            continue;
          }

          // Prepare the question data for database
          const questionToSave = {
            title: questionData.title,
            description: questionData.description || `Scraped from ${questionData.platform || 'unknown platform'}`,
            problemStatement: questionData.problemStatement,
            difficulty: (questionData.difficulty as 'easy' | 'medium' | 'hard') || 'medium',
            skillTags: questionData.skillTags || [questionData.platform || 'coding'],
            type: questionData.type || 'coding',
            canonicalSolution: questionData.canonicalSolution || `# Solution placeholder\n# Source: ${questionData.sourceUrl}`,
            testCases: questionData.testCases || { inputs: [], outputs: [] },
            // ✅ FIX: Convert MCQOptions to Prisma-compatible format
            options: questionData.options ? {
              A: questionData.options.A || '',
              B: questionData.options.B || '',
              C: questionData.options.C || '',
              D: questionData.options.D || ''
            } : undefined,
            correctAnswer: questionData.correctAnswer,
            explanation: questionData.explanation,
            status: 'pending_review' as const,
            createdBy: userId,
            aiGenerated: false,
            source: 'web_scraped' as const
          };

          console.log(`📊 [CONTROLLER] Question data prepared:`, {
            title: questionToSave.title,
            difficulty: questionToSave.difficulty,
            source: questionToSave.source,
            hasOptions: !!questionToSave.options
          });

          // Save to database using your QuestionService
          const saved = await this.questionService.createQuestion(questionToSave);

          // ✅ VECTOR ENGINE: Store scraped question in vector database
          console.log(`💾 [CONTROLLER] Storing scraped question in vector database...`);
          const vectorResult = await vectorEngineService.storeQuestion(saved);
          
          if (vectorResult.success) {
            const updatedQuestion = await this.questionService.updateQuestion(saved.id, {
              vectorStored: true,
              vectorId: vectorResult.question_id
            });
            savedQuestions.push(updatedQuestion);
            vectorResults.push({ ...vectorResult, questionId: saved.id });
            console.log(`✅ [CONTROLLER] Saved and vectorized scraped question:`, updatedQuestion.id);
          } else {
            savedQuestions.push(saved);
            vectorResults.push({ ...vectorResult, questionId: saved.id });
            console.log(`⚠️ [CONTROLLER] Saved scraped question but vector storage failed:`, saved.id);
          }

        } catch (error: any) {
          console.error(`❌ [CONTROLLER] Error saving scraped question ${index}:`, error.message);
          errors.push({
            index,
            title: questionData.title,
            error: error.message
          });
        }
      }
    } else {
      console.log('❌ [CONTROLLER] No questions array in response');
    }

    console.log('💾 [CONTROLLER] Scraping completed');
    console.log(`✅ Saved to DB: ${savedQuestions.length}, ❌ Errors: ${errors.length}`);

    const vectorSuccessCount = vectorResults.filter(r => r.success).length;

    res.status(201).json({
      success: true,
      message: `Scraped ${scrapeData.questions?.length || 0} questions and saved ${savedQuestions.length} to database`,
      scrapingResult: {
        totalUrls: urls.length,
        successfullyScraped: scrapeData.questions?.length || 0,
        successfullySaved: savedQuestions.length,
        vectorizedCount: vectorSuccessCount,
        scrapingFailed: urls.length - (scrapeData.questions?.length || 0),
        savingErrors: errors.length
      },
      questions: savedQuestions,
      vector_results: vectorResults,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('❌ [CONTROLLER] scrapeQuestions ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scrape questions',
      details: error.message
    });
  }
}
/**
 * Importer automatiquement des questions scrapées
 * Route: POST /api/questions/import-scraped
 * Body: { source: "stackoverflow", max_pages: 3 }
 */
async importScrapedQuestions(req: Request, res: Response) {
  console.log('🌐 [CONTROLLER] importScrapedQuestions called');
  console.log('👤 [CONTROLLER] req.user:', req.user);

  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required for scraping import'
      });
    }

    const { source, max_pages } = req.body;
    const sourceToUse = source || 'stackoverflow';
    const maxPagesToUse = max_pages || 3;

    console.log(`🕷️ [CONTROLLER] Starting scraping from ${sourceToUse}`);

    // 1️⃣ Déclencher le scraping sur le service Python
    console.log('📡 [CONTROLLER] Step 1: Trigger scraping job...');
    const scrapeJobResponse = await fetch('http://localhost:8000/scraping/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sources: [sourceToUse],
        max_pages: maxPagesToUse
      })
    });

    if (!scrapeJobResponse.ok) {
      throw new Error(`Scraping service returned ${scrapeJobResponse.status}`);
    }

    // ✅ TYPAGE CORRECT
    const scrapeJobResult = await scrapeJobResponse.json() as ScrapingJobResponse;
    console.log('✅ [CONTROLLER] Scraping job completed:', scrapeJobResult);

    if (!scrapeJobResult.success) {
      throw new Error(scrapeJobResult.error || 'Scraping job failed');
    }

    // 2️⃣ Récupérer les questions scrapées
    console.log('📡 [CONTROLLER] Step 2: Fetching scraped problems...');
    const problemsResponse = await fetch('http://localhost:8000/scraping/problems?limit=100');
    
    if (!problemsResponse.ok) {
      throw new Error(`Failed to fetch scraped problems: ${problemsResponse.status}`);
    }

    // ✅ TYPAGE CORRECT
    const problemsData = await problemsResponse.json() as ScrapedProblemsResponse;
    console.log(`📊 [CONTROLLER] Retrieved ${problemsData.problems?.length || 0} problems`);

    if (!problemsData.problems || problemsData.problems.length === 0) {
      return res.json({
        success: true,
        message: 'Scraping completed but no new questions found',
        imported_count: 0,
        scraping_stats: scrapeJobResult
      });
    }

    // 3️⃣ Transformer et sauvegarder dans la DB
    console.log('💾 [CONTROLLER] Step 3: Saving to database...');
    const importedQuestions = [];
    const skippedQuestions = [];
    const errors = [];

    for (const [index, scrapedProblem] of problemsData.problems.entries()) {
      try {
        // Vérifier les doublons
        const existing = await this.questionService.findByTitle(scrapedProblem.title);
        
        if (existing) {
          skippedQuestions.push(scrapedProblem.title);
          console.log(`⏭️ [CONTROLLER] Skipped duplicate: ${scrapedProblem.title.substring(0, 50)}...`);
          continue;
        }

        // Normaliser les test cases
        const testCases = this.normalizeTestCases(
          scrapedProblem.testCases || scrapedProblem.test_cases
        );

        // Préparer les données pour Prisma
        const questionData = {
          title: scrapedProblem.title || 'Untitled Question',
          description: (scrapedProblem.content || scrapedProblem.description || '').substring(0, 500),
          problemStatement: scrapedProblem.problemStatement || scrapedProblem.content || '',
          difficulty: (scrapedProblem.difficulty || 'medium') as 'easy' | 'medium' | 'hard',
          skillTags: scrapedProblem.skillTags || scrapedProblem.tags || [],
          type: 'coding' as const,
          canonicalSolution: scrapedProblem.canonicalSolution || '// Solution to be provided',
          testCases: testCases,
          status: 'pending_review' as const, 
          createdBy: userId,
          aiGenerated: false,
          source: `web_scraped_${sourceToUse}_${scrapedProblem.language || 'general'}`
        };

        // Sauvegarder
        const saved = await this.questionService.createQuestion(questionData);
        importedQuestions.push(saved);
        
        console.log(`✅ [CONTROLLER] Imported ${index + 1}/${problemsData.problems.length}: ${saved.title.substring(0, 50)}...`);

      } catch (error: any) {
        console.error(`❌ [CONTROLLER] Error importing question ${index}:`, error.message);
        errors.push({
          index,
          title: scrapedProblem.title,
          error: error.message
        });
      }
    }

    // 4️⃣ Retourner le résultat
    console.log('🎉 [CONTROLLER] Import completed!');
    console.log(`✅ Imported: ${importedQuestions.length}`);
    console.log(`⏭️ Skipped: ${skippedQuestions.length}`);
    console.log(`❌ Errors: ${errors.length}`);

    res.json({
      success: true,
      message: `Successfully imported ${importedQuestions.length} questions from ${sourceToUse}`,
      imported_count: importedQuestions.length,
      skipped_count: skippedQuestions.length,
      error_count: errors.length,
      total_scraped: problemsData.problems.length,
      scraping_stats: scrapeJobResult,
      questions: importedQuestions.map(q => ({
        id: q.id,
        title: q.title,
        difficulty: q.difficulty,
        source: q.source,
        skillTags: q.skillTags
      })),
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('❌ [CONTROLLER] importScrapedQuestions ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import scraped questions',
      details: error.message
    });
  }
}
/**
 * Normaliser les test cases pour Prisma
 */
private normalizeTestCases(testCases: any): any[] {
  if (!testCases) {
    return [{ input: 'Sample input', output: 'Expected output' }];
  }

  // Si c'est déjà un array avec input/output
  if (Array.isArray(testCases) && testCases.length > 0) {
    if (testCases[0]?.input && testCases[0]?.output) {
      return testCases;
    }
  }

  // Si c'est un objet avec "examples"
  if (typeof testCases === 'object' && testCases.examples && Array.isArray(testCases.examples)) {
    return testCases.examples.map((ex: any) => ({
      input: ex.input || 'test_input',
      output: ex.output || 'expected_output'
    }));
  }

  // Si c'est un objet avec "inputs" et "outputs"
  if (typeof testCases === 'object' && testCases.inputs && testCases.outputs) {
    const result = [];
    const maxLen = Math.min(
      Array.isArray(testCases.inputs) ? testCases.inputs.length : 0,
      Array.isArray(testCases.outputs) ? testCases.outputs.length : 0
    );
    
    for (let i = 0; i < maxLen; i++) {
      result.push({
        input: testCases.inputs[i] || 'test_input',
        output: testCases.outputs[i] || 'expected_output'
      });
    }
    
    return result.length > 0 ? result : [{ input: 'Sample input', output: 'Expected output' }];
  }

  // Fallback
  return [{ input: 'Sample input', output: 'Expected output' }];
}
// Add these methods to your QuestionController class

/**
 * Generate a single MCQ question via AI
 * Route: POST /api/questions/generate-mcq
 */
/**
 * Generate a single MCQ question via AI
 * Route: POST /api/questions/generate-mcq
 */
async generateMCQQuestion(req: Request, res: Response) {
  console.log('🎯 [CONTROLLER] generateMCQQuestion called');
  console.log('👤 [CONTROLLER] req.user:', req.user);

  try {
    const { topic, difficulty } = req.body;
    const userId = req.user?.user_id;

    if (!userId) {
      console.log('❌ [CONTROLLER] User not authenticated for MCQ generation');
      return res.status(401).json({
        success: false,
        error: 'Authentication required for MCQ generation',
        details: 'Please log in to generate MCQ questions'
      });
    }

    if (!topic) {
      return res.status(400).json({
        success: false,
        error: 'Topic is required'
      });
    }

    console.log('🎯 [CONTROLLER] Calling Python MCQ service...');
    console.log('📋 [CONTROLLER] Topic:', topic, 'Difficulty:', difficulty || 'medium');

    // Call Python AI service for MCQ generation
    const mcqResponse = await fetch('http://localhost:8000/generate/mcq-only', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic,
        difficulty: difficulty || 'medium'
      })
    });

    if (!mcqResponse.ok) {
      throw new Error(`MCQ service returned ${mcqResponse.status}`);
    }

    const mcqData = await mcqResponse.json() as MCQGenerationResponse;
    console.log('✅ [CONTROLLER] MCQ generation successful');

    if (!mcqData.success || !mcqData.question) {
      throw new Error(mcqData.error || 'MCQ generation failed');
    }

    // ✅ VECTOR ENGINE: Check similarity for MCQ
    console.log('🔍 [CONTROLLER] Checking MCQ similarity with vector engine...');
    const similarityCheck = await vectorEngineService.checkSimilarity(mcqData.question);
    
    if (similarityCheck.duplication_risk === 'high' && similarityCheck.similar_questions_found > 0) {
      return res.status(400).json({
        success: false,
        error: 'Duplicate MCQ detected',
        details: 'This MCQ is very similar to existing questions',
        similarityCheck: similarityCheck
      });
    }

    // Save MCQ to database
    const savedQuestion = await this.questionService.createQuestion({
      title: mcqData.question.title,
      description: mcqData.question.description,
      problemStatement: mcqData.question.description,
      difficulty: mcqData.question.difficulty as 'easy' | 'medium' | 'hard',
      skillTags: mcqData.question.skillTags,
      type: 'mcq',
      
      // MCQ-specific fields
      options: mcqData.question.options,
      correctAnswer: mcqData.question.correctAnswer,
      explanation: mcqData.question.explanation,
      
      canonicalSolution: null,
      testCases: null,
      
      status: 'draft',
      aiGenerated: true,
      source: 'ai_gemini_mcq',
      createdBy: userId
    });

    console.log('💾 [CONTROLLER] MCQ saved:', savedQuestion.id);

    // ✅ VECTOR ENGINE: Store MCQ in vector database
    console.log('💾 [CONTROLLER] Storing MCQ in vector database...');
    const vectorResult = await vectorEngineService.storeQuestion(savedQuestion);
    
    let finalQuestion = savedQuestion;
    
    if (vectorResult.success) {
      finalQuestion = await this.questionService.updateQuestion(savedQuestion.id, {
        vectorStored: true,
        vectorId: vectorResult.question_id
      });
      console.log('✅ [CONTROLLER] MCQ stored in vector DB');
    } else {
      console.log('⚠️ [CONTROLLER] MCQ vector storage failed:', vectorResult.message);
    }

    res.status(201).json({
      success: true,
      message: 'MCQ question generated and saved successfully',
      question: finalQuestion,
      similarityCheck: similarityCheck,
      vectorStorage: vectorResult
    });

  } catch (error: any) {
    console.error('❌ [CONTROLLER] generateMCQQuestion ERROR:', error.message);
    
    if (error.message.includes('service returned')) {
      return res.status(503).json({
        success: false,
        error: 'MCQ Generation service is currently unavailable',
        details: 'Please ensure the Python service is running on port 8000'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to generate MCQ question',
      details: error.message
    });
  }
}

/**
 * Generate multiple MCQ questions in batch
 * Route: POST /api/questions/generate-mcq-batch
 */
/**
 * Generate multiple MCQ questions in batch
 * Route: POST /api/questions/generate-mcq-batch
 */
async generateMCQBatch(req: Request, res: Response) {
  console.log('🎯 [CONTROLLER] generateMCQBatch called');
  console.log('👤 [CONTROLLER] req.user:', req.user);

  try {
    const { topics, difficulty, count_per_topic } = req.body;
    const userId = req.user?.user_id;

    if (!userId) {
      console.log('❌ [CONTROLLER] User not authenticated for batch MCQ generation');
      return res.status(401).json({
        success: false,
        error: 'Authentication required for batch MCQ generation'
      });
    }

    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Topics array is required'
      });
    }

    console.log('🎯 [CONTROLLER] Generating MCQ batch for topics:', topics);

    // Call Python AI service for batch MCQ generation
    const batchResponse = await fetch('http://localhost:8000/generate/mcq-batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topics,
        difficulty: difficulty || 'medium',
        count_per_topic: count_per_topic || 5
      })
    });

    if (!batchResponse.ok) {
      throw new Error(`MCQ batch service returned ${batchResponse.status}`);
    }

    const batchData = await batchResponse.json() as MCQBatchGenerationResponse;
    console.log('✅ [CONTROLLER] MCQ batch generation successful');
    console.log('📊 [CONTROLLER] Generated', batchData.generated_count, 'MCQ questions');

    if (!batchData.success || !batchData.questions) {
      throw new Error(batchData.error || 'MCQ batch generation failed');
    }

    // Save all MCQs to database
    const savedQuestions = [];
    const vectorResults = [];
    const errors = [];

    for (const [index, mcqQuestion] of batchData.questions.entries()) {
      try {
        console.log(`🔍 [CONTROLLER] Checking similarity for MCQ ${index + 1}...`);
        
        // ✅ VECTOR ENGINE: Check similarity for each MCQ
        const similarityCheck = await vectorEngineService.checkSimilarity(mcqQuestion);
        
        // Skip if high similarity risk
        if (similarityCheck.duplication_risk === 'high' && similarityCheck.similar_questions_found > 0) {
          console.log(`⏭️ [CONTROLLER] Skipped duplicate MCQ: ${mcqQuestion.title}`);
          errors.push({
            index,
            title: mcqQuestion.title,
            error: 'High similarity with existing questions'
          });
          continue;
        }

        const saved = await this.questionService.createQuestion({
          title: mcqQuestion.title,
          description: mcqQuestion.description,
          problemStatement: mcqQuestion.description,
          difficulty: mcqQuestion.difficulty as 'easy' | 'medium' | 'hard',
          skillTags: mcqQuestion.skillTags,
          type: 'mcq',
          
          // MCQ-specific fields
          options: mcqQuestion.options,
          correctAnswer: mcqQuestion.correctAnswer,
          explanation: mcqQuestion.explanation,
          
          canonicalSolution: null,
          testCases: null,
          
          status: 'draft',
          aiGenerated: true,
          source: 'ai_gemini_mcq',
          createdBy: userId
        });

        // ✅ VECTOR ENGINE: Store MCQ in vector database
        console.log(`💾 [CONTROLLER] Storing MCQ ${index + 1} in vector database...`);
        const vectorResult = await vectorEngineService.storeQuestion(saved);
        
        if (vectorResult.success) {
          const updatedQuestion = await this.questionService.updateQuestion(saved.id, {
            vectorStored: true,
            vectorId: vectorResult.question_id
          });
          savedQuestions.push(updatedQuestion);
          vectorResults.push({ ...vectorResult, questionId: saved.id });
          console.log(`✅ [CONTROLLER] Saved and vectorized MCQ: ${updatedQuestion.title}`);
        } else {
          savedQuestions.push(saved);
          vectorResults.push({ ...vectorResult, questionId: saved.id });
          console.log(`⚠️ [CONTROLLER] Saved MCQ but vector storage failed: ${saved.title}`);
        }

      } catch (error: any) {
        console.error(`❌ [CONTROLLER] Error saving MCQ ${index}:`, error.message);
        errors.push({
          index,
          title: mcqQuestion.title,
          error: error.message
        });
      }
    }

    console.log('💾 [CONTROLLER] Batch MCQ processing completed');
    console.log(`✅ Saved: ${savedQuestions.length}, ❌ Errors: ${errors.length}`);

    const vectorSuccessCount = vectorResults.filter(r => r.success).length;

    res.status(201).json({
      success: true,
      message: `Generated ${batchData.generated_count} MCQs and saved ${savedQuestions.length} to database`,
      generated_count: batchData.generated_count,
      saved_count: savedQuestions.length,
      vectorized_count: vectorSuccessCount,
      failed_count: batchData.failed_count || 0,
      error_count: errors.length,
      questions: savedQuestions,
      vector_results: vectorResults,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('❌ [CONTROLLER] generateMCQBatch ERROR:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate MCQ batch',
      details: error.message
    });
  }
}

/**
 * Health check for LeetCode scraping service
 * Route: GET /api/questions/scrape/leetcode/health
 */
async checkLeetCodeScrapingHealth(req: Request, res: Response) {
  console.log('🔍 [CONTROLLER] checkLeetCodeScrapingHealth called');
  
  try {
    const response = await fetch('http://localhost:8000/scraping/leetcode/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://leetcode.com/problems/two-sum/'
      })
    });

    if (!response.ok) {
      throw new Error(`LeetCode scraping service returned ${response.status}`);
    }

    const data = await response.json() as LeetCodeTestResponse;
    
    res.json({
      success: true,
      service: 'LeetCode Scraping Service',
      status: data.success ? 'healthy' : 'unhealthy',
      test_problem: data.data ? {
        title: data.data.title,
        difficulty: data.data.difficulty,
        description_length: data.data.description_length,
        has_content: data.data.has_content
      } : null
    });

  } catch (error: any) {
    console.error('❌ [CONTROLLER] LeetCode health check error:', error.message);
    res.status(503).json({
      success: false,
      service: 'LeetCode Scraping Service',
      status: 'unavailable',
      error: error.message
    });
  }
}

/**
 * Test LeetCode scraping with a URL (returns data without saving)
 * Route: POST /api/questions/scrape/leetcode/test
 */
async testLeetCodeScraping(req: Request, res: Response) {
  console.log('🧪 [CONTROLLER] testLeetCodeScraping called');
  
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'LeetCode URL is required'
      });
    }

    // Validate URL format
    if (!url.includes('leetcode.com/problems/')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid LeetCode URL. Expected format: https://leetcode.com/problems/problem-name/'
      });
    }

    console.log('📡 [CONTROLLER] Testing LeetCode URL:', url);

    const response = await fetch('http://localhost:8000/scraping/leetcode/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      throw new Error(`LeetCode scraping service returned ${response.status}`);
    }

    const data = await response.json() as LeetCodeTestResponse;
    
    console.log('✅ [CONTROLLER] LeetCode test successful:', data.data?.title);

    res.json({
      success: data.success,
      message: data.message,
      data: data.data
    });

  } catch (error: any) {
    console.error('❌ [CONTROLLER] testLeetCodeScraping error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to test LeetCode scraping',
      details: error.message
    });
  }
}

/**
 * Scrape a single LeetCode problem and save to database
 * Route: POST /api/questions/scrape/leetcode/url
 */
async scrapeLeetCodeByUrl(req: Request, res: Response) {
  console.log('🌐 [CONTROLLER] scrapeLeetCodeByUrl called');
  console.log('👤 [CONTROLLER] req.user:', req.user);

  try {
    const { url } = req.body;
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required for LeetCode scraping'
      });
    }

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'LeetCode URL is required'
      });
    }

    // Validate URL format
    if (!url.includes('leetcode.com/problems/')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid LeetCode URL. Expected format: https://leetcode.com/problems/problem-name/'
      });
    }

    console.log('📡 [CONTROLLER] Scraping LeetCode URL:', url);

    // Call Python scraping service
    const response = await fetch('http://localhost:8000/scraping/leetcode/url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LeetCode scraping failed: ${response.status} - ${errorText}`);
    }

    const scrapeData = await response.json() as LeetCodeScrapeResponse;

    if (!scrapeData.success || !scrapeData.problem) {
      throw new Error(scrapeData.error || 'Failed to scrape LeetCode problem');
    }

    console.log('✅ [CONTROLLER] LeetCode scraping successful:', scrapeData.problem.title);

    // Check for duplicates
    const existingQuestion = await this.questionService.findByTitle(scrapeData.problem.title);
    if (existingQuestion) {
      return res.status(409).json({
        success: false,
        error: 'Question already exists in database',
        existing_id: existingQuestion.id,
        title: existingQuestion.title
      });
    }

    // ✅ VECTOR ENGINE: Check similarity for LeetCode problem
    console.log('🔍 [CONTROLLER] Checking similarity for LeetCode problem...');
    const similarityCheck = await vectorEngineService.checkSimilarity(scrapeData.problem);
    
    if (similarityCheck.duplication_risk === 'high' && similarityCheck.similar_questions_found > 0) {
      return res.status(400).json({
        success: false,
        error: 'Duplicate LeetCode problem detected',
        details: 'This problem is very similar to existing questions',
        similarityCheck: similarityCheck
      });
    }

    // Prepare question data for database
    const questionData = {
      title: scrapeData.problem.title,
      description: scrapeData.problem.description.substring(0, 1000),
      problemStatement: scrapeData.problem.problemStatement,
      difficulty: this.normalizeDifficulty(scrapeData.problem.difficulty),
      skillTags: scrapeData.problem.skillTags || [],
      type: 'coding' as const,
      canonicalSolution: scrapeData.problem.canonicalSolution || '# Solution to be implemented',
      testCases: this.normalizeLeetCodeTestCases(scrapeData.problem.testCases),
      status: 'pending_review' as const,
      createdBy: userId,
      aiGenerated: false,
      source: 'leetcode_scraped'
    };

    // Save to database
    const savedQuestion = await this.questionService.createQuestion(questionData);

    console.log('💾 [CONTROLLER] LeetCode question saved:', savedQuestion.id);

    // ✅ VECTOR ENGINE: Store LeetCode problem in vector database
    console.log('💾 [CONTROLLER] Storing LeetCode problem in vector database...');
    const vectorResult = await vectorEngineService.storeQuestion(savedQuestion);
    
    let finalQuestion = savedQuestion;
    
    if (vectorResult.success) {
      finalQuestion = await this.questionService.updateQuestion(savedQuestion.id, {
        vectorStored: true,
        vectorId: vectorResult.question_id
      });
      console.log('✅ [CONTROLLER] LeetCode problem stored in vector DB');
    } else {
      console.log('⚠️ [CONTROLLER] LeetCode vector storage failed:', vectorResult.message);
    }

    res.status(201).json({
      success: true,
      message: 'LeetCode problem scraped and saved successfully',
      question: finalQuestion,
      similarityCheck: similarityCheck,
      vectorStorage: vectorResult,
      metadata: scrapeData.metadata
    });

  } catch (error: any) {
    console.error('❌ [CONTROLLER] scrapeLeetCodeByUrl error:', error.message);
    
    if (error.message.includes('404')) {
      return res.status(404).json({
        success: false,
        error: 'LeetCode problem not found or access denied (might be premium)',
        details: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to scrape LeetCode problem',
      details: error.message
    });
  }
}

/**
 * Scrape multiple LeetCode problems in batch
 * Route: POST /api/questions/scrape/leetcode/batch
 */
async scrapeLeetCodeBatch(req: Request, res: Response) {
  console.log('🌐 [CONTROLLER] scrapeLeetCodeBatch called');
  console.log('👤 [CONTROLLER] req.user:', req.user);

  try {
    const { urls } = req.body;
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required for batch LeetCode scraping'
      });
    }

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'URLs array is required'
      });
    }

    // Limit batch size
    if (urls.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 20 URLs allowed per batch'
      });
    }

    // Validate all URLs
    const invalidUrls = urls.filter(url => !url.includes('leetcode.com/problems/'));
    if (invalidUrls.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid LeetCode URLs detected',
        invalid_urls: invalidUrls
      });
    }

    console.log('📡 [CONTROLLER] Scraping', urls.length, 'LeetCode URLs...');

    const results = {
      total: urls.length,
      successful: 0,
      failed: 0,
      saved: 0,
      skipped: 0
    };

    const savedQuestions: any[] = [];
    const errors: Array<{ url: string; error: string }> = [];
    const skipped: Array<{ url: string; reason: string }> = [];

    // Process each URL
    for (const [index, url] of urls.entries()) {
      try {
        console.log(`📄 [CONTROLLER] Processing ${index + 1}/${urls.length}: ${url}`);

        // Call Python service for this URL
        const response = await fetch('http://localhost:8000/scraping/leetcode/url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const scrapeData = await response.json() as LeetCodeScrapeResponse;

        if (!scrapeData.success || !scrapeData.problem) {
          throw new Error(scrapeData.error || 'Scraping failed');
        }

        results.successful++;

        // Check for duplicates
        const existing = await this.questionService.findByTitle(scrapeData.problem.title);
        if (existing) {
          results.skipped++;
          skipped.push({
            url,
            reason: `Already exists: ${existing.id}`
          });
          console.log(`⏭️ [CONTROLLER] Skipped duplicate: ${scrapeData.problem.title}`);
          continue;
        }

        // Save to database
        const questionData = {
          title: scrapeData.problem.title,
          description: scrapeData.problem.description.substring(0, 1000),
          problemStatement: scrapeData.problem.problemStatement,
          difficulty: this.normalizeDifficulty(scrapeData.problem.difficulty),
          skillTags: scrapeData.problem.skillTags || [],
          type: 'coding' as const,
          canonicalSolution: scrapeData.problem.canonicalSolution || '# Solution to be implemented',
          testCases: this.normalizeLeetCodeTestCases(scrapeData.problem.testCases),
          status: 'pending_review' as const,
          createdBy: userId,
          aiGenerated: false,
          source: 'leetcode_scraped'
        };

        const saved = await this.questionService.createQuestion(questionData);
        savedQuestions.push(saved);
        results.saved++;

        console.log(`✅ [CONTROLLER] Saved: ${saved.title}`);

        // Rate limiting - wait 1.5 seconds between requests
        await new Promise(resolve => setTimeout(resolve, 1500));

      } catch (error: any) {
        results.failed++;
        errors.push({
          url,
          error: error.message
        });
        console.error(`❌ [CONTROLLER] Error scraping ${url}:`, error.message);
      }
    }

    console.log('🎉 [CONTROLLER] Batch scraping completed');
    console.log(`✅ Successful: ${results.successful}, 💾 Saved: ${results.saved}, ⏭️ Skipped: ${results.skipped}, ❌ Failed: ${results.failed}`);

    res.status(201).json({
      success: true,
      message: `Processed ${results.total} URLs: ${results.saved} saved, ${results.skipped} skipped, ${results.failed} failed`,
      results,
      questions: savedQuestions,
      skipped: skipped.length > 0 ? skipped : undefined,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('❌ [CONTROLLER] scrapeLeetCodeBatch error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to process batch LeetCode scraping',
      details: error.message
    });
  }
}

/**
 * Normalize difficulty to lowercase
 */
private normalizeDifficulty(difficulty: string): 'easy' | 'medium' | 'hard' {
  const normalized = difficulty?.toLowerCase() || 'medium';
  if (['easy', 'medium', 'hard'].includes(normalized)) {
    return normalized as 'easy' | 'medium' | 'hard';
  }
  return 'medium';
}

/**
 * Normalize LeetCode test cases to standard format
 */
private normalizeLeetCodeTestCases(testCases: any): Array<{ input: string; output: string }> {
  if (!testCases) {
    return [{ input: 'Sample input', output: 'Expected output' }];
  }

  // If already in correct format
  if (Array.isArray(testCases) && testCases.length > 0 && testCases[0]?.input !== undefined) {
    return testCases;
  }

  // If it's an object with examples
  if (testCases.examples && Array.isArray(testCases.examples)) {
    return testCases.examples.map((ex: any) => ({
      input: ex.input || '',
      output: ex.output || ''
    }));
  }

  // If it's an object with inputs/outputs arrays
  if (testCases.inputs && testCases.outputs) {
    const result = [];
    const len = Math.min(
      Array.isArray(testCases.inputs) ? testCases.inputs.length : 0,
      Array.isArray(testCases.outputs) ? testCases.outputs.length : 0
    );
    for (let i = 0; i < len; i++) {
      result.push({
        input: String(testCases.inputs[i] || ''),
        output: String(testCases.outputs[i] || '')
      });
    }
    return result.length > 0 ? result : [{ input: 'Sample input', output: 'Expected output' }];
  }

  // If it's a string (raw test cases from LeetCode)
  if (typeof testCases === 'string') {
    const lines = testCases.split('\n').filter((l: string) => l.trim());
    if (lines.length > 0) {
      return [{
        input: lines.join('\n'),
        output: 'Expected output (to be determined)'
      }];
    }
  }

  return [{ input: 'Sample input', output: 'Expected output' }];
}


/**
 * Generate anti-cheat variations for a question
 * Route: POST /api/questions/:id/generate-variations
 */
/**
 * Generate anti-cheat variations for a question
 * Route: POST /api/questions/:id/generate-variations
 */
async generateVariations(req: Request, res: Response) {
  console.log('🔄 [CONTROLLER] generateVariations called');
  console.log('👤 [CONTROLLER] req.user:', req.user);

  try {
    const { id } = req.params;
    const { variation_count = 10, preserve_difficulty = true } = req.body;
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required for variation generation'
      });
    }

    // Get base question from database
    const baseQuestion = await this.questionService.getQuestionById(id);
    if (!baseQuestion) {
      return res.status(404).json({
        success: false,
        error: 'Base question not found'
      });
    }

    console.log('🔄 [CONTROLLER] Generating variations for:', baseQuestion.title);

    // Call Python Variation Engine
    const variationResponse = await fetch('http://localhost:8000/variations/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base_question: {
          id: baseQuestion.id,
          title: baseQuestion.title,
          problemStatement: baseQuestion.problemStatement,
          difficulty: baseQuestion.difficulty,
          // FIX: Use empty object if parameters doesn't exist
          parameters: (baseQuestion as any).parameters || {},
          testCases: baseQuestion.testCases || { examples: [] },
          skillTags: baseQuestion.skillTags,
          type: baseQuestion.type,
          canonicalSolution: baseQuestion.canonicalSolution,
          explanation: baseQuestion.explanation,
          version: '1.0'
        },
        variation_count,
        preserve_difficulty
      })
    });

    if (!variationResponse.ok) {
      throw new Error(`Variation engine returned ${variationResponse.status}`);
    }

    // FIX: Add type assertion here
    const variationData = await variationResponse.json() as VariationGenerationResponse;
    console.log('✅ [CONTROLLER] Variation generation successful');

    if (!variationData.success) {
      throw new Error(variationData.error || 'Variation generation failed');
    }

    // Save variations to database
    const savedVariations = [];
    const errors = [];

    for (const variation of variationData.sample_variations || []) {
      try {
        const saved = await this.questionService.createQuestion({
          title: variation.title,
          description: `Variation of: ${baseQuestion.title}`,
          problemStatement: variation.problemStatement,
          difficulty: variation.difficulty,
          skillTags: variation.skillTags,
          type: variation.type,
          canonicalSolution: variation.canonicalSolution,
          testCases: variation.testCases,
          status: 'pending_review',
          aiGenerated: true,
          source: 'variation_engine',
          createdBy: userId,
          // FIX: Store variation info in description since metadata field doesn't exist
          // metadata: {
          //   is_variation: true,
          //   base_question_id: baseQuestion.id,
          //   variation_number: variation.variation_number,
          //   variation_engine_version: variation.metadata?.variation_engine_version
          // }
        });

        savedVariations.push(saved);
        console.log(`✅ [CONTROLLER] Saved variation: ${saved.title}`);
      } catch (error: any) {
        console.error(`❌ [CONTROLLER] Error saving variation:`, error.message);
        errors.push({
          title: variation.title,
          error: error.message
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Generated ${variationData.variations_generated} variations and saved ${savedVariations.length} to database`,
      variations_generated: variationData.variations_generated,
      saved_count: savedVariations.length,
      difficulty_distribution: variationData.difficulty_distribution,
      variations: savedVariations,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('❌ [CONTROLLER] generateVariations ERROR:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate variations',
      details: error.message
    });
  }
}

/**
 * Analyze question variability for anti-cheat
 * Route: POST /api/questions/:id/analyze-variability
 */
async analyzeVariability(req: Request, res: Response) {
  console.log('📊 [CONTROLLER] analyzeVariability called');

  try {
    const { id } = req.params;
    
    // Get base question from database
    const baseQuestion = await this.questionService.getQuestionById(id);
    if (!baseQuestion) {
      return res.status(404).json({
        success: false,
        error: 'Question not found'
      });
    }

    console.log('📊 [CONTROLLER] Analyzing variability for:', baseQuestion.title);

    // Call Python Variation Engine for analysis
    const analysisResponse = await fetch('http://localhost:8000/variations/analyze-variability', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base_question: {
          id: baseQuestion.id,
          title: baseQuestion.title,
          problemStatement: baseQuestion.problemStatement,
          difficulty: baseQuestion.difficulty,
          // FIX: Use empty object if parameters doesn't exist
          parameters: (baseQuestion as any).parameters || {},
          testCases: baseQuestion.testCases || { examples: [] },
          skillTags: baseQuestion.skillTags,
          type: baseQuestion.type
        }
      })
    });

    if (!analysisResponse.ok) {
      throw new Error(`Variation engine returned ${analysisResponse.status}`);
    }

    // FIX: Add type assertion here
    const analysisData = await analysisResponse.json() as VariabilityAnalysisResponse;
    console.log('✅ [CONTROLLER] Variability analysis successful');

    res.json({
      success: true,
      analysis: analysisData.variability_analysis,
      sample_variations: analysisData.sample_variations
    });

  } catch (error: any) {
    console.error('❌ [CONTROLLER] analyzeVariability ERROR:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze variability',
      details: error.message
    });
  }
}
  /**
   * Health check for Vector Engine
   * Route: GET /api/questions/vector/health
   */
  async checkVectorHealth(req: Request, res: Response) {
    console.log('🔍 [CONTROLLER] checkVectorHealth called');
    
    try {
      const healthCheck = await vectorEngineService.healthCheck();
      
      res.json({
        success: healthCheck.success,
        service: 'Vector Search Engine',
        status: healthCheck.status,
        message: healthCheck.success ? 'Vector engine is operational' : 'Vector engine issues detected',
        error: healthCheck.error,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('❌ [CONTROLLER] Vector health check ERROR:', error.message);
      
      res.status(503).json({
        success: false,
        service: 'Vector Search Engine',
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

/**
 * Health check for Variation Engine
 * Route: GET /api/questions/variation-engine/health
 */
async checkVariationEngineHealth(req: Request, res: Response) {
  console.log('🔧 [CONTROLLER] checkVariationEngineHealth called');

  try {
    const healthResponse = await fetch('http://localhost:8000/variations/health');
    
    if (!healthResponse.ok) {
      throw new Error(`Variation engine returned ${healthResponse.status}`);
    }

    // FIX: Add type assertion here
    const healthData = await healthResponse.json() as any;
    
    res.json({
      success: true,
      service: 'Variation Engine',
      status: healthData.status,
      version: healthData.version,
      components: healthData.components,
      supported_question_types: healthData.supported_question_types
    });

  } catch (error: any) {
    console.error('❌ [CONTROLLER] checkVariationEngineHealth ERROR:', error.message);
    res.status(503).json({
      success: false,
      service: 'Variation Engine',
      status: 'unavailable',
      error: error.message
    });
  }
}

//methode de vetting

  // POST /api/questions/:id/vet
  async vetQuestionById(req: Request, res: Response): Promise<void> {
    console.log('🧪 [CONTROLLER] vetQuestionById called with id:', req.params.id);

    try {
      const { id } = req.params;

      // 1️⃣ Récupérer la question
      const question = await this.questionService.getQuestionById(id);
      if (!question) {
        res.status(404).json({
          success: false,
          error: 'Question not found',
        });
        return;
      }

      // 2️⃣ Mapper vers le format attendu par le service Python
      const payload = this.mapToVettingPayload(question);

      // 3️⃣ Appeler le service de vetting Python
      const vettingResponse = await vettingService.vetSingleQuestion(payload);
      const result = vettingResponse.result || vettingResponse;

      // 4️⃣ Mettre à jour le status en base
      let newStatus = question.status;
      if (result.status === 'APPROVED') newStatus = 'approved';
      else if (result.status === 'REJECTED') newStatus = 'rejected';

      const updated = await this.questionService.updateQuestion(id, {
        status: newStatus,
        // ici tu pourras plus tard stocker vettingScore, vettingMetadata, etc.
      });

      // 5️⃣ Réponse API
      res.json({
        success: true,
        message: `Question vetted with status: ${result.status}`,
        vetting: result,
        question: updated,
      });
    } catch (error: any) {
      console.error('❌ [CONTROLLER] vetQuestionById ERROR:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to vet question',
        details: error.message,
      });
    }
  }

  // POST /api/questions/vetting/batch
  // Body: { ids: ["id1", "id2", ...] }
  async vetBatchQuestions(req: Request, res: Response): Promise<void> {
    console.log('🧪 [CONTROLLER] vetBatchQuestions called');

    try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Question IDs array required',
        });
        return;
      }

      const results: any[] = [];
      const updatedQuestions: any[] = [];
      const errors: Array<{ id: string; error: string }> = [];

      for (const id of ids) {
        try {
          const question = await this.questionService.getQuestionById(id);
          if (!question) {
            errors.push({ id, error: 'Question not found' });
            continue;
          }

          const payload = this.mapToVettingPayload(question);
          const vettingResponse = await vettingService.vetSingleQuestion(payload);
          const result = vettingResponse.result || vettingResponse;

          let newStatus = question.status;
          if (result.status === 'APPROVED') newStatus = 'approved';
          else if (result.status === 'REJECTED') newStatus = 'rejected';

          const updated = await this.questionService.updateQuestion(id, {
            status: newStatus,
          });

          results.push({ id, vetting: result });
          updatedQuestions.push(updated);
        } catch (e: any) {
          console.error(`❌ [CONTROLLER] Error vetting question ${id}:`, e.message);
          errors.push({ id, error: e.message });
        }
      }

      res.json({
        success: true,
        message: `Vetting completed for ${ids.length} questions`,
        vetted_count: updatedQuestions.length,
        results,
        questions: updatedQuestions,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error: any) {
      console.error('❌ [CONTROLLER] vetBatchQuestions ERROR:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to vet batch questions',
        details: error.message,
      });
    }
  }

  //  Convertit une question Prisma vers le format attendu par le service de vetting Python
  private mapToVettingPayload(dbQuestion: any): VettingQuestionPayload {
    const testCases = dbQuestion.testCases;

    const mappedTestCases = this.mapTestCasesForVetting(testCases);

    return {
      id: dbQuestion.id,
      problem_statement: dbQuestion.problemStatement,
      canonical_solution: dbQuestion.canonicalSolution,
      language: (dbQuestion as any).language || 'python', // défaut: python
      test_cases: mappedTestCases,
    };
  }

  // Normalise les test cases stockés en JSON vers [{ input, expected_output }]
  private mapTestCasesForVetting(testCases: any): Array<{ input: string; expected_output: string }> {
    if (!testCases) return [];

    // Cas 1 : déjà un tableau [{ input, output/expected_output }]
    if (Array.isArray(testCases)) {
      return testCases
        .filter((tc: any) => tc && tc.input !== undefined)
        .map((tc: any) => ({
          input: String(tc.input),
          expected_output: String(tc.expected_output ?? tc.output ?? ''),
        }))
        .filter(tc => tc.expected_output !== '');
    }

    // Cas 2 : objet avec inputs / outputs (ton ancien format)
    if (typeof testCases === 'object' && testCases.inputs && testCases.outputs) {
      const inputs = Array.isArray(testCases.inputs) ? testCases.inputs : [];
      const outputs = Array.isArray(testCases.outputs) ? testCases.outputs : [];
      const len = Math.min(inputs.length, outputs.length);

      const result: Array<{ input: string; expected_output: string }> = [];
      for (let i = 0; i < len; i++) {
        result.push({
          input: String(inputs[i]),
          expected_output: String(outputs[i]),
        });
      }
      return result;
    }

    // Fallback : rien d’exploitable
    return [];
  }

  // In QuestionController class, add this method:

/**
 * Generate questions from patterns for a specific user
 */
async generateQuestionsFromPatternsForUser(params: {
  patterns: any[];
  userId: string;
  difficulties: ("easy" | "medium" | "hard")[];
  limit: number;
}): Promise<{
  created: number;
  skipped: number;
  failed: number;
  difficultyVariants: string[];
  userQuestions: number;
  questionIds: string[];
}> {
  const { patterns, userId, difficulties, limit } = params;
  
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
          
          const aiData = await response.json();
          
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
            status: "pending_review" as const, // User questions start as pending
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
          const existingQuestion = await this.questionService.findByTitle(questionData.title);
          
          if (existingQuestion && existingQuestion.createdBy === userId) {
            console.log(`⚠️ [DUPLICATE] Skipping duplicate question for user ${userId}: ${questionData.title}`);
            skipped++;
            continue;
          }
          
          // Create the question using the existing service
          const question = await this.questionService.createQuestion(questionData);
          
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
  
  return {
    created,
    skipped,
    failed,
    difficultyVariants: difficulties,
    userQuestions: created,
    questionIds: createdQuestionIds,
  };
}
  async cloneFromLibrary(req: any, res: any) {
  const company_id = req.user.user_id;
  const { libraryQuestionId } = req.body ?? {};

  if (!libraryQuestionId) {
    return res.status(400).json({
      success: false,
      error: "libraryQuestionId is required",
    });
  }

  const cloned = await this.questionService.cloneFromLibrary({
    company_id,
    libraryQuestionId,
  });

  return res.status(201).json({
    success: true,
    message: "Question cloned from library",
    question: cloned,
  });
}
async getMyQuestions(req: any, res: any) {
  const company_id = req.user.user_id;

  const items = await this.questionService.getMyQuestions(company_id);

  return res.json({
    success: true,
    questions: items,
  });
}


}
