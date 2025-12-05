import prisma from "../../lib/prisma";
import {
  AssessmentStatus,
  AssessmentType,
  DifficultyLevel,
} from "@prisma/client";
import { MockAssessmentResultPayload } from "../../types/mockAssessmentResult.types";

export async function saveMockAssessmentResult(
  payload: MockAssessmentResultPayload
) {
  const {
    employerAssessmentId,
    candidateId,
    jobId,
    overallScore,
    skillLevel,
    categoryScores,
    totalQuestions = 10,
    correctAnswers = 8,
    incorrectAnswers = 2,
    totalTimeSeconds = 600,
  } = payload;

  // 1) Create SkillAssessment row
  const skillAssessment = await prisma.skillAssessment.create({
    data: {
      candidate_id: candidateId,
      job_id: jobId ?? null,
      provider: "hiralent",
      status: AssessmentStatus.COMPLETED,
      completed_at: new Date(),

      assessment_type: AssessmentType.QUICK_CHECK,
      skill_category: "GENERAL",              // can adjust later
      difficulty: DifficultyLevel.INTERMEDIATE,
      total_questions: totalQuestions,
      time_limit: 30,
      current_question: totalQuestions,
      questions: {},
      answers: {},

      overall_score: overallScore,
      skill_level_result: skillLevel,
      strengths: [],
      weaknesses: [],
      recommendations: [],
      ai_analysis: {},

      employer_assessment_id: employerAssessmentId,
    },
  });

  // 2) Create AssessmentSummary row
  await prisma.assessmentSummary.create({
    data: {
      assessment_id: skillAssessment.assessment_id,
      overall_score: overallScore,
      skill_level: skillLevel,
      pass_status: overallScore >= 70 ? "passed" : "failed",

      correct_answers: correctAnswers,
      incorrect_answers: incorrectAnswers,
      partial_answers: 0,
      total_questions: totalQuestions,
      accuracy_rate: (correctAnswers / Math.max(totalQuestions, 1)) * 100,

      total_time_spent: totalTimeSeconds,
      avg_time_per_question: totalTimeSeconds / Math.max(totalQuestions, 1),

      category_scores: categoryScores,
      difficulty_scores: {},

      strengths: [],
      weaknesses: [],
      recommendations: [],
      next_steps: [],
      ai_confidence: 0.9,
      achievements: [],
      badges_earned: [],
    },
  });

  return skillAssessment;
}
