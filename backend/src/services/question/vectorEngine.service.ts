// services/vectorEngine.service.ts
import { Question } from '@prisma/client';

export interface SimilarityCheckResult {
  success: boolean;
  duplication_risk: 'high' | 'medium' | 'low' | 'unknown';
  similar_questions_found: number;
  top_similar_questions: Array<{
    question_id: string;
    similarity_score: number;
    metadata: any;
  }>;
  error?: string;
}

export interface VectorStoreResult {
  success: boolean;
  message: string;
  question_id: string;
}

export interface CodeSimilarityResult {
  success: boolean;
  code_similarity_detected: boolean;
  similar_solutions_found: number;
  similar_solutions: Array<{
    question_id: string;
    similarity_score: number;
    metadata: any;
  }>;
  error?: string;
}

export interface VectorDatabaseStats {
  success: boolean;
  database_stats: {
    total_questions: number;
    collection_name: string;
    embedding_dimension: number;
    similarity_thresholds: {
      high_similarity: number;
      medium_similarity: number;
      low_similarity: number;
    };
  };
}

// Response interfaces for the AI service
interface AISimilarityResponse {
  success: boolean;
  result?: SimilarityCheckResult;
  analysis_id?: string;
  timestamp?: string;
}

interface AIStoreResponse {
  success: boolean;
  message: string;
  question_id: string;
  timestamp?: string;
}

interface AICodeSimilarityResponse {
  success: boolean;
  code_similarity_check?: CodeSimilarityResult;
  timestamp?: string;
}

interface AIStatsResponse {
  success: boolean;
  database_stats: {
    total_questions: number;
    collection_name: string;
    embedding_dimension: number;
    similarity_thresholds: {
      high_similarity: number;
      medium_similarity: number;
      low_similarity: number;
    };
  };
  timestamp?: string;
}

interface AIDeleteResponse {
  success: boolean;
  message: string;
  question_id: string;
  timestamp?: string;
}

export class VectorEngineService {
  private baseURL: string;
  private enabled: boolean;

  constructor() {
    this.baseURL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    this.enabled = process.env.VECTOR_ENGINE_ENABLED === 'true';
    console.log('🔧 VectorEngineService initialized:', { 
      baseURL: this.baseURL, 
      enabled: this.enabled 
    });
  }

  /**
   * Check if a new question is similar to existing questions
   */
  async checkSimilarity(questionData: Partial<Question>): Promise<SimilarityCheckResult> {
    if (!this.enabled) {
      console.log('⚠️ Vector engine disabled, skipping similarity check');
      return {
        success: true,
        duplication_risk: 'unknown',
        similar_questions_found: 0,
        top_similar_questions: []
      };
    }

    try {
      console.log('🔍 Checking question similarity:', questionData.title);
      
      const response = await fetch(`${this.baseURL}/vector-search/analyze-similarity`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          id: questionData.id,
          title: questionData.title,
          problemStatement: questionData.problemStatement,
          type: questionData.type,
          difficulty: questionData.difficulty,
          skillTags: questionData.skillTags,
          canonicalSolution: questionData.canonicalSolution,
          testCases: questionData.testCases,
          source: questionData.source,
          // Include MCQ fields if present
          options: questionData.options,
          correctAnswer: questionData.correctAnswer,
          explanation: questionData.explanation
        })
      });

      if (!response.ok) {
        throw new Error(`Vector service returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json() as AISimilarityResponse;
      
      console.log('📊 Similarity check result:', {
        risk: result.result?.duplication_risk,
        similarFound: result.result?.similar_questions_found,
        success: result.success
      });

      return result.result || {
        success: result.success,
        duplication_risk: 'unknown',
        similar_questions_found: 0,
        top_similar_questions: []
      };

    } catch (error: any) {
      console.error('❌ Vector similarity check failed:', error.message);
      return {
        success: false,
        duplication_risk: 'unknown',
        similar_questions_found: 0,
        top_similar_questions: [],
        error: error.message
      };
    }
  }

  /**
   * Store a question in the vector database
   */
  async storeQuestion(question: Question): Promise<VectorStoreResult> {
    if (!this.enabled) {
      console.log('⚠️ Vector engine disabled, skipping question storage');
      return {
        success: true,
        message: 'Vector engine disabled - question not stored',
        question_id: question.id
      };
    }

    try {
      console.log('💾 Storing question in vector database:', question.id);
      
      const response = await fetch(`${this.baseURL}/vector-search/store-question`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          id: question.id,
          title: question.title,
          problemStatement: question.problemStatement,
          type: question.type,
          difficulty: question.difficulty,
          skillTags: question.skillTags,
          canonicalSolution: question.canonicalSolution,
          testCases: question.testCases,
          source: question.source,
          // Include MCQ fields
          options: question.options,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation
        })
      });

      if (!response.ok) {
        throw new Error(`Vector service returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json() as AIStoreResponse;
      
      console.log('✅ Question stored in vector DB:', {
        questionId: question.id,
        success: result.success
      });

      return {
        success: result.success,
        message: result.message,
        question_id: result.question_id
      };

    } catch (error: any) {
      console.error('❌ Failed to store question in vector DB:', error.message);
      return {
        success: false,
        message: `Failed to store in vector DB: ${error.message}`,
        question_id: question.id
      };
    }
  }

  /**
   * Check if a code snippet is similar to existing solutions
   */
  async checkCodeSimilarity(codeSnippet: string, questionId?: string): Promise<CodeSimilarityResult> {
    if (!this.enabled) {
      console.log('⚠️ Vector engine disabled, skipping code similarity check');
      return {
        success: true,
        code_similarity_detected: false,
        similar_solutions_found: 0,
        similar_solutions: []
      };
    }

    try {
      const payload: any = { code_snippet: codeSnippet };
      if (questionId) payload.question_id = questionId;

      console.log('🔍 Checking code similarity for question:', questionId);
      
      const response = await fetch(`${this.baseURL}/vector-search/check-code-similarity`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Vector service returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json() as AICodeSimilarityResponse;
      return result.code_similarity_check || {
        success: result.success,
        code_similarity_detected: false,
        similar_solutions_found: 0,
        similar_solutions: []
      };

    } catch (error: any) {
      console.error('❌ Code similarity check failed:', error.message);
      return {
        success: false,
        code_similarity_detected: false,
        similar_solutions_found: 0,
        similar_solutions: [],
        error: error.message
      };
    }
  }

  /**
   * Get vector database statistics
   */
  async getDatabaseStats(): Promise<VectorDatabaseStats> {
    if (!this.enabled) {
      console.log('⚠️ Vector engine disabled, cannot get stats');
      return {
        success: false,
        database_stats: {
          total_questions: 0,
          collection_name: 'disabled',
          embedding_dimension: 0,
          similarity_thresholds: {
            high_similarity: 0,
            medium_similarity: 0,
            low_similarity: 0
          }
        }
      };
    }

    try {
      const response = await fetch(`${this.baseURL}/vector-search/database-stats`);
      
      if (!response.ok) {
        throw new Error(`Vector service returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json() as AIStatsResponse;
      return {
        success: result.success,
        database_stats: result.database_stats
      };

    } catch (error: any) {
      console.error('❌ Failed to get vector database stats:', error.message);
      throw error;
    }
  }

  /**
   * Check if vector engine service is healthy
   */
  async healthCheck(): Promise<{ success: boolean; status: string; error?: string }> {
    if (!this.enabled) {
      return { success: true, status: 'disabled' };
    }

    try {
      const response = await fetch(`${this.baseURL}/vector-search/database-stats`);
      const healthy = response.ok;
      
      return {
        success: healthy,
        status: healthy ? 'healthy' : 'unhealthy',
        error: healthy ? undefined : `HTTP ${response.status}`
      };

    } catch (error: any) {
      return {
        success: false,
        status: 'unavailable',
        error: error.message
      };
    }
  }

  /**
   * Delete a question from vector database
   */
  async deleteQuestion(questionId: string): Promise<{ success: boolean; message: string }> {
    if (!this.enabled) {
      return { success: true, message: 'Vector engine disabled - no action taken' };
    }

    try {
      const response = await fetch(`${this.baseURL}/vector-search/question/${questionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Vector service returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json() as AIDeleteResponse;
      return {
        success: result.success,
        message: result.message
      };

    } catch (error: any) {
      console.error('❌ Failed to delete question from vector DB:', error.message);
      return {
        success: false,
        message: `Failed to delete from vector DB: ${error.message}`
      };
    }
  }
}

// Export singleton instance
export const vectorEngineService = new VectorEngineService();