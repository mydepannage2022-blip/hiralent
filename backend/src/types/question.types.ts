import { Prisma } from '@prisma/client';

export interface QuestionData {
  title: string;
  description: string;
  problemStatement: string;
  difficulty: 'easy' | 'medium' | 'hard';
  skillTags: string[];
  type: string;
  canonicalSolution: string;
  testCases: TestCase[];
  status?: 'draft' | 'pending_review' | 'approved' | 'rejected';
  aiGenerated?: boolean;
  source?: string;
  createdBy?: string;  // ✅ AJOUTÉ!

}

export interface TestCase {
  input: string;
  output: string;
}

export interface QuestionFilters {
  page?: number;
  limit?: number;
  difficulty?: string;
  status?: string;
  search?: string;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
// ========== SCRAPING TYPES ==========

export interface ScrapedQuestionData {
  title: string;
  description?: string;
  problemStatement: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  skillTags?: string[];
  type?: string;
  canonicalSolution?: string;
  testCases?: any;
  sourceUrl?: string;
  platform?: string;
}

export interface ScrapingServiceResponse {
  success: boolean;
  message?: string;
  questions?: ScrapedQuestionData[];
  error?: string;
  total_urls?: number;
  successful?: number;
  failed?: number;
[key: string]: any;
}

export interface ScrapingServiceHealth {
  success: boolean;
  status: string;
  service?: string;
  timestamp?: number;
}
//  Interface pour la réponse du job de scraping
export interface ScrapingJobResponse {
  success: boolean;
  execution_time_seconds: number;
  total_collected: number;
  spider_results: {
    [key: string]: {
      collected: number;
      saved: number;
      status: string;
      error?: string;
    };
  };
  corpus_stats: {
    total_problems: number;
    unprocessed: number;
    by_source: Record<string, number>;
    by_language: Record<string, number>;
    mode: string;
  };
  timestamp: string;
  mode: string;
  data_source?: string;
  error?: string;
}

// Interface pour un problème scrapé
export interface ScrapedProblem {
  source: string;
  title: string;
  content: string;
  full_question_url?: string;
  tags?: string[];
  votes?: number;
  answers?: number;
  views?: number;
  language: string;
  difficulty: string;
  problem_type?: string;
  problemStatement?: string;
  skillTags?: string[];
  type?: string;
  canonicalSolution?: string;
  testCases?: any;
  test_cases?: any;
  status?: string;
  aiGenerated?: boolean;
  description?: string;
}

//  Interface pour la réponse des problèmes scrapés
export interface ScrapedProblemsResponse {
  problems: ScrapedProblem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
  mode: string;
  data_source?: string;
  error?: string;
}

// Helper type pour convertir les données en format Prisma
export type QuestionCreateInput = Omit<QuestionData, 'testCases'> & {
  testCases: Prisma.InputJsonValue;
};

export type QuestionUpdateInput = Partial<Omit<QuestionData, 'testCases'>> & {
  testCases?: Prisma.InputJsonValue;
};
