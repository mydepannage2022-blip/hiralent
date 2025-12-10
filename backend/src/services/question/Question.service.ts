import { PrismaClient, Question, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export class QuestionService {
  
  /**
   * Récupérer toutes les questions avec pagination
   */
  async getAllQuestions(filters: any) {
    console.log('📊 [SERVICE] getAllQuestions called with filters:', filters);
    
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.QuestionWhereInput = {};

    if (filters.difficulty) {
      where.difficulty = filters.difficulty;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    try {
      const [data, total] = await Promise.all([
        prisma.question.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.question.count({ where })
      ]);

      console.log('✅ [SERVICE] Found', data.length, 'questions');

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error: any) {
      console.error('❌ [SERVICE] getAllQuestions ERROR:', error);
      throw new Error(`Failed to get questions: ${error.message}`);
    }
  }

  /**
   * Récupérer une question par ID
   */
  async getQuestionById(id: string): Promise<Question | null> {
    console.log('🔍 [SERVICE] getQuestionById called:', id);
    
    try {
      const question = await prisma.question.findUnique({
        where: { id }
      });

      if (!question) {
        console.log('❌ [SERVICE] Question not found:', id);
        return null;
      }

      console.log('✅ [SERVICE] Question found:', question.title);
      return question;
    } catch (error: any) {
      console.error('❌ [SERVICE] getQuestionById ERROR:', error);
      throw new Error(`Failed to get question: ${error.message}`);
    }
  }

  /**
   * Créer une nouvelle question
   */
async createQuestion(data: any): Promise<Question> {
  console.log('📝 [SERVICE] createQuestion called - Type:', data.type);
  
  try {
    const questionData: any = {
      title: data.title,
      description: data.description || '',
      problemStatement: data.problemStatement,
      difficulty: data.difficulty,
      skillTags: data.skillTags || [],
      type: data.type || 'coding',
      status: data.status || 'draft',
      createdBy: data.createdBy,
      aiGenerated: data.aiGenerated || false,
      source: data.source || 'manual',
      isLibraryQuestion: data.isLibraryQuestion === true,

    };

    // Handle different question types
    if (data.type === 'coding') {
      questionData.canonicalSolution = data.canonicalSolution || '';
      questionData.testCases = data.testCases || {};
    } else if (data.type === 'mcq') {
      questionData.options = data.options || {};
      questionData.correctAnswer = data.correctAnswer || '';
      questionData.explanation = data.explanation || '';
      // For MCQ, we can store empty values for coding-specific fields
      questionData.canonicalSolution = '';
      questionData.testCases = {};
    }

    const question = await prisma.question.create({
      data: questionData
    });

    console.log('✅ [SERVICE] Question created:', question.id, 'Type:', question.type);
    return question;
  } catch (error: any) {
    console.error('❌ [SERVICE] createQuestion ERROR:', error);
    throw new Error(`Failed to create question: ${error.message}`);
  }
}

  /**
   * Mettre à jour une question
   */
  async updateQuestion(id: string, data: any): Promise<Question> {
    console.log('✏️ [SERVICE] updateQuestion called for:', id);
    
    try {
      const existingQuestion = await prisma.question.findUnique({
        where: { id }
      });

      if (!existingQuestion) {
        throw new Error('Question not found');
      }

      const question = await prisma.question.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });

      console.log('✅ [SERVICE] Question updated:', question.id);
      return question;
    } catch (error: any) {
      console.error('❌ [SERVICE] updateQuestion ERROR:', error);
      
      if (error.code === 'P2025') {
        throw new Error('Question not found');
      }
      throw new Error(`Failed to update question: ${error.message}`);
    }
  }

  /**
   * Supprimer une question
   */
  async deleteQuestion(id: string): Promise<void> {
    console.log('🗑️ [SERVICE] deleteQuestion called for:', id);
    
    try {
      await prisma.question.delete({
        where: { id }
      });

      console.log('✅ [SERVICE] Question deleted:', id);
    } catch (error: any) {
      console.error('❌ [SERVICE] deleteQuestion ERROR:', error);
      
      if (error.code === 'P2025') {
        throw new Error('Question not found');
      }
      throw new Error(`Failed to delete question: ${error.message}`);
    }
  }

  /**
   * Approuver une question
   */
  async approveQuestion(id: string): Promise<Question> {
    console.log('✅ [SERVICE] approveQuestion called for:', id);
    
    try {
      const existing = await prisma.question.findUnique({ 
        where: { id } 
      });

      if (!existing) {
        throw new Error('Question not found');
      }

      const question = await prisma.question.update({
        where: { id },
        data: { 
          status: 'approved',
          updatedAt: new Date()
        }
      });

      console.log('✅ [SERVICE] Question approved:', question.id);
      return question;
    } catch (error: any) {
      console.error('❌ [SERVICE] approveQuestion ERROR:', error);
      
      if (error.code === 'P2025') {
        throw new Error('Question not found');
      }
      throw new Error(`Failed to approve question: ${error.message}`);
    }
  }

  /**
   * Rejeter une question
   */
  async rejectQuestion(id: string): Promise<Question> {
    console.log('🔴 [SERVICE] rejectQuestion called for:', id);
    
    try {
      const existing = await prisma.question.findUnique({ 
        where: { id } 
      });

      if (!existing) {
        throw new Error('Question not found');
      }

      const question = await prisma.question.update({
        where: { id },
        data: { 
          status: 'rejected',
          updatedAt: new Date()
        }
      });

      console.log('✅ [SERVICE] Question rejected:', question.id);
      return question;
    } catch (error: any) {
      console.error('❌ [SERVICE] rejectQuestion ERROR:', error);
      
      if (error.code === 'P2025') {
        throw new Error('Question not found');
      }
      throw new Error(`Failed to reject question: ${error.message}`);
    }
  }

  /**
   * Approuver plusieurs questions en masse
   */
  async bulkApprove(ids: string[]): Promise<number> {
    console.log('🎯 [SERVICE] bulkApprove called for', ids.length, 'questions');
    
    try {
      const result = await prisma.question.updateMany({
        where: {
          id: { in: ids }
        },
        data: {
          status: 'approved',
          updatedAt: new Date()
        }
      });

      console.log('✅ [SERVICE] Bulk approved:', result.count, 'questions');
      return result.count;
    } catch (error: any) {
      console.error('❌ [SERVICE] bulkApprove ERROR:', error);
      throw new Error(`Failed to bulk approve questions: ${error.message}`);
    }
  }

  /**
   * Supprimer plusieurs questions en masse
   */
  async bulkDelete(ids: string[]): Promise<number> {
    console.log('🗑️ [SERVICE] bulkDelete called for', ids.length, 'questions');
    
    try {
      const result = await prisma.question.deleteMany({
        where: {
          id: { in: ids }
        }
      });

      console.log('✅ [SERVICE] Bulk deleted:', result.count, 'questions');
      return result.count;
    } catch (error: any) {
      console.error('❌ [SERVICE] bulkDelete ERROR:', error);
      throw new Error(`Failed to bulk delete questions: ${error.message}`);
    }
  }

  /**
   * Obtenir les statistiques des questions
   */
  async getQuestionStats() {
    console.log('📊 [SERVICE] getQuestionStats called');
    
    try {
      const [total, approved, pending, draft, rejected] = await Promise.all([
        prisma.question.count(),
        prisma.question.count({ where: { status: 'approved' } }),
        prisma.question.count({ where: { status: 'pending_review' } }),
        prisma.question.count({ where: { status: 'draft' } }),
        prisma.question.count({ where: { status: 'rejected' } })
      ]);

      const stats = {
        total,
        approved,
        pending,
        draft,
        rejected
      };

      console.log('✅ [SERVICE] Stats calculated:', stats);
      return stats;
    } catch (error: any) {
      console.error('❌ [SERVICE] getQuestionStats ERROR:', error);
      throw new Error(`Failed to get question stats: ${error.message}`);
    }
  }
  /**
 * Trouver une question par titre (pour éviter les doublons)
 */
async findByTitle(title: string): Promise<Question | null> {
  try {
    const question = await prisma.question.findFirst({
      where: { 
        title: {
          equals: title,
          mode: 'insensitive'
        }
      }
    });
    
    return question;
  } catch (error: any) {
    console.error('❌ [SERVICE] findByTitle ERROR:', error);
    return null;
  }
}


}``