// frontend/src/types/question.types.ts

export interface MCQOptions {
  A: string;
  B: string;
  C: string;
  D: string;
}

export interface Question {
  id: string;
  title: string;
  description: string;
  problemStatement?: string;
  difficulty: 'easy' | 'medium' | 'hard' | string;
  skillTags: string[];
  type?: 'coding' | 'mcq' | string;
  canonicalSolution?: string;
  testCases?: Array<{ input: string; output: string }> | any;
  options?: MCQOptions;
  correctAnswer?: string;
  explanation?: string;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | string;
  createdAt: string;
  createdBy?: string;
  aiGenerated?: boolean;
  source?: string;
  views?: number;
  submissions?: number;
  successRate?: number;
  hasDiagram?: boolean;
  diagramType?: string | null;          // "uml" | "mermaid" | ...
  diagramCode?: string | null;          // text source (e.g. mermaid)
  diagramImageUrl?: string | null;      // URL to image
  diagramMetadata?: any;
}