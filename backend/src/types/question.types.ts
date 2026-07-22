import { Prisma } from '@prisma/client';

//NEW: MCQ Options Interface
export interface MCQOptions {
  A: string;
  B: string;
  C: string;
  D: string;
}
export interface QuestionData {
  title: string;
  description: string;
  problemStatement: string;
  difficulty: 'easy' | 'medium' | 'hard';
  skillTags: string[];
  type: string;
  canonicalSolution: string;
  testCases: TestCase[];
  //  NEW: For MCQ Questions
  options?: MCQOptions;
  correctAnswer?: string; // "A" or "B,C" for multiple correct
  explanation?: string;

  status?: 'draft' | 'pending_review' | 'approved' | 'rejected';
  aiGenerated?: boolean;
  source?: string;
  createdBy?: string;  //  AJOUTÉ!

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
  type?: string; // NEW: Filter by type

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
   //  NEW: MCQ support in scraping
  options?: MCQOptions;
  correctAnswer?: string;
  explanation?: string;
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

  //  NEW: MCQ support
  options?: MCQOptions;
  correctAnswer?: string;
  explanation?: string;

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
  options?: Prisma.InputJsonValue; //  NEW

};

export type QuestionUpdateInput = Partial<Omit<QuestionData, 'testCases'>> & {
  testCases?: Prisma.InputJsonValue;
  options?: Prisma.InputJsonValue; //  NEW

};
// Add these to your existing types file

export interface MCQGenerationRequest {
  topic: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface MCQBatchGenerationRequest {
  topics: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  count_per_topic?: number;
}

export interface MCQQuestionData {
  title: string;
  description: string;
  difficulty: string;
  skillTags: string[];
  type: 'mcq';
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: string;
  explanation: string;
}

export interface MCQGenerationResponse {
  success: boolean;
  question?: MCQQuestionData;
  metadata?: {
    topic: string;
    difficulty: string;
    type: string;
    source: string;
  };
  error?: string;
}

export interface MCQBatchGenerationResponse {
  success: boolean;
  generated_count?: number;
  failed_count?: number;
  questions?: MCQQuestionData[];
  metadata?: {
    topics: string[];
    difficulty: string;
    type: string;
    count_per_topic: number;
  };
  error?: string;
}

export interface LeetCodeTestResponse {
  success: boolean;
  message: string;
  version?: string;
  data?: {
    question_id: string;
    title: string;
    title_slug: string;
    difficulty: string;
    topics: string[];
    description: string;
    description_preview: string;
    description_length: number;
    has_content: boolean;
    test_cases: string;
    sample_test_case: string;
    code_snippets: string[];
    url: string;
  };
  error?: string;
}

export interface LeetCodeScrapeResponse {
  success: boolean;
  message: string;
  problem?: {
    title: string;
    description: string;
    problemStatement: string;
    difficulty: string;
    skillTags: string[];
    type: string;
    canonicalSolution: string;
    testCases: any;
    metadata: {
      sourceUrl: string;
      platform: string;
      leetcodeId: string;
      titleSlug: string;
    };
  };
  metadata?: {
    url: string;
    title_slug: string;
    scraped_at: string;
  };
  error?: string;
}

export interface LeetCodeBatchScrapeRequest {
  urls: string[];
}

export interface LeetCodeBatchScrapeResponse {
  success: boolean;
  message: string;
  results: {
    total: number;
    successful: number;
    failed: number;
    saved: number;
  };
  questions?: any[];
  errors?: Array<{
    url: string;
    error: string;
  }>;
}

// Variaion engine types
export interface VariationGenerationResponse {
  success: boolean;
  message: string;
  variations_generated: number;
  base_question_id: string;
  difficulty_distribution: Record<string, number>;
  sample_variations: VariationQuestionData[];
  metadata: {
    variation_engine_version: string;
    generated_at: string;
    question_type: string;
  };
  error?: string;
}
export interface VariationGenerationRequest {
  base_question_id: string;
  variation_count?: number;
  preserve_difficulty?: boolean;
}
export interface VariabilityAnalysisResponse {
  success: boolean;
  variability_analysis: {
    question_type: string;
    variability_score: number;
    max_recommended_variations: number;
    unique_titles_generated: number;
    difficulty_variations: number;
    parameter_variations: number;
    suitability_for_anti_cheat: 'high' | 'medium' | 'low';
  };
  sample_variations: VariationQuestionData[];
  error?: string;
}

// ========== DIAGRAM GENERATION TYPES (Python AI service) ==========
export interface DiagramGenerationResponse {
  success: boolean;
  error?: string;
  question?: {
    title: string;
    explanation: string;
    problemStatement: string;
    difficulty: string;
    skillTags: string[];
    canonicalSolution: string;
    testCases: any;
  };
  diagram?: {
    needed?: boolean;
    type?: string;
    code?: string;
    imageUrl?: string;
    confidence?: number;
    reason?: string;
  };
  metadata?: any;
}

export interface DiagramServiceHealthResponse {
  services?: {
    diagram_generation_available?: boolean;
    [key: string]: any;
  };
  [key: string]: any;
}

// ========== PATTERN EXTRACTION / GENERATION TYPES (Python AI service) ==========
export interface PatternExtractionResponse {
  success: boolean;
  error?: string;
  patterns?: any[];
  total_urls?: number;
  successful_extractions?: number;
  failed_extractions?: number;
  [key: string]: any;
}

export interface PatternQuestionGenResponse {
  success: boolean;
  error?: string;
  question?: {
    title?: string;
    description?: string;
    problem_statement?: string;
    solution?: string;
    test_cases?: any;
    [key: string]: any;
  };
}

export interface VariationQuestionData {
  id: string;
  base_question_id: string;
  variation_number: number;
  title: string;
  problemStatement: string;
  difficulty: 'easy' | 'medium' | 'hard';
  parameters: Record<string, any>;
  testCases: {
    examples: Array<{ input: string; expected_output: string; description?: string }>;
    inputs: string[];
    outputs: string[];
  };
  skillTags: string[];
  type: 'coding' | 'mcq';
  is_variation: boolean;
  parent_version: string;
  canonicalSolution: string;
  explanation: string;
  status: 'pending_review' | 'approved' | 'rejected';
  aiGenerated: boolean;
  source: string;
  metadata: {
    generated_by: string;
    question_type: string;
    variation_engine_version: string;
    generated_at: string;
  };
  

}