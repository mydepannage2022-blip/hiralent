// src/services/skillRadarService.ts
import prisma from "../../lib/prisma";
import {
  AssessmentSkillRadarResponse,
  CandidateSkillRadar,
  SkillRadarPoint,
} from "../../types/skillRadar.types";
import { AssessmentStatus } from "@prisma/client";

/**
 * Build radar points from AssessmentSummary:
 * - Prefer category_scores JSON if present
 * - Fallback to difficulty_scores or a flat overall score
 */
function buildRadarFromSummary(summary: any): SkillRadarPoint[] {
  if (!summary) return [];

  const radar: SkillRadarPoint[] = [];

  // 1) Category-based radar: category_scores: { "React": 85, "Hooks": 70 }
  if (summary.category_scores) {
    const categoryScores = summary.category_scores as Record<string, number>;
    for (const [label, score] of Object.entries(categoryScores)) {
      radar.push({
        label,
        score: Math.max(0, Math.min(100, Number(score) || 0)),
      });
    }
  }

  // 2) Difficulty-based radar (BEGINNER / INTERMEDIATE / ADVANCED / EXPERT)
  if (radar.length === 0 && summary.difficulty_scores) {
    const diffScores = summary.difficulty_scores as Record<
      string,
      { correct: number; total: number }
    >;

    for (const [level, stats] of Object.entries(diffScores)) {
      if (!stats.total) continue;
      const pct = (stats.correct / stats.total) * 100;
      radar.push({
        label: level,
        score: Math.max(0, Math.min(100, pct)),
      });
    }
  }

  // 3) Fallback: just use overall_score as one dimension
  if (radar.length === 0 && typeof summary.overall_score === "number") {
    radar.push({
      label: "Overall",
      score: Math.max(0, Math.min(100, summary.overall_score)),
    });
  }

  return radar;
}

/**
 * Get Skill Radar for all candidates that took a given EmployerAssessment
 */
export async function getAssessmentSkillRadar(
  employerAssessmentId: string,
  companyId: string
): Promise<AssessmentSkillRadarResponse> {
  // 1) Verify this assessment belongs to the company
  const employerAssessment = await prisma.employerAssessment.findFirst({
    where: {
      assessment_id: employerAssessmentId,
      company_id: companyId,
    },
    include: {
      job: true,
    },
  });

  if (!employerAssessment) {
    throw new Error("Assessment not found or you do not have access to it.");
  }

  // 2) Fetch skill assessments that reference this EmployerAssessment
  const skillAssessments = await prisma.skillAssessment.findMany({
    where: {
      employer_assessment_id: employerAssessmentId,
      status: AssessmentStatus.COMPLETED, // only completed assessments
    },
    include: {
      candidate: true,
      summary: true, // AssessmentSummary (via relation)
    },
  });

  const candidates: CandidateSkillRadar[] = skillAssessments.map((sa) => {
    const summary = sa.summary as any | null;
    const radar = buildRadarFromSummary(summary || {});

    return {
      candidateId: sa.candidate_id,
      candidateName: sa.candidate.full_name,
      jobId: sa.job_id,
      employerAssessmentId: sa.employer_assessment_id ?? null,
      overallScore: sa.overall_score ?? null,
      skillLevel: summary?.skill_level ?? null,
      radar,
    };
  });

  return {
    assessmentId: employerAssessment.assessment_id,
    jobId: employerAssessment.job_id,
    companyId: employerAssessment.company_id,
    title: employerAssessment.title,
    candidates,
  };
}
