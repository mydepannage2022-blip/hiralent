import { z } from 'zod';
import { AssessmentType, DifficultyLevel } from '../types/assessment.types';

// Schema for starting an assessment
export const startAssessmentSchema = z.object({
  skillCategory: z.string().min(2),
  assessmentType: z.nativeEnum(AssessmentType),
  difficulty: z.nativeEnum(DifficultyLevel),
});

// Schema for submitting an answer
export const submitAnswerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.string().min(1),
  timeTaken: z.number().int().min(1),
});
