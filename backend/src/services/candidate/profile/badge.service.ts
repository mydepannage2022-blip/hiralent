// services/candidate/profile/badge.service.ts

import { PrismaClient } from '@prisma/client';
import { BadgeEvaluation, BadgeWithProgress, ServiceResponse } from '../../../types/profile.types';

const prisma = new PrismaClient();

function num(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export class BadgeService {
  /**
   * Evaluate badge eligibility based on Badge.criteria Json (BadgeCriteria in your types)
   * Then award/revoke in BadgeAward.
   */
  async evaluateBadges(candidateId: string): Promise<ServiceResponse<{ evaluations: BadgeEvaluation[]; badges: BadgeWithProgress[] }>> {
    try {
      const [badges, score, completenessRow, verifiedSkillsCount, certCount, awards] = await Promise.all([
        prisma.badge.findMany({ where: { is_active: true } }),
        prisma.candidateScore.findUnique({ where: { candidate_id: candidateId } }),
        prisma.profileCompleteness.findUnique({ where: { candidate_id: candidateId } }),
        prisma.candidateSkill.count({ where: { candidate_id: candidateId, is_verified: true } }),
        prisma.certification.count({ where: { candidate_id: candidateId } }),
        prisma.badgeAward.findMany({ where: { candidate_id: candidateId } }),
      ]);

      const existingAwardMap = new Map<string, { award_id: string; is_active: boolean; revoked_at: Date | null; awarded_at: Date }>();
      for (const a of awards) {
        existingAwardMap.set(a.badge_id, {
          award_id: a.award_id,
          is_active: a.is_active,
          revoked_at: a.revoked_at,
          awarded_at: a.awarded_at,
        });
      }

      const candidateTotalScore = num(score?.total_score, 0);
      const completeness = num(completenessRow?.overall_score, 0);

      const evaluations: BadgeEvaluation[] = [];

      for (const b of badges) {
        const criteria: any = b.criteria || {};

        const minCompleteness = criteria.completeness != null ? num(criteria.completeness) : null;
        const minValidatedSkills = criteria.validated_skills_min != null ? num(criteria.validated_skills_min) : null;
        const minScore = criteria.score_min != null ? num(criteria.score_min) : null;
        const minCerts = criteria.certifications_min != null ? num(criteria.certifications_min) : null;

        const should_have =
          (minCompleteness == null || completeness >= minCompleteness) &&
          (minValidatedSkills == null || verifiedSkillsCount >= minValidatedSkills) &&
          (minScore == null || candidateTotalScore >= minScore) &&
          (minCerts == null || certCount >= minCerts);

        const existing = existingAwardMap.get(b.badge_id);
        const currently_has = !!existing && existing.is_active;

        let action: BadgeEvaluation['action'] = 'none';

        if (should_have && !currently_has) {
          // award
          await prisma.badgeAward.upsert({
            where: { candidate_id_badge_id: { candidate_id: candidateId, badge_id: b.badge_id } },
            update: { is_active: true, revoked_at: null },
            create: { candidate_id: candidateId, badge_id: b.badge_id, is_active: true },
          });
          action = 'award';
        } else if (!should_have && currently_has) {
          // revoke
          await prisma.badgeAward.update({
            where: { award_id: existing!.award_id },
            data: { is_active: false, revoked_at: new Date() },
          });
          action = 'revoke';
        }

        evaluations.push({
          badge_id: b.badge_id,
          should_have,
          currently_has: should_have ? true : currently_has && action !== 'revoke',
          action,
        });
      }

      // Return badge list with progress
      const finalAwards = await prisma.badgeAward.findMany({
        where: { candidate_id: candidateId, is_active: true },
      });
      const earnedSet = new Set(finalAwards.map((a) => a.badge_id));

      const badgesWithProgress: BadgeWithProgress[] = badges.map((b) => {
        const criteria: any = b.criteria || {};
        const required = criteria.validated_skills_min ?? criteria.certifications_min ?? criteria.completeness ?? criteria.score_min ?? 0;
        let current = 0;

        if (criteria.validated_skills_min != null) current = verifiedSkillsCount;
        else if (criteria.certifications_min != null) current = certCount;
        else if (criteria.completeness != null) current = completeness;
        else if (criteria.score_min != null) current = candidateTotalScore;

        const reqNum = num(required, 0);
        const curNum = num(current, 0);
        const percentage = reqNum > 0 ? Math.min(100, Math.round((curNum / reqNum) * 100)) : earnedSet.has(b.badge_id) ? 100 : 0;

        const award = finalAwards.find((a) => a.badge_id === b.badge_id);

        return {
          badge_id: b.badge_id,
          name: b.name,
          description: b.description,
          icon: b.icon,
          category: b.category,
          is_earned: earnedSet.has(b.badge_id),
          awarded_at: award?.awarded_at,
          progress: reqNum > 0 ? { current: curNum, required: reqNum, percentage } : undefined,
        };
      });

      return {
        success: true,
        data: { evaluations, badges: badgesWithProgress },
        message: 'Badges evaluated successfully',
      };
    } catch (error: any) {
      console.error('BadgeService.evaluateBadges error:', error);
      return { success: false, message: 'Failed to evaluate badges', error: error.message };
    }
  }

  async listBadges(candidateId: string): Promise<ServiceResponse<{ badges: BadgeWithProgress[] }>> {
    try {
      const [badges, awards] = await Promise.all([
        prisma.badge.findMany({ where: { is_active: true } }),
        prisma.badgeAward.findMany({ where: { candidate_id: candidateId, is_active: true } }),
      ]);

      const earned = new Map(awards.map((a) => [a.badge_id, a.awarded_at]));

      const result: BadgeWithProgress[] = badges.map((b) => ({
        badge_id: b.badge_id,
        name: b.name,
        description: b.description,
        icon: b.icon,
        category: b.category,
        is_earned: earned.has(b.badge_id),
        awarded_at: earned.get(b.badge_id),
      }));

      return { success: true, data: { badges: result } };
    } catch (error: any) {
      console.error('BadgeService.listBadges error:', error);
      return { success: false, message: 'Failed to list badges', error: error.message };
    }
  }
}

export const badgeService = new BadgeService();