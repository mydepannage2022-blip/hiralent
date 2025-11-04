import { PrismaClient, Question, Prisma } from '@prisma/client';
import { QuestionData, QuestionFilters, PaginationResult } from '../../types/question.types';

export class QuestionService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
    console.log(' QuestionService initialized');
  }

  // Get all questions with filters
  async getAllQuestions(filters: QuestionFilters): Promise<PaginationResult<Question>> {
    console.log(' [SERVICE] getAllQuestions called with filters:', filters);
    
    const { 
      page = 1, 
      limit = 10, 
      difficulty, 
      status, 
      search 
    } = filters;

    const skip = (page - 1) * limit;
    
    // Build where clause
    const where: Prisma.QuestionWhereInput = {};
    if (difficulty) where.difficulty = difficulty;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    console.log(' [SERVICE] Prisma where clause:', JSON.stringify(where, null, 2));

    try {
      // Execute queries in parallel
      const [questions, total] = await Promise.all([
        this.prisma.question.findMany({
          skip,
          take: limit,
          where,
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.question.count({ where })
      ]);

      console.log(' [SERVICE] Found questions:', questions.length);
      console.log(' [SERVICE] Total count:', total);

      return {
        data: questions,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error(' [SERVICE] getAllQuestions ERROR:', error);
      throw error;
    }
  }

  // Get question by ID - AVEC DEBUG
  async getQuestionById(id: string): Promise<Question | null> {
    console.log(' [SERVICE] getQuestionById called with id:', id);
    
    if (!id || id === 'undefined' || id === 'null') {
      console.log(' [SERVICE] Invalid ID provided');
      return null;
    }

    try {
      const question = await this.prisma.question.findUnique({
        where: { id }
      });

      console.log(' [SERVICE] Question found:', question ? 'YES' : 'NO');
      if (question) {
        console.log('[SERVICE] Question details:', {
          id: question.id,
          title: question.title,
          status: question.status
        });
      } else {
        console.log(' [SERVICE] No question found with id:', id);
      }

      return question;
    } catch (error) {
      console.error(' [SERVICE] getQuestionById ERROR:', error);
      return null;
    }
  }

  // Create new question
  async createQuestion(data: QuestionData): Promise<Question> {
    console.log(' [SERVICE] createQuestion called');
    return await this.prisma.question.create({
      data: {
        title: data.title,
        description: data.description,
        problemStatement: data.problemStatement,
        difficulty: data.difficulty,
        skillTags: data.skillTags,
        type: data.type || 'coding',
        canonicalSolution: data.canonicalSolution,
        testCases: data.testCases as any,
        status: data.status || 'draft',
        aiGenerated: data.aiGenerated || false,
        source: data.source || 'manual'
      }
    });
  }
  

  // Update question
// In your QuestionService class - add this method if missing
async updateQuestion(id: string, data: Partial<QuestionData>): Promise<Question> {
  console.log('🔧 [SERVICE] updateQuestion called for id:', id);
  
  try {
    // Check if question exists first
    const existingQuestion = await this.prisma.question.findUnique({
      where: { id }
    });
    
    if (!existingQuestion) {
      throw new Error(`Question with id ${id} not found`);
    }

    console.log('🔧 [SERVICE] Existing question found, updating...');
    
    // Build update data
    const updateData: any = {};
    
    // Only include fields that are provided
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.problemStatement !== undefined) updateData.problemStatement = data.problemStatement;
    if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
    if (data.skillTags !== undefined) updateData.skillTags = data.skillTags;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.canonicalSolution !== undefined) updateData.canonicalSolution = data.canonicalSolution;
    if (data.testCases !== undefined) updateData.testCases = data.testCases;
    if (data.status !== undefined) updateData.status = data.status;

    console.log('🔧 [SERVICE] Update data:', updateData);

    const updatedQuestion = await this.prisma.question.update({
      where: { id },
      data: updateData
    });

    console.log('🔧 [SERVICE] Update successful');
    return updatedQuestion;
  } catch (error: any) {
    console.error('🔧 [SERVICE] updateQuestion ERROR:', error);
    
    if (error.code === 'P2025') {
      throw new Error(`Question with id ${id} not found`);
    }
    
    throw error;
  }
}

  // Delete question
  async deleteQuestion(id: string): Promise<void> {
    console.log(' [SERVICE] deleteQuestion called for id:', id);
    await this.prisma.question.delete({
      where: { id }
    });
  }

  // Approve question - AVEC DEBUG
  async approveQuestion(id: string): Promise<Question> {
    console.log(' [SERVICE] approveQuestion called for id:', id);
    
    try {
      // Vérifiez d'abord si la question existe
      const existing = await this.prisma.question.findUnique({ where: { id } });
      console.log(' [SERVICE] Existing question before approve:', existing ? existing.status : 'NOT FOUND');
      
      const result = await this.prisma.question.update({
        where: { id },
        data: { status: 'approved' }
      });
      
      console.log(' [SERVICE] Approve successful, new status:', result.status);
      return result;
    } catch (error: any) {
      console.error(' [SERVICE] approveQuestion ERROR:', error);
      console.error(' [SERVICE] Error code:', error.code);
      console.error(' [SERVICE] Error message:', error.message);
      throw error;
    }
  }

  // Reject question - AVEC DEBUG COMPLET
  async rejectQuestion(id: string): Promise<Question> {
    console.log(' [SERVICE] rejectQuestion called for id:', id);
    
    try {
      // Vérifiez d'abord si la question existe
      const existing = await this.prisma.question.findUnique({ 
        where: { id } 
      });
      
      console.log(' [SERVICE] Existing question before reject:', existing);
      
      if (!existing) {
        console.log(' [SERVICE] Question not found, cannot reject');
        throw new Error(`Question with id ${id} not found`);
      }

      console.log(' [SERVICE] Current status:', existing.status);
      
      const result = await this.prisma.question.update({
        where: { id },
        data: { status: 'rejected' }
      });
      
      console.log(' [SERVICE] Reject successful, new status:', result.status);
      return result;
    } catch (error: any) {
      console.error(' [SERVICE] rejectQuestion ERROR:', error);
      console.error(' [SERVICE] Error code:', error.code);
      console.error(' [SERVICE] Error message:', error.message);
      console.error(' [SERVICE] Error stack:', error.stack);
      throw error;
    }
  }

  // Get statistics
  async getQuestionStats() {
    console.log(' [SERVICE] getQuestionStats called');
    const [total, approved, pending, draft, rejected] = await Promise.all([
      this.prisma.question.count(),
      this.prisma.question.count({ where: { status: 'approved' } }),
      this.prisma.question.count({ where: { status: 'pending_review' } }),
      this.prisma.question.count({ where: { status: 'draft' } }),
      this.prisma.question.count({ where: { status: 'rejected' } })
    ]);

    console.log(' [SERVICE] Stats:', { total, approved, pending, draft, rejected });

    return { total, approved, pending, draft, rejected };
  }

  // Bulk operations
  async bulkApprove(ids: string[]): Promise<number> {
    console.log('[SERVICE] bulkApprove called for ids:', ids);
    const result = await this.prisma.question.updateMany({
      where: { id: { in: ids } },
      data: { status: 'approved' }
    });
    return result.count;
  }

  async bulkDelete(ids: string[]): Promise<number> {
    console.log(' [SERVICE] bulkDelete called for ids:', ids);
    const result = await this.prisma.question.deleteMany({
      where: { id: { in: ids } }
    });
    return result.count;
  }
}