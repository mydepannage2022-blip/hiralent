// services/candidate/profile/scoring.service.ts

import { PrismaClient } from '@prisma/client';
import { ScoreBreakdown, ScoreHistoryItem, ServiceResponse } from '../../../types/profile.types';
import { computeCandidateScore } from '../../../utils/scoring-algorithms';

const prisma = new PrismaClient();

function safeParseArray(value: unknown): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export class ScoringService {
  /**
   * Calculates candidate score and persists to:
   * - CandidateScore (upsert)
   * - ScoreHistory (append)
   */
  async calculateScore(candidateId: string): Promise<ServiceResponse<{ breakdown: ScoreBreakdown }>> {
    try {
      const user = await prisma.user.findUnique({
        where: { user_id: candidateId },
        include: {
          candidateProfile: true,
          candidateSkills: true,
          profileCompleteness: true, // note: in schema it's ProfileCompleteness[] relation
        },
      });

      if (!user) {
        return { success: false, message: 'Candidate not found' };
      }

      const profile = user.candidateProfile;

      const skills_count = user.candidateSkills.length;
      const validated_skills_count = user.candidateSkills.filter((s) => s.is_verified).length;

      // Experience years heuristic: sum "years_experience" if stored, else try parse profile.experience items "years"
      let experience_years = 0;
      const parsedExp = safeParseArray(profile?.experience);
      if (parsedExp.length > 0) {
        for (const e of parsedExp) {
          const y = Number((e?.years ?? e?.years_experience) || 0);
          if (!Number.isNaN(y)) experience_years += y;
        }
      }

      // Education level heuristic: take first education degree
      const parsedEdu = safeParseArray(profile?.education);
      let education_level = '';
      if (parsedEdu.length > 0) {
        education_level = String(parsedEdu[0]?.degree || parsedEdu[0]?.level || '');
      }

      // ProfileCompleteness is a relation array but model itself has unique candidate_id, so usually one row.
      const completenessRow = Array.isArray(user.profileCompleteness) ? user.profileCompleteness[0] : undefined;
      const completeness_score = completenessRow?.overall_score ? Number(completenessRow.overall_score) : 0;

      const breakdown = computeCandidateScore({
        candidate_id: candidateId,
        skills_count,
        validated_skills_count,
        experience_years,
        experience_count: parsedExp.length,
        education_level,
        completeness_score,
      });

      // Upsert CandidateScore
      const scoreRow = await prisma.candidateScore.upsert({
        where: { candidate_id: candidateId },
        update: {
          total_score: breakdown.total_score,
          skills_score: breakdown.skills_score,
          experience_score: breakdown.experience_score,
          education_score: breakdown.education_score,
          completeness_score: breakdown.completeness_score,
          calculation_method: 'v1',
        },
        create: {
          candidate_id: candidateId,
          total_score: breakdown.total_score,
          skills_score: breakdown.skills_score,
          experience_score: breakdown.experience_score,
          education_score: breakdown.education_score,
          completeness_score: breakdown.completeness_score,
          calculation_method: 'v1',
        },
      });

      // Append history
      await prisma.scoreHistory.create({
        data: {
          score_id: scoreRow.score_id,
          score_value: breakdown.total_score,
          trigger_event: 'score_recalculated',
        },
      });

      return {
        success: true,
        data: { breakdown },
        message: 'Score calculated successfully',
      };
    } catch (error: any) {
      console.error('ScoringService.calculateScore error:', error);
      return { success: false, message: 'Failed to calculate score', error: error.message };
    }
  }

  async getCurrentScore(candidateId: string): Promise<ServiceResponse<{ breakdown: ScoreBreakdown }>> {
    try {
      const score = await prisma.candidateScore.findUnique({
        where: { candidate_id: candidateId },
      });

      if (!score) {
        return { success: false, message: 'No score found for candidate. Calculate it first.' };
      }

      const breakdown: ScoreBreakdown = {
        total_score: Number(score.total_score),
        skills_score: Number(score.skills_score),
        experience_score: Number(score.experience_score),
        education_score: Number(score.education_score),
        completeness_score: Number(score.completeness_score),
      };

      return { success: true, data: { breakdown } };
    } catch (error: any) {
      console.error('ScoringService.getCurrentScore error:', error);
      return { success: false, message: 'Failed to get score', error: error.message };
    }
  }

  async getScoreHistory(candidateId: string, limit = 20): Promise<ServiceResponse<{ history: ScoreHistoryItem[] }>> {
    try {
      const score = await prisma.candidateScore.findUnique({
        where: { candidate_id: candidateId },
      });

      if (!score) return { success: false, message: 'No score found for candidate' };

      const historyRows = await prisma.scoreHistory.findMany({
        where: { score_id: score.score_id },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });

      const history: ScoreHistoryItem[] = historyRows.map((h) => ({
        history_id: h.history_id,
        score_value: Number(h.score_value),
        trigger_event: h.trigger_event,
        timestamp: h.timestamp,
      }));

      return { success: true, data: { history } };
    } catch (error: any) {
      console.error('ScoringService.getScoreHistory error:', error);
      return { success: false, message: 'Failed to get score history', error: error.message };
    }
  }
}

export const scoringService = new ScoringService();