import { Request, Response } from 'express';
import { QuestionService } from '../../services/question/Question.service';
import { QuestionGeneratorService } from '../../services/question/QuestionGenerator.service';
import { aiQuestionGenerationService } from '../../services/ai/ai-question-generation.service'; 

export class QuestionController {
  private questionService: QuestionService;
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
// POST /api/questions
async createQuestion(req: Request, res: Response) {
  console.log('📝 [CONTROLLER] createQuestion called');
  console.log('👤 [CONTROLLER] req.user:', req.user); // ✅ AJOUTÉ

  try {
    const userId = req.user?.user_id; // ✅ AJOUTÉ

    // ✅ AJOUTÉ: Vérifier l'authentification
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    console.log('👤 [CONTROLLER] User ID:', userId); // ✅ AJOUTÉ

    const question = await this.questionService.createQuestion({
      ...req.body,
      createdBy: userId,  // ✅ AJOUTÉ!
      aiGenerated: false, // ✅ AJOUTÉ!
      source: 'manual'    // ✅ AJOUTÉ!
    });

    console.log('💾 [CONTROLLER] Question created:', question.id);
    console.log('👤 [CONTROLLER] Created by:', question.createdBy); // ✅ AJOUTÉ

    res.json({ success: true, question });
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
async generateQuestion(req: Request, res: Response) {
  console.log('🤖 [CONTROLLER] generateQuestion called');
  console.log('👤 [CONTROLLER] req.user:', req.user);

  try {
    const { topic, difficulty } = req.body;
    const userId = req.user?.user_id;

    // ✅ CORRECTION: Exiger absolument l'authentification
    if (!userId) {
      console.log('❌ [CONTROLLER] User not authenticated for AI generation');
      return res.status(401).json({
        success: false,
        error: 'Authentication required for AI question generation',
        details: 'Please log in to generate AI questions'
      });
    }

    console.log('✅ [CONTROLLER] User authenticated:', userId);

    // Validation du topic
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

    // ✅ CORRECTION: S'assurer que createdBy est toujours défini
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
      createdBy: userId  // ✅ TOUJOURS défini maintenant
    });

    console.log('💾 [CONTROLLER] Question saved:', savedQuestion.id);
    console.log('👤 [CONTROLLER] Created by:', savedQuestion.createdBy);

    res.status(201).json({
      success: true,
      message: 'Question generated and saved successfully',
      question: savedQuestion
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
 * Génère plusieurs questions en batch
 */
async generateBatchQuestions(req: Request, res: Response) {
  console.log('🤖 [CONTROLLER] generateBatchQuestions called');
  console.log('👤 [CONTROLLER] req.user:', req.user);

  try {
    const { topics, difficulty, countPerTopic } = req.body;
    const userId = req.user?.user_id;

    // ✅ CORRECTION: Exiger absolument l'authentification
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
    for (const question of result.questions) {
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
        createdBy: userId  //  TOUJOURS défini maintenant
      });
      savedQuestions.push(saved);
    }

    console.log('💾 [CONTROLLER] Saved', savedQuestions.length, 'questions');
    console.log('👤 [CONTROLLER] All created by:', userId);

    res.status(201).json({
      success: true,
      message: `Generated and saved ${savedQuestions.length} questions`,
      count: savedQuestions.length,
      questions: savedQuestions
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
}
  

  

