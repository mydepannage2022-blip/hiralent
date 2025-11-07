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

// Helper type pour convertir les données en format Prisma
export type QuestionCreateInput = Omit<QuestionData, 'testCases'> & {
  testCases: Prisma.InputJsonValue;
};

export type QuestionUpdateInput = Partial<Omit<QuestionData, 'testCases'>> & {
  testCases?: Prisma.InputJsonValue;
};
