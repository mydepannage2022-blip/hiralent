import axios, { AxiosError } from 'axios';

// Configuration
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_TIMEOUT = 30000; // 30 secondes

// Types
interface AIQuestionRequest {
  topic: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface AIQuestionResponse {
  success: boolean;
  question?: {
    title: string;
    problemStatement: string;
    difficulty: string;
    skillTags: string[];
    testCases: Array<{ input: string; output: string }>;
    canonicalSolution: string;
    explanation: string;
  };
  metadata?: {
    topic: string;
    difficulty: string;
    ai_generated: boolean;
  };
  error?: string;
}

interface AIBatchQuestionRequest {
  topics: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  countPerTopic?: number;
}

interface AIBatchQuestionResponse {
  success: boolean;
  generated_count?: number;
  questions?: Array<{
    title: string;
    problemStatement: string;
    difficulty: string;
    skillTags: string[];
    testCases: Array<{ input: string; output: string }>;
    canonicalSolution: string;
    explanation: string;
  }>;
  error?: string;
}

export class AIQuestionGenerationService {
  private baseURL: string;
  
  constructor() {
    this.baseURL = AI_SERVICE_URL;
    console.log('🤖 AIQuestionGenerationService initialized - URL:', this.baseURL);
  }

  /**
   * Health check - Vérifie si le service Python est disponible
   */
  async checkHealth(): Promise<{ status: string; service?: string }> {
    try {
      const response = await axios.get(`${this.baseURL}/health`, {
        timeout: 5000
      });
      console.log('✅ [AI-SERVICE] AI Question Generation Service is healthy');
      return response.data;
    } catch (error) {
      console.error('❌ [AI-SERVICE] AI Question Generation Service is unhealthy:', (error as Error).message);
      return { status: 'unhealthy' };
    }
  }

  /**
   * Génère une seule question
   */
  async generateQuestion(request: AIQuestionRequest): Promise<AIQuestionResponse> {
    console.log('🤖 [AI-SERVICE] Calling Python service to generate question...');
    console.log('🤖 [AI-SERVICE] Request:', request);

    try {
      const response = await axios.post<AIQuestionResponse>(
        `${this.baseURL}/generate`, // ← CORRIGÉ: /generate au lieu de /api/v1/questions/generate/single
        {
          topic: request.topic,
          difficulty: request.difficulty || 'medium'
        },
        {
          timeout: AI_TIMEOUT,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ [AI-SERVICE] Question generated successfully');
      console.log('✅ [AI-SERVICE] Question title:', response.data.question?.title);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      
      if (axiosError.code === 'ECONNREFUSED') {
        console.error('❌ [AI-SERVICE] Python service not running on', this.baseURL);
        throw new Error('AI Question Generation service is not available. Please start the Python service on port 8000.');
      }

      if (axiosError.code === 'ETIMEDOUT') {
        console.error('❌ [AI-SERVICE] Request timeout');
        throw new Error('AI service timeout. The request took too long.');
      }

      if (axiosError.response) {
        console.error('❌ [AI-SERVICE] AI service error:', axiosError.response.data);
        throw new Error(`AI generation failed: ${JSON.stringify(axiosError.response.data)}`);
      }

      console.error('❌ [AI-SERVICE] Unknown error:', axiosError.message);
      throw new Error('Failed to generate question');
    }
  }

  /**
   * Génère plusieurs questions en batch
   */
  async generateBatchQuestions(
    topics: string[], 
    difficulty: 'easy' | 'medium' | 'hard' = 'medium', 
    countPerTopic: number = 2
  ): Promise<AIBatchQuestionResponse> {
    console.log('🤖 [AI-SERVICE] Generating batch questions...');
    console.log('🤖 [AI-SERVICE] Topics:', topics);
    console.log('🤖 [AI-SERVICE] Difficulty:', difficulty);
    console.log('🤖 [AI-SERVICE] Count per topic:', countPerTopic);
    
    try {
      const response = await axios.post<AIBatchQuestionResponse>(
        `${this.baseURL}/generate-batch`, // ← CORRIGÉ: /generate-batch au lieu de /api/v1/questions/generate/batch
        {
          topics: topics, // ← CORRIGÉ: "topics" simple
          difficulty: difficulty, // ← CORRIGÉ: "difficulty" au lieu de "difficulties"
          countPerTopic: countPerTopic // ← CORRIGÉ: "countPerTopic" au lieu de "count_per_topic"
        },
        { 
          timeout: AI_TIMEOUT * 2,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ [AI-SERVICE] Batch generation successful');
      console.log('✅ [AI-SERVICE] Generated', response.data.generated_count, 'questions');
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('❌ [AI-SERVICE] Batch generation failed:', axiosError.message);
      
      if (axiosError.response) {
        console.error('❌ [AI-SERVICE] Response error:', axiosError.response.data);
      }
      
      if (axiosError.code === 'ECONNREFUSED') {
        throw new Error('AI service is not available');
      }
      
      throw new Error(`Batch generation failed: ${axiosError.message}`);
    }
  }

  /**
   * Génère des questions depuis une job description (pour Ihssane plus tard)
   */
  async generateFromJobDescription(jobDescription: string): Promise<AIQuestionResponse> {
    console.log('🤖 [AI-SERVICE] Generating from job description...');
    
    try {
      const response = await axios.post(
        `${this.baseURL}/generate-from-job`, // Note: Vous devrez créer cette route plus tard
        { job_description: jobDescription },
        { timeout: AI_TIMEOUT }
      );

      return response.data;
    } catch (error) {
      console.error('❌ [AI-SERVICE] Job description generation failed:', (error as Error).message);
      throw error;
    }
  }
}

// Export singleton
export const aiQuestionGenerationService = new AIQuestionGenerationService();
