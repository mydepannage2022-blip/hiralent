// services/candidate/profile/badge.service.ts

import prisma from '../../../lib/prisma';
import {
  BadgeEvaluation,
  BadgeWithProgress,
  ServiceResponse,
} from "../../../types/profile.types";
import { completenessService } from "./completeness.service";


function num(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

type Criteria = {
  completeness?: number; // e.g. 100
  validated_skills_min?: number; // e.g. 5
  score_min?: number; // e.g. 90
  certifications_min?: number; // e.g. 3
};

function computeProgressFromCriteria(params: {
  badgeId: string;
  criteria: Criteria;
  completeness: number;
  verifiedSkillsCount: number;
  certCount: number;
  candidateTotalScore: number;
  isEarned: boolean;
}) {
  const {
    criteria,
    completeness,
    verifiedSkillsCount,
    certCount,
    candidateTotalScore,
    isEarned,
  } = params;

  // If a badge has multiple criteria, we’ll show progress for the “primary” one.
  // Priority: completeness > validated skills > score > certifications
  // (Feel free to change order if you want.)
  const required =
    criteria.completeness ??
    criteria.validated_skills_min ??
    criteria.score_min ??
    criteria.certifications_min ??
    0;

  let current = 0;

  if (criteria.completeness != null) current = completeness;
  else if (criteria.validated_skills_min != null) current = verifiedSkillsCount;
  else if (criteria.score_min != null) current = candidateTotalScore;
  else if (criteria.certifications_min != null) current = certCount;

  const reqNum = num(required, 0);
  const curNum = num(current, 0);

  const percentage =
    reqNum > 0
      ? Math.min(100, Math.round((curNum / reqNum) * 100))
      : isEarned
      ? 100
      : 0;

  return reqNum > 0 ? { current: curNum, required: reqNum, percentage } : undefined;
}

export class BadgeService {
  /**
   * Evaluate badge eligibility based on Badge.criteria Json (BadgeCriteria in your types)
   * Then award/revoke in BadgeAward.
   */
  async evaluateBadges(
    candidateId: string
  ): Promise<
    ServiceResponse<{ evaluations: BadgeEvaluation[]; badges: BadgeWithProgress[] }>
  > {
    try {
      // Ensure completeness exists (so Profile Master doesn't stay stuck at 0)
      // Always recompute so badges never use stale/overwritten scores
      await completenessService.calculateCompleteness(candidateId);

      const completenessRow = await prisma.profileCompleteness.findUnique({
        where: { candidate_id: candidateId },
      });


      const [
        badges,
        score,
        verifiedSkillsCount,
        certCount,
        awardsAll,
      ] = await Promise.all([
        prisma.badge.findMany({ where: { is_active: true } }),
        prisma.candidateScore.findUnique({ where: { candidate_id: candidateId } }),
        prisma.candidateSkill.count({
          where: { candidate_id: candidateId, is_verified: true },
        }),
        prisma.certification.count({ where: { candidate_id: candidateId } }),
        prisma.badgeAward.findMany({ where: { candidate_id: candidateId } }),
      ]);

      const existingAwardMap = new Map<
        string,
        { award_id: string; is_active: boolean; revoked_at: Date | null; awarded_at: Date }
      >();

      for (const a of awardsAll) {
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

      // NOTE: if you expect MANY badges, you can batch award/revoke in a transaction.
      // For now, we keep it straightforward.
      for (const b of badges) {
        const criteria: Criteria = (b.criteria as any) || {};

        const minCompleteness =
          criteria.completeness != null ? num(criteria.completeness) : null;
        const minValidatedSkills =
          criteria.validated_skills_min != null ? num(criteria.validated_skills_min) : null;
        const minScore = criteria.score_min != null ? num(criteria.score_min) : null;
        const minCerts =
          criteria.certifications_min != null ? num(criteria.certifications_min) : null;

        const should_have =
          (minCompleteness == null || completeness >= minCompleteness) &&
          (minValidatedSkills == null || verifiedSkillsCount >= minValidatedSkills) &&
          (minScore == null || candidateTotalScore >= minScore) &&
          (minCerts == null || certCount >= minCerts);

        const existing = existingAwardMap.get(b.badge_id);
        const currently_has = !!existing && existing.is_active;

        let action: BadgeEvaluation["action"] = "none";

        // ✅ Fix: award ONLY if user doesn't already have it
        if (should_have && !currently_has) {
          await prisma.badgeAward.upsert({
            where: {
              candidate_id_badge_id: {
                candidate_id: candidateId,
                badge_id: b.badge_id,
              },
            },
            update: { is_active: true, revoked_at: null },
            create: { candidate_id: candidateId, badge_id: b.badge_id, is_active: true },
          });

          action = "award";

          // keep local map consistent for later logic if needed
          existingAwardMap.set(b.badge_id, {
            award_id: existing?.award_id || "upserted",
            is_active: true,
            revoked_at: null,
            awarded_at: existing?.awarded_at || new Date(),
          });
        } else if (!should_have && currently_has) {
          await prisma.badgeAward.update({
            where: { award_id: existing!.award_id },
            data: { is_active: false, revoked_at: new Date() },
          });

          action = "revoke";

          existingAwardMap.set(b.badge_id, {
            award_id: existing!.award_id,
            is_active: false,
            revoked_at: new Date(),
            awarded_at: existing!.awarded_at,
          });
        }

        // ✅ Fix: currently_has should represent the FINAL state after action
        const final_has =
          action === "award" ? true : action === "revoke" ? false : currently_has;

        evaluations.push({
          badge_id: b.badge_id,
          should_have,
          currently_has: final_has,
          action,
        });
      }

      // Active awards after evaluation
      const finalAwards = await prisma.badgeAward.findMany({
        where: { candidate_id: candidateId, is_active: true },
      });

      const awardMap = new Map(finalAwards.map((a) => [a.badge_id, a.awarded_at]));
      const earnedSet = new Set(finalAwards.map((a) => a.badge_id));

      const badgesWithProgress: BadgeWithProgress[] = badges.map((b) => {
        const criteria: Criteria = (b.criteria as any) || {};
        const isEarned = earnedSet.has(b.badge_id);

        const progress = computeProgressFromCriteria({
          badgeId: b.badge_id,
          criteria,
          completeness,
          verifiedSkillsCount,
          certCount,
          candidateTotalScore,
          isEarned,
        });

        return {
          badge_id: b.badge_id,
          name: b.name,
          description: b.description,
          icon: b.icon,
          category: b.category,
          is_earned: isEarned,
          awarded_at: awardMap.get(b.badge_id),
          progress,
        };
      });

      return {
        success: true,
        data: { evaluations, badges: badgesWithProgress },
        message: "Badges evaluated successfully",
      };
    } catch (error: any) {
      console.error("BadgeService.evaluateBadges error:", error);
      return {
        success: false,
        message: "Failed to evaluate badges",
        error: error.message,
      };
    }
  }

  /**
   * List badges + earned status + progress (so GET /profile/badges shows correct progress)
   */
  async listBadges(
    candidateId: string
  ): Promise<ServiceResponse<{ badges: BadgeWithProgress[] }>> {
    try {
      // Ensure completeness exists (same reason as evaluate)
      let completenessRow = await prisma.profileCompleteness.findUnique({
        where: { candidate_id: candidateId },
      });

      if (!completenessRow) {
        await completenessService.calculateCompleteness(candidateId);
        completenessRow = await prisma.profileCompleteness.findUnique({
          where: { candidate_id: candidateId },
        });
      }

      const [
        badges,
        awardsActive,
        score,
        verifiedSkillsCount,
        certCount,
      ] = await Promise.all([
        prisma.badge.findMany({ where: { is_active: true } }),
        prisma.badgeAward.findMany({
          where: { candidate_id: candidateId, is_active: true },
        }),
        prisma.candidateScore.findUnique({ where: { candidate_id: candidateId } }),
        prisma.candidateSkill.count({
          where: { candidate_id: candidateId, is_verified: true },
        }),
        prisma.certification.count({ where: { candidate_id: candidateId } }),
      ]);

      const candidateTotalScore = num(score?.total_score, 0);
      const completeness = num(completenessRow?.overall_score, 0);

      const earnedAtMap = new Map(awardsActive.map((a) => [a.badge_id, a.awarded_at]));
      const earnedSet = new Set(awardsActive.map((a) => a.badge_id));

      const result: BadgeWithProgress[] = badges.map((b) => {
        const criteria: Criteria = (b.criteria as any) || {};
        const isEarned = earnedSet.has(b.badge_id);

        const progress = computeProgressFromCriteria({
          badgeId: b.badge_id,
          criteria,
          completeness,
          verifiedSkillsCount,
          certCount,
          candidateTotalScore,
          isEarned,
        });

        return {
          badge_id: b.badge_id,
          name: b.name,
          description: b.description,
          icon: b.icon,
          category: b.category,
          is_earned: isEarned,
          awarded_at: earnedAtMap.get(b.badge_id),
          progress,
        };
      });

      return { success: true, data: { badges: result } };
    } catch (error: any) {
      console.error("BadgeService.listBadges error:", error);
      return {
        success: false,
        message: "Failed to list badges",
        error: error.message,
      };
    }
  }
}

export const badgeService = new BadgeService();
