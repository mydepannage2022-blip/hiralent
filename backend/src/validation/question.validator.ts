import { z } from 'zod';

// Schema pour un test case
const testCaseSchema = z.object({
  input: z.string().min(1, "Input cannot be empty"),
  output: z.string().min(1, "Output cannot be empty")
});

// Schema pour créer une question
export const createQuestionSchema = z.object({
  title: z.string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title cannot exceed 200 characters"),

  description: z.string()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description cannot exceed 1000 characters"),

  problemStatement: z.string()
    .min(20, "Problem statement must be at least 20 characters"),

  difficulty: z.enum(["easy", "medium", "hard"], {
    errorMap: () => ({ message: "Difficulty must be easy, medium, or hard" })
  }),

  skillTags: z.array(z.string().min(2))
    .min(1, "At least one skill tag is required")
    .max(10, "Maximum 10 skill tags allowed"),

  type: z.string()
    .default("coding"),

  canonicalSolution: z.string()
    .min(10, "Solution must be at least 10 characters"),

  testCases: z.array(testCaseSchema)
    .min(1, "At least one test case is required")
    .max(20, "Maximum 20 test cases allowed")
});

// Schema pour mettre à jour une question
export const updateQuestionSchema = createQuestionSchema.partial();

// Schema pour les filtres de recherche
export const questionFiltersSchema = z.object({
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  status: z.string().optional(),
  search: z.string().optional()
});

// ========================================
//  NOUVEAUX SCHEMAS À AJOUTER
// ========================================

// Schema pour générer une question avec AI
export const generateQuestionSchema = z.object({
  topic: z.string()
    .min(2, "Topic must be at least 2 characters")
    .max(100, "Topic cannot exceed 100 characters"),

  difficulty: z.enum(["easy", "medium", "hard"])
    .default("medium")
});

// Schema pour les opérations en masse (bulk)
export const bulkOperationSchema = z.object({
  ids: z.array(z.string())
    .min(1, "At least one ID is required")
    .max(50, "Maximum 50 IDs allowed")
});

// Schema pour valider l'ID dans les params
export const questionIdParamSchema = z.object({
  id: z.string().min(1, "Question ID is required")
});

// Type inference automatique
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type GenerateQuestionInput = z.infer<typeof generateQuestionSchema>;
export type QuestionFilters = z.infer<typeof questionFiltersSchema>;
